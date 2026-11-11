import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { requestOtp } from '@/api/auth';
import { getConfig, type Config } from '@/api/mittu';
import { Button, Check, Field, Header, Screen, Title } from '@/components/ui';
import { colors, radius, space, type } from '@/theme';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    getConfig().then(setConfig).catch(() => {});
  }, []);

  const valid = /^[6-9]\d{9}$/.test(phone);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(phone);
      router.push({ pathname: '/auth/otp', params: { phone } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button title="Code bhejiye" onPress={send} loading={busy} disabled={!valid || !agree} />}>
      <Header />
      <Title sub="Hum aapke number par 6-digit code bhejenge.">Mobile number</Title>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ height: 52, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.md,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={type.headline}>+91</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Field value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad"
            placeholder="10-digit number" autoComplete="tel" textContentType="telephoneNumber" maxLength={10} autoFocus />
        </View>
      </View>
      {error ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.sm }]}>{error}</Text> : null}
      <View style={{ marginTop: space.lg }}>
        <Check checked={agree} onChange={setAgree} label="Main Terms aur Privacy Policy se sehmat hoon." />
        {config ? (
          <View style={{ flexDirection: 'row', gap: space.lg, marginLeft: 34 }}>
            <Text style={[type.subhead, { color: colors.accent }]} onPress={() => Linking.openURL(config.legal.terms)}>Terms</Text>
            <Text style={[type.subhead, { color: colors.accent }]} onPress={() => Linking.openURL(config.legal.privacy)}>Privacy Policy</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
