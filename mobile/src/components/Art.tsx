// Storyboard art (HouseofTech, 2026-11-12): the golden birdcage (splash), the bansuri zoom that opens the reading,
// the gold swirl around the revealed card, the rod Mittu lands on, and the parchment scroll for the result.
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { mittuStaticSvg } from '@/components/Mittu';
import { scopeIds } from '@/lib/svgIds';
import { scene } from '@/theme';

const ease = Easing.inOut(Easing.sin);

// ---------------------------------------------------------------- birdcage (splash)
const GOLD_DEFS = `<defs><linearGradient id="cg" gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="180" y2="270"><stop offset="0" stop-color="#FFF0B8"/><stop offset="0.45" stop-color="#D4AF37"/><stop offset="1" stop-color="#8A6A14"/></linearGradient>
<radialGradient id="cglow" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="#FFC15A" stop-opacity="0.35"/><stop offset="1" stop-color="#FFC15A" stop-opacity="0"/></radialGradient></defs>`;
const bars = Array.from({ length: 9 }, (_, i) => {
  const x = 36 + i * 16;
  return `<path d="M${x} 112V236" stroke="url(#cg)" stroke-width="2.2"/><path d="M${x} 112C${x} 70 ${100 + (x - 100) * 0.25} 44 100 40" stroke="url(#cg)" stroke-width="1.8" fill="none"/>`;
}).join('');
const CAGE_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">${GOLD_DEFS}
  <ellipse cx="100" cy="170" rx="90" ry="100" fill="url(#cglow)"/>
  <path d="M70 196H130" stroke="url(#cg)" stroke-width="3" stroke-linecap="round"/><path d="M76 196V150M124 196V150" stroke="url(#cg)" stroke-width="1" opacity="0.6"/></svg>`;
const CAGE_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">${GOLD_DEFS}
  <circle cx="100" cy="14" r="8" fill="none" stroke="url(#cg)" stroke-width="3"/>
  <path d="M100 22V36" stroke="url(#cg)" stroke-width="3"/><circle cx="100" cy="38" r="5" fill="url(#cg)"/>
  ${bars}
  <ellipse cx="100" cy="112" rx="66" ry="7" fill="none" stroke="url(#cg)" stroke-width="3"/>
  <path d="M30 236H170L178 250H22Z" fill="url(#cg)"/><rect x="16" y="250" width="168" height="12" rx="5" fill="url(#cg)"/>
  <path d="M28 262H172L164 272H36Z" fill="#8A6A14"/></svg>`;
const BIRD = scopeIds(mittuStaticSvg(), 'cage');

/** Golden cage hanging on a chain, Mittu on the swing inside, gold dust twinkling around it. */
export function Birdcage({ size = 220, still }: { size?: number; still?: boolean }) {
  const swing = useSharedValue(0);
  useEffect(() => {
    if (!still) swing.value = withRepeat(withSequence(withTiming(2.5, { duration: 1800, easing: ease }), withTiming(-2.5, { duration: 1800, easing: ease })), -1, true);
  }, [still, swing]);
  const style = useAnimatedStyle(() => ({ transformOrigin: '50% 0%', transform: [{ rotate: `${swing.value}deg` }] }));
  const h = size * 1.4;
  const bird = size * 0.42;
  return (
    <View style={{ width: size, alignItems: 'center' }} pointerEvents="none">
      <View style={{ width: 2, height: size * 0.35, backgroundColor: 'rgba(212,175,55,0.7)' }} />
      <Animated.View style={[{ width: size, height: h }, style]}>
        <SvgXml xml={CAGE_BACK} width={size} height={h} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: size / 2 - bird / 2, top: h * (196 / 280) - bird * 0.83 }}>
          <SvgXml xml={BIRD} width={bird} height={bird} />
        </View>
        <SvgXml xml={CAGE_FRONT} width={size} height={h} style={StyleSheet.absoluteFill} />
        <Sparkles width={size} height={h} count={14} still={still} />
      </Animated.View>
    </View>
  );
}

function Twinkle({ x, y, s, delay, still }: { x: number; y: number; s: number; delay: number; still?: boolean }) {
  const t = useSharedValue(still ? 0.7 : 0);
  useEffect(() => {
    if (!still) t.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900, easing: ease }), withTiming(0.1, { duration: 900, easing: ease })), -1));
  }, [t, delay, still]);
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.5 + t.value * 0.7 }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s / 2, backgroundColor: '#FFE7A0', boxShadow: '0 0 6px #FFC15A' }, style]} />;
}

