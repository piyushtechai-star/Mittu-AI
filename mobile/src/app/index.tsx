// Onboarding 1/2, Welcome (meeting brief 2026-11-17): first launch only. Ornate golden pinjra glowing in the night
// sky, shimmering "Mittu AI", tagline, "Shuru Karein →", implicit T&C line. Returning users go straight on.
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Birdcage, Sparkles } from '@/components/Art';
import { ConsentLine } from '@/components/Consent';
import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { entryFor, isOnboarded } from '@/lib/nav';
import { initSound } from '@/lib/sound';
import { colors, fonts, scene, space, type } from '@/theme';

export default function Welcome() {
  const { signedIn, me } = useAuth();
  const still = !!useReducedMotion();
  const shimmer = useSharedValue(0.75);
  useEffect(() => {
    if (!still) shimmer.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
  }, [still, shimmer]);
  const logo = useAnimatedStyle(() => ({ opacity: shimmer.value, textShadowRadius: 8 + shimmer.value * 12 }));

  if (isOnboarded()) return <Redirect href={entryFor(signedIn, me?.next) as never} />;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 260, height: 372, alignItems: 'center', justifyContent: 'flex-start' }}>
          <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Sparkles width={260} height={340} count={14} still={still} />
          </View>
          <Birdcage size={210} still={still} />
        </View>
        <Animated.Text style={[{ fontFamily: fonts.display, fontSize: 44, color: scene.goldSoft, marginTop: space.md,
          textShadowColor: 'rgba(212,175,55,0.75)' }, logo]}>Mittu AI</Animated.Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: space.xs }]}>
          Mittu bataega aapka bhavishya 🦜
        </Text>
        <View style={{ marginTop: space.xl, width: '100%', maxWidth: 320 }}>
          <Button title="Shuru Karein" iconRight="arrow-forward" onPress={() => { void initSound(); router.push('/meet'); }} />
          <ConsentLine />
        </View>
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginBottom: space.md }]}>Sirf manoranjan ke liye 🦜</Text>
    </Screen>
  );
}
