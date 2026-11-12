// 3. Input Sawaal + 4. Let's Go! (storyboard): question, coloured categories, the glowing button.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { Category } from '@/api/mittu';
import { Mittu } from '@/components/Mittu';
import { Perch } from '@/components/Scene';
import { Button, Card, Chips, Field, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getSkipAnimation, setSkipAnimation, startReading } from '@/lib/nav';
import { initSound, play } from '@/lib/sound';
import { colors, scene, serif, space, type } from '@/theme';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'love', label: 'Love ❤️', color: '#C93A3A' },
  { value: 'career', label: 'Career 💼', color: '#1F6DB0' },
  { value: 'paisa', label: 'Paisa 💰', color: '#A87B22' },
  { value: 'health', label: 'Health 🌿', color: '#23874B' },
  { value: 'general', label: 'General ✨', color: '#7442BE' },
];

export default function Home() {
  const { me, refresh } = useAuth();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    void initSound();   // preload while the user types
    getSkipAnimation().then(setSkip);
  }, []);
  // Back from a reading: today's count changed.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const left = me?.readingsLeftToday ?? 0;
  const first = me?.name?.split(' ')[0];

  // 4. "Let's Go!": the button pulses and the words appear for a moment, then the reading starts.
  const reduced = useReducedMotion();
  const [going, setGoing] = useState(false);
  const goTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pulse = useSharedValue(1);
  const goStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  useEffect(() => () => clearTimeout(goTimer.current), []);
  useFocusEffect(useCallback(() => { setGoing(false); }, []));
  const go = () => {
    if (going) return;
    setGoing(true);
    play('chime', 0.5);
    pulse.set(withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 220 })));
    goTimer.current = setTimeout(() => startReading(question.trim(), category), reduced ? 0 : 650);
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: space.sm }}>
        <View style={{ width: 160, height: 205, alignItems: 'center' }}>
          <Perch x={80} rodY={118} scale={0.62} />
          <Mittu size={138} turban />
        </View>
        <Text style={[type.largeTitle, { marginTop: space.sm, textAlign: 'center', fontFamily: serif, color: scene.goldSoft }]}>{first ? `Namaste, ${first}` : 'Namaste'}</Text>
        <Text style={[type.callout, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>Mittu bataega aapka bhavishya 🦜</Text>
      </View>

      <Card style={{ marginTop: space.xl, gap: space.md }}>
        <Text style={{ fontFamily: serif, fontSize: 18, fontWeight: '700', color: scene.goldSoft }}>Question & Categories</Text>
        <Field value={question} onChangeText={setQuestion} placeholder="Apna sawaal poochiye..." multiline maxLength={300}
          style={{ minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }} />
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      </Card>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        <Animated.View style={goStyle}>
          <Button title="Mittu, card nikaalo!" icon="sparkles" disabled={left <= 0} onPress={go} />
        </Animated.View>
        {going ? (
          <Text style={{ fontFamily: serif, fontSize: 24, color: scene.goldSoft, textAlign: 'center', textShadowColor: 'rgba(212,175,55,0.6)', textShadowRadius: 10 }}>{"Let's Go!"}</Text>
        ) : (
          <Text style={[type.footnote, { textAlign: 'center' }]}>
            {left > 0 ? `Aaj ${left} reading${left === 1 ? '' : 's'} baaki` : 'Aaj ki readings ho gayin. Kal phir aaiye!'}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl, gap: space.md }}>
        <Text style={[type.subhead, { flex: 1, color: colors.text }]}>Skip animation</Text>
        <Switch value={skip} onValueChange={(v) => { setSkip(v); void setSkipAnimation(v); }}
          trackColor={{ true: colors.accent, false: colors.border }} thumbColor={skip ? scene.goldSoft : '#BDB5A6'} />
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginTop: space.xl }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
