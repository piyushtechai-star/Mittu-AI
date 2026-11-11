import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { requestOtp, verifyOtp } from '@/api/auth';
import { Button, Header, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, space, type } from '@/theme';

export default function OtpScreen() {
  const { signIn } = useAuth();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(30);
  const [focused, setFocused] = useState(true);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function verify(value = code) {
    setBusy(true);
    setError(null);
    try {
      const { token } = await verifyOtp(phone, value);
      await signIn(token); // the root layout then moves on to the paywall / next step
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await requestOtp(phone);
      setWait(30);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen footer={<Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6} />}>
      <Header />
      <Title sub={`+91 ${phone} par bheja gaya code daaliye.`}>Code daaliye</Title>
      {/* Six digit boxes over one hidden input, so typing, paste and SMS autofill all still work. */}
      <Pressable accessibilityRole="none" onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'space-between' }}>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && (i === code.length || (i === 5 && code.length === 6));
          return (
            <View key={i} style={{ flex: 1, maxWidth: 54, aspectRatio: 0.86, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surface, borderWidth: active ? 2 : 1, borderColor: active ? colors.accent : colors.border }}>
              <Text style={[type.title, { fontSize: 24 }]}>{code[i] ?? ''}</Text>
            </View>
          );
        })}
        <TextInput ref={input} value={code} autoFocus keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode"
          accessibilityLabel="6-digit code" caretHidden onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent' }}
          onChangeText={(v) => {
            const c = v.replace(/\D/g, '').slice(0, 6);
            setCode(c);
            if (c.length === 6 && !busy) verify(c);
          }} />
      </Pressable>
      {error ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.sm }]}>{error}</Text> : null}
      <View style={{ marginTop: space.xl, gap: space.lg, alignItems: 'center' }}>
        {wait > 0
          ? <Text style={type.subhead}>{`Naya code ${wait}s mein`}</Text>
          : <Text style={[type.callout, { color: colors.accent, fontWeight: '600' }]} onPress={resend}>Code dobara bhejiye</Text>}
        <Text style={[type.callout, { color: colors.accent }]} onPress={() => router.back()}>Number badliye</Text>
      </View>
    </Screen>
  );
}