export function Sparkles({ width, height, count = 12, still }: { width: number; height: number; count?: number; still?: boolean }) {
  const pts = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996;
    const r = 0.25 + ((i * 37) % 23) / 40;
    return { x: width / 2 + Math.cos(a) * r * width * 0.55, y: height * 0.5 + Math.sin(a) * r * height * 0.45, s: 2 + (i % 3), delay: (i * 230) % 1800 };
  }), [width, height, count]);
  return <>{pts.map((p, i) => <Twinkle key={i} {...p} still={still} />)}</>;
}

// ---------------------------------------------------------------- bansuri zoom (opens the reading)
const FLUTE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 40"><defs>
<linearGradient id="fw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1C98A"/><stop offset="0.45" stop-color="#C08A45"/><stop offset="1" stop-color="#7A4E1E"/></linearGradient>
<linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0B8"/><stop offset="0.5" stop-color="#D4AF37"/><stop offset="1" stop-color="#8A6A14"/></linearGradient></defs>
<rect x="6" y="11" width="288" height="18" rx="9" fill="url(#fw)"/>
<rect x="6" y="10" width="16" height="20" rx="6" fill="url(#fb)"/><rect x="278" y="10" width="16" height="20" rx="6" fill="url(#fb)"/>
<rect x="88" y="10" width="6" height="20" fill="url(#fb)"/><rect x="250" y="10" width="6" height="20" fill="url(#fb)"/>
<ellipse cx="60" cy="20" rx="5" ry="3.6" fill="#3A2208"/>
${[130, 152, 174, 196, 218, 238].map((x) => `<ellipse cx="${x}" cy="20" rx="3.6" ry="3" fill="#3A2208"/>`).join('')}
<path d="M24 14H276" stroke="#FFF3D0" stroke-width="1.4" opacity="0.5"/></svg>`;
const RING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>
<linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7A0" stop-opacity="0"/><stop offset="0.5" stop-color="#FFD36B"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></linearGradient></defs>
<path d="M20 100A80 80 0 0 1 180 100" stroke="url(#rg)" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M170 120A72 72 0 0 1 40 140" stroke="url(#rg)" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`;

function Note({ x, y, ch, delay, size }: { x: number; y: number; ch: string; delay: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) })); }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: t.value < 0.2 ? t.value * 5 : 1 - (t.value - 0.2) / 0.8, transform: [{ translateY: -40 * t.value }, { rotate: `${-12 + 24 * t.value}deg` }] }));
  return <Animated.Text style={[{ position: 'absolute', left: x, top: y, fontSize: size, color: '#F3C860', textShadowColor: '#FFB300', textShadowRadius: 8 }, style]}>{ch}</Animated.Text>;
}

/** About 1.8 s: a bansuri inside a spinning gold ring zooms toward the viewer, notes float up, then it all fades. */
export function FluteZoom({ width, height }: { width: number; height: number }) {
  const t = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1800, easing: Easing.in(Easing.quad) });
    spin.value = withTiming(300, { duration: 1800, easing: Easing.out(Easing.cubic) });
  }, [t, spin]);
  const size = Math.min(width, height) * 0.82;
  const zoom = useAnimatedStyle(() => ({
    opacity: t.value < 0.12 ? t.value / 0.12 : t.value > 0.82 ? (1 - t.value) / 0.18 : 1,
    transform: [{ scale: 0.55 + t.value * 1.1 }],
  }));
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 45 }]}>
      <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, zoom]}>
        <Animated.View style={[StyleSheet.absoluteFill, ring]}><SvgXml xml={RING} width={size} height={size} /></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, ring, { transform: [{ rotate: '140deg' }], opacity: 0.6 }]}><SvgXml xml={RING} width={size} height={size} /></Animated.View>
        <View style={{ transform: [{ rotate: '-35deg' }] }}><SvgXml xml={FLUTE} width={size * 0.86} height={size * 0.115} /></View>
      </Animated.View>
      <Note x={width * 0.66} y={height * 0.3} ch="♪" delay={200} size={34} />
      <Note x={width * 0.24} y={height * 0.62} ch="♫" delay={500} size={30} />
      <Note x={width * 0.72} y={height * 0.58} ch="♪" delay={800} size={24} />
    </View>
  );
}

