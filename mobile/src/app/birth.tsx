// Onboarding step after the name (like Naksh): date of birth (required, 18+), time (or "Samay nahi pata"), city and
// gender (optional). Mittu uses them as a personal touch in readings ("Simha rashi wale..."). Also edits them later
// from Profile > Birth details (`?edit=1`).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { setBirth } from '@/api/mittu';
import { BirthForm, birthToValue, toBirthInput } from '@/components/BirthForm';
import { Mittu } from '@/components/Mittu';
import { Button, Header, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, space, type } from '@/theme';

export default function BirthScreen() {
  const { me, setMe } = useAuth();
  const editing = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const [value, setValue] = useState(() => birthToValue(me?.birth ?? null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const v = toBirthInput(value);
    if (!v.ok) return setError(v.error);
    setBusy(true);
    setError(null);
    try {
      const next = await setBirth(v.value);
      await setMe(next);
      // This screen stays reachable after onboarding (for editing), so leave it explicitly.
      if (editing) router.back();
      else router.replace('/home');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const first = me?.name?.split(' ')[0];
  return (
    <Screen footer={<Button title={editing ? 'Save karein' : 'Aage badhein'} iconRight={editing ? undefined : 'arrow-forward'}
      onPress={save} loading={busy} disabled={value.date.length !== 8} />}>
      {editing ? <Header title="Janam details" /> : (
        <View style={{ alignItems: 'center', marginTop: space.sm }}>
          <Mittu size={96} turban />
        </View>
      )}
      <Title sub="Mittu inse aapki rashi dekh kar reading ko aur personal banayega. Sirf janam tithi zaroori hai.">
        {editing ? 'Apni janam details badlein' : `${first ? `${first}, ` : ''}aapka janam kab hua?`}
      </Title>
      <BirthForm value={value} onChange={(v) => { setValue(v); setError(null); }} />
      {error ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
      <Text style={[type.footnote, { marginTop: space.lg }]}>
        Mittu AI sirf 18 saal ya usse bade logon ke liye hai. Yeh details sirf aapki readings ke liye use hoti hain.
      </Text>
    </Screen>
  );
}
