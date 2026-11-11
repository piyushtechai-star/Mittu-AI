import { useState } from 'react';
import { Text } from 'react-native';

import { setName } from '@/api/mittu';
import { Button, Field, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, space, type } from '@/theme';

// Required right after a successful payment (guide 05); can't be skipped. Mittu uses it in readings ("Suno Riya…")
// and it is printed on GST invoices.
export default function NameScreen() {
  const { setMe } = useAuth();
  const [name, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = name.trim().length >= 2;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setMe(await setName(name.trim()));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button title="Aage badhein" onPress={save} loading={busy} disabled={!ok} />}>
      <Title sub="Mittu aapko naam se bulayega. Yahi naam aapke GST invoice par bhi chhapega.">Aapka naam kya hai?</Title>
      <Field value={name} onChangeText={setValue} placeholder="Jaise: Riya Sharma" autoFocus autoCapitalize="words"
        autoComplete="name" textContentType="name" maxLength={50} returnKeyType="done" onSubmitEditing={() => ok && save()} />
      {error ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.sm }]}>{error}</Text> : null}
    </Screen>
  );
}
