// Pieces of the night scenes: backdrop, gold dust, perch, feathers, sparkle burst (storyboard 2026-11-12: every screen is navy and gold).
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';

import { mandalaMarkup } from '@/data/cardArt';
import { useScopedSvgs } from '@/lib/svgIds';
import { scene } from '@/theme';

const MANDALA = mandalaMarkup();

/** Small seeded PRNG: pure (same input, same output), so star fields and sparkles are stable across re-renders. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Night gradient, stars, a faint slowly turning mandala behind the card area, and a soft vignette. */
export function NightBackdrop({ width, height, mandalaY, still }: { width: number; height: number; mandalaY: number; still?: boolean }) {
  const stars = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: Math.round((width * height) / 5200) }, () => ({
      x: rnd() * width, y: rnd() * height * 0.9, r: rnd() * 1.1 + 0.3, o: 0.3 + rnd() * 0.6,
    }));
  }, [width, height]);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!still) spin.value = withRepeat(withTiming(360, { duration: 240_000, easing: Easing.linear }), -1);
  }, [still, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const m = width * 1.5;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={scene.night} />
            <Stop offset="0.6" stopColor="#140D38" />
            <Stop offset="1" stopColor={scene.night2} />
          </LinearGradient>
          <RadialGradient id="glow" cx="50%" cy="38%" r="60%">
            <Stop offset="0" stopColor="#5A3CAA" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#5A3CAA" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#sky)" />
        <Rect width={width} height={height} fill="url(#glow)" />
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF6DC" opacity={s.o} />)}
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: width / 2 - m / 2, top: mandalaY - m / 2, width: m, height: m, opacity: 0.09 }, spinStyle]}>
        <SvgXml xml={MANDALA} width={m} height={m} />
      </Animated.View>
    </View>
  );
}

/** Background for the standard screens: night gradient, gold dust and faint mandalas top and bottom (storyboard). */
const DUST = (() => {
  const rnd = seeded(11);
  return Array.from({ length: 70 }, () => ({ x: rnd() * 100, y: rnd() * 100, r: rnd() * 1.2 + 0.3, o: 0.2 + rnd() * 0.55, gold: rnd() < 0.35 }));
})();
export function StarField() {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1238" />
            <Stop offset="0.45" stopColor={scene.night} />
            <Stop offset="1" stopColor="#120C33" />
          </LinearGradient>
          <RadialGradient id="sfg" cx="50%" cy="0%" r="70%">
            <Stop offset="0" stopColor="#B8862B" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#B8862B" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sf)" />
        <Rect width="100%" height="100%" fill="url(#sfg)" />
        {DUST.map((d, i) => <Circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r} fill={d.gold ? '#F3C860' : '#FFF6DC'} opacity={d.o} />)}
      </Svg>
      <View style={{ position: 'absolute', top: -170, alignSelf: 'center', opacity: 0.07 }}>
        <SvgXml xml={MANDALA} width={340} height={340} />
      </View>
      <View style={{ position: 'absolute', bottom: -190, alignSelf: 'center', opacity: 0.08 }}>
        <SvgXml xml={MANDALA} width={380} height={380} />
      </View>
    </View>
  );
}

export function Vignette({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="vig" cx="50%" cy="45%" r="75%">
          <Stop offset="0.6" stopColor="#03020F" stopOpacity="0" />
          <Stop offset="1" stopColor="#03020F" stopOpacity="0.75" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#vig)" />
    </Svg>
  );
}

const PERCH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150">
<defs><linearGradient id="pw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B57A3C"/><stop offset="0.5" stop-color="#7A4A1C"/><stop offset="1" stop-color="#4E2C0E"/></linearGradient>
<linearGradient id="pb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0B8"/><stop offset="0.45" stop-color="#D4AF37"/><stop offset="1" stop-color="#7E5F10"/></linearGradient></defs>
<rect x="22" y="10" width="176" height="10" rx="5" fill="url(#pw)"/><circle cx="20" cy="15" r="8" fill="url(#pb)"/><circle cx="200" cy="15" r="8" fill="url(#pb)"/>
<path d="M186 22V34" stroke="#D4AF37" stroke-width="1.5"/><path d="M179 46C179 38 182 34 186 34C190 34 193 38 193 46Z" fill="url(#pb)"/>
<rect x="104" y="20" width="12" height="104" fill="url(#pw)"/><rect x="100" y="34" width="20" height="6" rx="3" fill="url(#pb)"/>
<rect x="100" y="70" width="20" height="6" rx="3" fill="url(#pb)"/><rect x="100" y="104" width="20" height="6" rx="3" fill="url(#pb)"/>
<path d="M72 134C76 120 92 116 110 116C128 116 144 120 148 134Z" fill="url(#pw)"/><rect x="64" y="132" width="92" height="8" rx="4" fill="url(#pb)"/></svg>`;

/** Ornate brass-and-wood perch; `rodY` is where Mittu's feet rest. */
const PERCH_SVGS = { perch: PERCH };
export function Perch({ x, rodY, scale = 1 }: { x: number; rodY: number; scale?: number }) {
  const { perch } = useScopedSvgs(PERCH_SVGS);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 110 * scale, top: rodY - 10 * scale }}>
      <SvgXml xml={perch} width={220 * scale} height={150 * scale} />
    </View>
  );
}

const FEATHER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 30"><path d="M7 0C13 8 13 20 7 30C1 20 1 8 7 0Z" fill="#2ECC71"/><path d="M7 3V29" stroke="#0E6E3D" stroke-width="0.8"/></svg>';

/** One green feather drifting down and swaying (spawned where Mittu flies). */
export function Feather({ x, y, dir }: { x: number; y: number; dir: 1 | -1 }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 10 : t.value > 0.8 ? (1 - t.value) * 5 : 1,
    transform: [{ translateX: Math.sin(t.value * Math.PI * 2.5) * 20 * dir }, { translateY: t.value * 200 },
      { rotate: `${Math.sin(t.value * Math.PI * 3) * 50 * dir}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 7, top: y }, style]}>
      <SvgXml xml={FEATHER} width={14} height={30} />
    </Animated.View>
  );
}

function Spark({ dx, dy, size, color, delay }: { dx: number; dy: number; size: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value + 30 * t.value * t.value },
      { scale: t.value < 0.3 ? t.value / 0.3 : 1.3 - t.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
    left: -size / 2, top: -size / 2, boxShadow: `0 0 8px ${color}` }, style]} />;
}

/** Gold sparkle burst at (x, y) when the card flips. Remount (change `key`) to replay. */
export function Burst({ x, y, radius, seed = 1 }: { x: number; y: number; radius: number; seed?: number }) {
  const parts = useMemo(() => {
    const rnd = seeded(seed);
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2 + rnd() * 0.4;
      const d = radius * (0.45 + rnd() * 0.7);
      const c = rnd();
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, size: 4 + rnd() * 7, delay: rnd() * 120,
        color: c < 0.25 ? scene.saffron : c < 0.55 ? '#FFF3C4' : scene.gold };
    });
  }, [radius, seed]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y }}>
      {parts.map((p, i) => <Spark key={i} {...p} />)}
    </View>
  );
}
