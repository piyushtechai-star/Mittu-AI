import { Cinzel_600SemiBold, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { entryFor, getOnboarded } from '@/lib/nav';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input, textarea { outline: none !important; } body { background: #090924; }';
  document.head.appendChild(style);
}

// Fixed onboarding order (guide 05): OTP → Paywall → Name (required) → Birth details (date required, 18+) → Home. The backend decides the step
// (GET /me → next); a paid user without a name always lands on the name screen again.
function Routes() {
  const { ready, signedIn, me } = useAuth();
  if (!ready) return null;
  const next = me?.next;
  const entry = entryFor(signedIn, next);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* Welcome and Meet Mittu: first launch only (brief 2026-11-17); index.tsx sends returning users onwards. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="meet" options={{ animation: 'fade' }} />
      <Stack.Protected guard={!signedIn} redirectTo={entry}>
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'paywall'} redirectTo={entry}>
        <Stack.Screen name="paywall" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'name'} redirectTo={entry}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      {/* Onboarding step, and later Profile > Janam details (?edit=1). */}
      <Stack.Protected guard={signedIn && (next === 'birth' || next === 'home')} redirectTo={entry}>
        <Stack.Screen name="birth" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'home'} redirectTo={entry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reading" options={{ animation: 'fade' }} />
        <Stack.Screen name="invoices" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_600SemiBold, Cinzel_700Bold, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, TiroDevanagariHindi_400Regular,
  });
  const [onboardedKnown, setOnboardedKnown] = useState(false);
  useEffect(() => { getOnboarded().finally(() => setOnboardedKnown(true)); }, []);
  if ((!fontsLoaded && !fontError) || !onboardedKnown) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Routes />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
