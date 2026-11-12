// 1. Splash (storyboard): golden birdcage with Mittu, "Mittu AI", Get Started → 2. Meet Mittu.
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Birdcage } from '@/components/Art';
import { Button, Screen } from '@/components/ui';
import { initSound } from '@/lib/sound';
import { colors, scene, serif, space, type } from '@/theme';

export default function Splash() {
  const still = !!useReducedMotion();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ marginTop: -space.xxl }}>
          <Birdcage size={210} still={still} />
        </View>
        <Text style={{ fontFamily: serif, fontWeight: '700', fontSize: 46, color: scene.goldSoft, marginTop: space.lg,
          textShadowColor: 'rgba(212,175,55,0.6)', textShadowRadius: 14 }}>Mittu AI</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: space.xs }]}>Mittu bataega aapka{'\n'}bhavishya 🦜</Text>
        <View style={{ marginTop: space.xl, minWidth: 200 }}>
          <Button title="Get Started" iconRight="arrow-forward" onPress={() => { void initSound(); router.push('/auth/meet'); }} />
        </View>
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginBottom: space.md }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
