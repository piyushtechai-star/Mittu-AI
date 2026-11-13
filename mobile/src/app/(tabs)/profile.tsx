import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { getConfig, type Config } from '@/api/mittu';
import { Button, Group, Row, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { prettyDate } from '@/lib/format';
import { colors, space, type } from '@/theme';

// Guide 09: same sections as Artify's profile + reading history; links to the policies. No delete-account or
// cancel-subscription button: deletion is explained in the privacy policy (the "Delete account" row only opens the
// delete-account policy page, which Play requires to be reachable from the app).
export default function Profile() {
  const { me, signOut } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [now] = useState(Date.now);

  useEffect(() => {
    getConfig().then(setConfig).catch(() => {});
  }, []);

  if (!me) return null;
  const sub = me.subscription;
  const inTrial = !!sub.trialEnd && sub.trialEnd * 1000 > now;
  const planLine = !sub.currentEnd ? 'Active'
    : sub.status === 'cancelled' ? `Cancelled · access until ${prettyDate(sub.currentEnd * 1000)}`
    : inTrial ? `Trial · until ${prettyDate(sub.trialEnd! * 1000)}` : `Monthly · renews ${prettyDate(sub.currentEnd * 1000)}`;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.lg }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[type.largeTitle, { color: colors.accent }]}>{(me.name ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.title}>{me.name}</Text>
          <Text style={type.subhead}>+91 {me.phone}</Text>
        </View>
      </View>

      <Group>
        <Row icon="planet-outline" title="Janam details"
          subtitle={me.birth ? `${me.birth.rashi} rashi (${me.birth.sign}) · ${me.birth.birthDate.split('-').reverse().join('/')}` : 'Add karein'}
          onPress={() => router.push({ pathname: '/birth', params: { edit: '1' } })} />
        <Row icon="time-outline" title="Reading history" onPress={() => router.push('/history')} />
        {config ? <Row icon="help-circle-outline" title="Help" subtitle={config.supportEmail}
          onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} /> : null}
      </Group>
      <Group>
        <Row icon="card-outline" title="Plan" subtitle={planLine} />
        <Row icon="receipt-outline" title="Invoices" onPress={() => router.push('/invoices')} />
      </Group>
      {config ? (
        <Group title="Policies">
          <Row icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => Linking.openURL(config.legal.privacy)} />
          <Row icon="document-text-outline" title="Terms" onPress={() => Linking.openURL(config.legal.terms)} />
          <Row icon="cash-outline" title="Payment & cancellation" onPress={() => Linking.openURL(config.legal['payment-cancellation'])} />
          <Row icon="person-remove-outline" title="Delete account" onPress={() => Linking.openURL(config.legal['delete-account'])} />
        </Group>
      ) : null}
      <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.lg }]}>Mittu AI · HouseofTech · Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