// ---------------------------------------------------------------- gold swirl around the revealed card
function SwirlDot({ i, n, rx, ry, a, size }: { i: number; n: number; rx: number; ry: number; a: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => {
    const ang = a.value + (i / n) * Math.PI * 2;
    const front = Math.sin(ang) > 0;
    const life = a.value / (Math.PI * 2.2);
    return {
      opacity: (front ? 1 : 0.45) * (life < 0.15 ? life / 0.15 : life > 0.7 ? Math.max(0, (1 - life) / 0.3) : 1),
      transform: [{ translateX: Math.cos(ang) * rx }, { translateY: Math.sin(ang) * ry }, { scale: front ? 1 : 0.6 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2,
    backgroundColor: i % 4 === 0 ? scene.saffron : '#FFE7A0', boxShadow: '0 0 8px #FFC15A' }, style]} />;
}

/** A ring of gold sparks orbiting the card once while it flips (storyboard "3D Card Reveal"). Remount to replay. */
export function Swirl({ x, y, width }: { x: number; y: number; width: number }) {
  const a = useSharedValue(0);
  useEffect(() => { a.value = withTiming(Math.PI * 2.2, { duration: 2000, easing: Easing.out(Easing.cubic) }); }, [a]);
  const n = 22;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, zIndex: 26, transform: [{ rotate: '-14deg' }] }}>
      {Array.from({ length: n }, (_, i) => <SwirlDot key={i} i={i} n={n} rx={width * 0.78} ry={width * 0.26} a={a} size={3 + (i % 3) * 2} />)}
    </View>
  );
}

// ---------------------------------------------------------------- the rod Mittu lands on beside the card
const ROD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 16"><defs>
<linearGradient id="rw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B57A3C"/><stop offset="0.5" stop-color="#7A4A1C"/><stop offset="1" stop-color="#4E2C0E"/></linearGradient>
<linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0B8"/><stop offset="0.45" stop-color="#D4AF37"/><stop offset="1" stop-color="#7E5F10"/></linearGradient></defs>
<rect x="8" y="4" width="184" height="8" rx="4" fill="url(#rw)"/><circle cx="8" cy="8" r="7" fill="url(#rb)"/><circle cx="192" cy="8" r="7" fill="url(#rb)"/>
<rect x="60" y="3" width="6" height="10" rx="2" fill="url(#rb)"/><rect x="134" y="3" width="6" height="10" rx="2" fill="url(#rb)"/></svg>`;

export function Rod({ x1, x2, y, visible }: { x1: number; x2: number; y: number; visible: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(visible ? 1 : 0, { duration: 500 }); }, [visible, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const w = x2 - x1;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x1, top: y - (w * 8) / 200, zIndex: 24 }, style]}>
      <SvgXml xml={ROD} width={w} height={(w * 16) / 200} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------- parchment scroll
const ROLL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 30" preserveAspectRatio="none"><defs>
<linearGradient id="pr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E3B4"/><stop offset="0.5" stop-color="#D9B87A"/><stop offset="1" stop-color="#9C7A43"/></linearGradient></defs>
<rect x="8" y="5" width="284" height="20" rx="10" fill="url(#pr)"/>
<ellipse cx="10" cy="15" rx="9" ry="12" fill="#C9A464" stroke="#8A6A34" stroke-width="1.2"/><ellipse cx="10" cy="15" rx="4" ry="6" fill="#8A6A34" opacity="0.5"/>
<ellipse cx="290" cy="15" rx="9" ry="12" fill="#C9A464" stroke="#8A6A34" stroke-width="1.2"/><ellipse cx="290" cy="15" rx="4" ry="6" fill="#8A6A34" opacity="0.5"/></svg>`;

export const ink = { text: '#3B2812', soft: '#6B5130', gold: '#9A7420' };

/** Aged-paper scroll with rolled ends top and bottom (storyboard "Share & Replay"). */
export function Parchment({ children }: { children: ReactNode }) {
  return (
    <View>
      <SvgXml xml={ROLL} width="100%" height={30} style={{ zIndex: 2, marginBottom: -12 }} />
      <View style={styles.paper}>{children}</View>
      <SvgXml xml={ROLL} width="100%" height={30} style={{ zIndex: 2, marginTop: -12 }} />
    </View>
  );
}

export function Flourish() {
  return <Text style={{ color: ink.gold, textAlign: 'center', fontSize: 14, letterSpacing: 4, marginVertical: 4 }}>~ ❦ ~</Text>;
}

const styles = StyleSheet.create({
  paper: { marginHorizontal: 10, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 22, backgroundColor: '#EED9A8',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#B89558', boxShadow: 'inset 0 0 28px rgba(140,100,40,0.45)' },
});
