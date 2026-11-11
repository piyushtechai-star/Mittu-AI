// Paywall (guide 04): Razorpay Subscription with UPI Autopay. Prices and the daily reading limit come from /config;
// the full recurring price is shown before paying. Access comes only from the webhook (we poll /me after checkout).
// No cancel button anywhere in the app: cancelling is explained on the payment-cancellation policy page.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { completeTestPayment, createSubscription, getConfig, getMe, type Config } from '@/api/mittu';
import { Mittu } from '@/components/Mittu';
import { Button, ErrorView, Loading, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { rupees } from '@/lib/format';
import { track } from '@/lib/integrations';
import { openSubscriptionCheckout } from '@/lib/razorpay';
import { useLoad } from '@/lib/useLoad';
import { colors, radius, space, type } from '@/theme';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function priceLine(c: Config) {
  return `${rupees(c.plan.trialPricePaise)} for ${c.plan.trialDays} days, then ${rupees(c.plan.pricePaise)}/month`;
}

export default function Paywall() {
  const { setMe, signOut } = useAuth();
  const { data: config, error: loadError, reload } = useLoad(getConfig, []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    track('paywall_view');
  }, []);

  async function waitForAccess() {
    setNote('Payment confirm ho raha hai…');
    for (let i = 0; i < 10; i++) {
      const me = await getMe().catch(() => null);
      if (me && me.next !== 'paywall') {
        await setMe(me);
        return;
      }
      await sleep(3000);
    }
    setNote('Payment abhi confirm nahi hua. Thodi der baad "Already paid?" dabaiye.');
  }

  async function start() {
    if (!config) return;
    setBusy(true);
    setNote(null);
    try {
      track('paywall_start');
      if (config.billingMode === 'fake') {
        await setMe(await completeTestPayment());
        return;
      }
      const sub = await createSubscription();
      await openSubscriptionCheckout({ ...sub, description: priceLine(config) });
      await waitForAccess();
    } catch (e) {
      // Closing the checkout also lands here; the webhook may still have arrived, so check once.
      const me = await getMe().catch(() => null);
      if (me && me.next !== 'paywall') await setMe(me);
      else setNote((e as Error)?.message && !/cancel/i.test((e as Error).message) ? (e as Error).message : null);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <Screen><ErrorView onRetry={reload} /></Screen>;
  if (!config) return <Screen><Loading /></Screen>;

  const perks: [IconName, string][] = [
    ['sparkles-outline', `Roz ${config.readingsPerDay} tarot readings, aapke sawaal par`],
    ['volume-high-outline', 'Mittu ki awaaz mein poori reading'],
    ['albums-outline', 'Saare 22 Major Arcana cards, seedhe aur ulte'],
    ['time-outline', 'Purani readings ki history'],
  ];

  return (
    <Screen footer={
      <View style={{ gap: space.sm }}>
        <Button title={`Start for ${rupees(config.plan.trialPricePaise)}`} onPress={start} loading={busy} />
        <Text style={[type.footnote, { textAlign: 'center' }]}>{priceLine(config)} via UPI Autopay. Prices include GST.</Text>
      </View>
    }>
      <View style={{ alignItems: 'center', marginTop: space.lg }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Mittu size={104} />
        </View>
        <Text style={[type.largeTitle, { textAlign: 'center', marginTop: space.lg }]}>Mittu se apna bhavishya suniye</Text>
        <Text style={[type.callout, { textAlign: 'center', color: colors.textSecondary, marginTop: space.sm }]}>
          Sawaal poochiye, Mittu card nikaalega aur reading sunayega.
        </Text>
      </View>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {perks.map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name={icon} size={20} color={colors.accent} />
            <Text style={[type.callout, { flex: 1 }]}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft }}>
        <Text style={[type.footnote, { color: colors.accent, fontWeight: '700', letterSpacing: 0.6 }]}>{config.plan.trialDays}-DAY TRIAL · MONTHLY PLAN</Text>
        <Text style={[type.title, { marginTop: 4 }]}>{rupees(config.plan.trialPricePaise)} for {config.plan.trialDays} days</Text>
        <Text style={type.subhead}>Then {rupees(config.plan.pricePaise)} every month. Renews automatically until cancelled.</Text>
      </View>

      {note ? <Text style={[type.subhead, { textAlign: 'center', marginTop: space.md }]}>{note}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.lg, marginTop: space.lg }}>
        <Text style={[type.footnote, { color: colors.accent }]} onPress={() => { setBusy(true); void waitForAccess().finally(() => setBusy(false)); }}>Already paid?</Text>
        <Text style={[type.footnote, { color: colors.accent }]} onPress={() => Linking.openURL(config.legal.terms)}>Terms</Text>
        <Text style={[type.footnote, { color: colors.accent }]} onPress={() => Linking.openURL(config.legal['payment-cancellation'])}>Payment & cancellation</Text>
        <Text style={[type.footnote, { color: colors.accent }]} onPress={() => void signOut()}>Sign out</Text>
      </View>
    </Screen>
  );
}
