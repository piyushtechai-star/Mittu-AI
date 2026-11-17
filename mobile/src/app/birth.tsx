// Onboarding step after the name (like Naksh): date of birth (required, 18+), time (or "Samay nahi pata"), city and
// gender (optional). Mittu uses them as a personal touch in readings ("Simha rashi wale..."). Also edits them later
// from Profile > Naam aur janam details (`?edit=1`), where the name can be changed too (the policy pages say both
// can be edited in the profile; the name screen itself is onboarding-only).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { setBirth, setName } from '@/api/mittu';
import { BirthForm, birthToValue, toBirthInput } from '@/components/BirthForm';
import { Mittu } from '@/components/Mittu';
import { Button, Field, Header, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, space, type } from '@/theme';

export default function BirthScreen() {
  const { me, setMe } = useAuth();
  const editing = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const [value, setValue] = useState(() => birthToValue(me?.birth ?? null));
  const [name, setNameValue] = useState(me?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameOk = !editing || name.trim().length >= 2;

  async function save() {
    const v = toBirthInput(value);
    if (!v.ok) return setError(v.error);
    setBusy(true);
    setError(null);
    try {
      // Name first: if it's rejected (letters only), nothing is saved and the user sees why.
      const newName = name.trim().replace(/\s+/g, ' ');
      if (editing && newName !== me?.name) await setMe(await setName(newName));
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
      onPress={save} loading={busy} disabled={value.date.length !== 8 || !nameOk} />}>
      {editing ? <Header title="Naam aur janam details" /> : (
        <View style={{ alignItems: 'center', marginTop: space.sm }}>
          <Mittu size={96} turban />
        </View>
      )}
      <Title sub="Mittu inse aapki rashi dekh kar reading ko aur personal banayega. Sirf janam tithi zaroori hai.">
        {editing ? 'Apna naam aur janam details badlein' : `${first ? `${first}, ` : ''}aapka janam kab hua?`}
      </Title>
      {editing ? (
        <View style={{ marginBottom: space.lg }}>
          <Field label="Naam (Mittu isi naam se bulayega; GST invoice par bhi yahi chhapega)" value={name} onChangeText={(t) => { setNameValue(t); setError(null); }} placeholder="Jaise: Riya Sharma"
            autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={50} returnKeyType="done"
            accessibilityLabel="Naam" />
        </View>
      ) : null}
      <BirthForm value={value} onChange={(v) => { setValue(v); setError(null); }} />
      {error ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.md }]}>{error}</Text> : null}
      <Text style={[type.footnote, { marginTop: space.lg }]}>
        Mittu AI sirf 18 saal ya usse bade logon ke liye hai. Yeh details sirf aapki readings ke liye use hoti hain.
      </Text>
    </Screen>
  );
}
