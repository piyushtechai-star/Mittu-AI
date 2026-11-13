// 4. Let's Go! (storyboard): the user's question, the glowing "Mittu, card nikaalo!" button and "Let's Go!".
// Tapping it pulses the button, chimes, then opens the reading scene (5-12) in place of this screen.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

import { Sparkles } from '@/components/Art';
import { Button, Card, Header, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES } from '@/data/categories';
import { peekPendingReading, startReading } from '@/lib/nav';
import { initSound, play } from '@/lib/sound';
import { colors, scene, serif, space, type } from '@/theme';

export default function LetsGo() {
  const { me } = useAuth();
  const pending = peekPendingReading();
  const still = !!useReducedMotion();
  const [going, setGoing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const glow = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!pending) router.replace('/home');
    void initSound();
    if (!still) glow.set(withRepeat(withSequence(withTiming(1.035, { duration: 900 }), withTiming(1, { duration: 900 })), -1));
    return () => clearTimeout(timer.current);
  }, [pending, still, glow]);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value * pulse.value }] }));
  const left = me?.readingsLeftToday ?? 0;
  const cat = CATEGORIES.find((c) => c.value === pending?.category);

  const go = () => {
    if (going) return;
    setGoing(true);
    play('chime', 0.6);
    pulse.set(withSequence(withTiming(1.08, { duration: 180 }), withTiming(1, { duration: 240 })));
    timer.current = setTimeout(startReading, still ? 0 : 700);
  };

  if (!pending) return null;
  return (
    <Screen scroll={false}>
      <Header title="" />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Card style={{ gap: space.sm }}>
          <Text style={[type.footnote, { color: scene.goldSoft, letterSpacing: 0.6, textTransform: 'uppercase' }]}>Aapka sawaal</Text>
          <Text style={[type.body, { fontFamily: serif }]}>
            {pending.question ? `“${pending.question}”` : 'Koi sawaal nahi, bas Mittu ka sandesh 🦜'}
          </Text>
          {cat ? (
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 5, borderRadius: 999, backgroundColor: cat.color, marginTop: 4 }}>
              <Text style={[type.footnote, { color: '#FFFFFF', fontWeight: '600' }]}>{cat.label}</Text>
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: 56, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -60, left: 0, right: 0, height: 180 }} pointerEvents="none">
            <Sparkles width={340} height={180} count={12} still={still} />
          </View>
          <Animated.View style={[{ alignSelf: 'stretch' }, btnStyle]}>
            <Button title="Mittu, card nikaalo!" icon="sparkles" disabled={left <= 0} onPress={go} />
          </Animated.View>
          <Text style={{ fontFamily: serif, fontSize: 30, color: scene.goldSoft, textAlign: 'center', marginTop: space.lg,
            opacity: going ? 1 : 0.75, textShadowColor: 'rgba(212,175,55,0.7)', textShadowRadius: going ? 18 : 8 }}>
            {"Let's Go!"}
          </Text>
          <Text style={[type.footnote, { textAlign: 'center', marginTop: space.md, color: colors.textSecondary }]}>
            {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
