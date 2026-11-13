// Mittu, a realistic Indian rose-ringed parakeet (art: data/mittuArt.js). STAND-IN for the Rive file (guide 07: one .riv with a state machine idle / fly /
// hover / pick / land / talk via rive-react-native). Same states and props, so swapping in Rive later only changes
// this file: map `mode` to the state machine and `talking` to the Rive input `talking`.
//
// Built from full-size SVG layers (viewBox 0 0 160 160, facing right), each in an Animated.View that rotates/scales
// around its own pivot (wings at the shoulder, head at the neck, eyelid at the brow, lower beak at its hinge).
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { MITTU_LAYERS, PERCHED } from '@/data/mittuArt';
import { useScopedSvgs } from '@/lib/svgIds';

export type MittuMode = 'idle' | 'fly' | 'hover' | 'pick' | 'land' | 'talk';

const V = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${inner}</svg>`;
// Realistic rose-ringed parakeet art lives in data/mittuArt.js (shared with tools/feature-graphic.mjs).
const L = Object.fromEntries(Object.entries(MITTU_LAYERS).map(([k, v]) => [k, V(v)])) as Record<keyof typeof MITTU_LAYERS, string>;

/** One static picture of Mittu on a perch pose (app icon, store art). */
export function mittuStaticSvg(turban = false) {
  const inner = (s: string) => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return V([...PERCHED, ...(turban ? ['turban'] : [])].map((k) => inner(L[k as keyof typeof L])).join(''));
}

const origin = (x: number, y: number) => `${(x / 160) * 100}% ${(y / 160) * 100}% 0px`;
const ease = Easing.inOut(Easing.sin);

function Layer({ xml, size, style }: { xml: string; size: number; style?: object }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  );
}

export function Mittu({ mode = 'idle', size = 120, facing = 1, talking = false, still = false, turban = false }: {
  mode?: MittuMode; size?: number; facing?: 1 | -1; talking?: boolean; still?: boolean; turban?: boolean;
}) {
  const X = useScopedSvgs(L);
  const flying = mode === 'fly' || mode === 'hover' || mode === 'pick';
  const flap = useSharedValue(0);
  const breathe = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(0);
  const beak = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    breathe.value = withRepeat(withTiming(1, { duration: 1700, easing: ease }), -1, true);
    blink.value = withRepeat(withSequence(withDelay(4600, withTiming(1, { duration: 90 })), withTiming(0, { duration: 110 })), -1);
    return () => [breathe, blink].forEach(cancelAnimation);
  }, [still, breathe, blink]);

  useEffect(() => {
    if (still) return;
    cancelAnimation(flap);
    cancelAnimation(tilt);
    if (flying) {
      const half = mode === 'hover' ? 160 : 120;
      flap.value = 0;
      flap.value = withRepeat(withTiming(1, { duration: half, easing: ease }), -1, true);
    } else flap.value = 0;
    if (mode === 'pick') tilt.value = withTiming(34, { duration: 180 });
    else if (talking || mode === 'talk') tilt.value = withRepeat(withSequence(withTiming(-4, { duration: 450, easing: ease }), withTiming(0, { duration: 450, easing: ease })), -1);
    else if (mode === 'idle' || mode === 'land') {
      tilt.value = withRepeat(withSequence(
        withDelay(1600, withTiming(-11, { duration: 600, easing: ease })), withDelay(1000, withTiming(7, { duration: 700, easing: ease })),
        withDelay(1000, withTiming(0, { duration: 600, easing: ease }))), -1);
    } else tilt.value = withTiming(0, { duration: 200 });
  }, [mode, flying, talking, still, flap, tilt]);

  // Beak sync (guide 07): while the voice plays (`talking`), the beak opens and closes.
  useEffect(() => {
    cancelAnimation(beak);
    if (talking && !still) {
      beak.value = withRepeat(withSequence(withTiming(1, { duration: 90 }), withTiming(0.25, { duration: 80 }),
        withTiming(0.8, { duration: 100 }), withTiming(0, { duration: 110 })), -1);
    } else beak.value = withTiming(0, { duration: 100 });
  }, [talking, still, beak]);

  const bodyStyle = useAnimatedStyle(() => ({ transformOrigin: origin(84, 128), transform: [{ scaleX: 1 + breathe.value * 0.02 }, { scaleY: 1 + breathe.value * 0.03 }] }));
  const headStyle = useAnimatedStyle(() => ({ transformOrigin: origin(96, 72), transform: [{ rotate: `${tilt.value}deg` }] }));
  const lidStyle = useAnimatedStyle(() => ({ transformOrigin: origin(107, 35.5), transform: [{ scaleY: blink.value }] }));
  const beakStyle = useAnimatedStyle(() => ({ transformOrigin: origin(118, 60), transform: [{ rotate: `${beak.value * 26}deg` }] }));
  const nearStyle = useAnimatedStyle(() => ({ transformOrigin: origin(80, 92), transform: [{ rotate: `${-12 + flap.value * 28}deg` }, { scaleY: 1 - flap.value * 1.55 }] }));
  const farStyle = useAnimatedStyle(() => ({ transformOrigin: origin(84, 88), transform: [{ rotate: `${-10 + flap.value * 24}deg` }, { scaleY: 1 - flap.value * 1.4 }] }));
  const tailStyle = useAnimatedStyle(() => ({ transformOrigin: origin(80, 114), transform: [{ rotate: flying ? '-14deg' : '0deg' }] }));

  return (
    <View style={{ width: size, height: size, transform: [{ scaleX: facing }] }} pointerEvents="none">
      {flying ? <Layer xml={X.farWing} size={size} style={farStyle} /> : null}
      <Layer xml={X.tail} size={size} style={tailStyle} />
      {!flying ? <Layer xml={X.feet} size={size} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Layer xml={X.body} size={size} />
        {!flying ? <Layer xml={X.foldedWing} size={size} /> : null}
        <Animated.View style={[StyleSheet.absoluteFill, headStyle]}>
          <Layer xml={X.head} size={size} />
          <Layer xml={X.lid} size={size} style={lidStyle} />
          <Layer xml={X.lowerBeak} size={size} style={beakStyle} />
          <Layer xml={X.upperBeak} size={size} />
          {turban ? <Layer xml={X.turban} size={size} /> : null}
        </Animated.View>
      </Animated.View>
      {flying ? <Layer xml={X.nearWing} size={size} style={nearStyle} /> : null}
    </View>
  );
}
