// The hero mic (meeting brief 2026-11-17): saffron-and-gold, softly pulsing; while listening, three rings swell with
// the voice level (real mic loudness on phones, a gentle pulse on web). Used on Home and in the reading scene.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';

import { scene } from '@/theme';

function Ring({ k, size, listening, level, pulse }: {
  k: number; size: number; listening: boolean; level: SharedValue<number>; pulse: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const l = listening ? level.value : pulse.value * 0.35;
    return { opacity: listening ? 0.55 - k * 0.15 : 0.35 - k * 0.12, transform: [{ scale: 1 + (0.18 + k * 0.16) * (0.4 + l) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: listening ? scene.saffron : scene.gold }, style]} />
  );
}

export function MicButton({ listening, level, onPress, size = 84, label }: {
  listening: boolean; level: SharedValue<number>; onPress: () => void; size?: number; label?: string;
}) {
  const still = !!useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!still) pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, pulse]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : label ?? 'Bolkar sawaal poochiye'}
      accessibilityState={{ selected: listening }} onPress={onPress} hitSlop={8}
      style={{ width: size * 1.7, height: size * 1.7, alignItems: 'center', justifyContent: 'center' }}>
      {[2, 1, 0].map((k) => <Ring key={k} k={k} size={size} listening={listening} level={level} pulse={pulse} />)}
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: listening ? '#E5484D' : scene.saffron, borderWidth: 3, borderColor: scene.goldSoft,
        boxShadow: `0 0 ${listening ? 34 : 26}px ${listening ? 'rgba(229,72,77,0.7)' : 'rgba(255,153,51,0.65)'}` }}>
        <Ionicons name={listening ? 'stop' : 'mic'} size={size * 0.42} color={listening ? '#FFFFFF' : '#1B1240'} />
      </View>
    </Pressable>
  );
}
