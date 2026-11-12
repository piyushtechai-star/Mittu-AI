import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input, textarea { outline: none !important; }';
  document.head.appendChild(style);
}

// Fixed onboarding order (guide 05): OTP → Paywall → Name (required) → Home. The backend decides the step
// (GET /me → next); a paid user without a name always lands on the name screen again.
function Routes() {
  const { ready, signedIn, me } = useAuth();
  if (!ready) return null;
  const next = me?.next;
  const entry = !signedIn ? '/auth' : next === 'paywall' ? '/paywall' : next === 'name' ? '/name' : '/';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn} redirectTo={entry}>
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth/meet" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'paywall'} redirectTo={entry}>
        <Stack.Screen name="paywall" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'name'} redirectTo={entry}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && next === 'home'} redirectTo={entry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reading" options={{ animation: 'fade' }} />
        <Stack.Screen name="history" />
        <Stack.Screen name="invoices" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
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
