// Mittu, the rose-ringed parakeet. STAND-IN for the Rive file (guide 07: one .riv with a state machine idle / fly /
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

import { useScopedSvgs } from '@/lib/svgIds';

export type MittuMode = 'idle' | 'fly' | 'hover' | 'pick' | 'land' | 'talk';

const V = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${inner}</svg>`;
const L = {
  farWing: V('<path d="M84 84C76 62 66 42 46 26C52 42 48 46 38 46C48 54 44 60 34 64C46 70 46 76 40 84C56 86 70 88 84 92Z" fill="#0E6E3D" opacity="0.9"/>'),
  tail: V(`<defs><linearGradient id="mt" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22B45E"/><stop offset="0.6" stop-color="#1B9C78"/><stop offset="1" stop-color="#2C7FB8"/></linearGradient></defs>
    <path d="M74 112C64 128 50 146 28 160C44 152 60 138 84 118Z" fill="url(#mt)"/><path d="M80 116C74 132 66 148 52 160C64 152 76 140 88 120Z" fill="#1A8F6A"/>`),
  feet: V('<path d="M77 126q-4 6-9 8M77 126q-1 7-3 10M77 126q4 5 8 6M93 128q-4 6-8 8M93 128q0 6-2 9M93 128q4 5 8 5" stroke="#8D8D8D" stroke-width="3.2" stroke-linecap="round" fill="none"/>'),
  body: V(`<defs><linearGradient id="mb" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#3EDB80"/><stop offset="0.6" stop-color="#25B862"/><stop offset="1" stop-color="#12884A"/></linearGradient></defs>
    <ellipse cx="84" cy="94" rx="27" ry="36" fill="url(#mb)" transform="rotate(20 84 94)"/>
    <ellipse cx="94" cy="100" rx="14" ry="25" fill="#9BF5B8" opacity="0.45" transform="rotate(20 94 100)"/>`),
  foldedWing: V(`<defs><linearGradient id="mw" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#1FAE5E"/><stop offset="0.7" stop-color="#11834A"/><stop offset="1" stop-color="#2C7FB8"/></linearGradient></defs>
    <path d="M72 72C94 68 106 90 101 120C98 134 88 144 79 148C81 130 73 110 64 96C62 86 64 78 72 72Z" fill="url(#mw)"/>
    <path d="M76 90C84 98 88 112 88 126M70 98C76 108 80 120 80 136" stroke="#7CEBA5" stroke-width="1.4" fill="none" opacity="0.55"/>
    <path d="M80 142C86 136 92 128 96 118" stroke="#3E8FD0" stroke-width="2.4" fill="none" opacity="0.8" stroke-linecap="round"/>`),
  head: V(`<defs><radialGradient id="mh" cx="0.62" cy="0.35" r="0.75"><stop offset="0" stop-color="#7CF2A4"/><stop offset="0.55" stop-color="#2ECC71"/><stop offset="1" stop-color="#169E54"/></radialGradient></defs>
    <circle cx="100" cy="50" r="23" fill="url(#mh)"/><ellipse cx="88" cy="56" rx="10" ry="13" fill="#40C9B4" opacity="0.4"/>
    <path d="M79 57Q84 70 95 74" stroke="#F06292" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M80 61Q87 77 110 73" stroke="#1B1B1B" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="110" cy="60" rx="5.5" ry="3.6" fill="#FF8FA3" opacity="0.55"/>
    <circle cx="107" cy="44" r="7.4" fill="#FFF8E1" stroke="#FFB300" stroke-width="1.4"/>
    <circle cx="108.6" cy="44.4" r="4" fill="#141414"/><circle cx="110.2" cy="42.6" r="1.5" fill="#fff"/>
    <path d="M117 56L128 62L117 65Z" fill="#4A0D0D"/>`),
  // Red pagdi with a gold brooch and plume (storyboard "Meet Mittu"); drawn in head coordinates so it tilts with the head.
  turban: V(`<defs><linearGradient id="mtb" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FF5A4A"/><stop offset="0.55" stop-color="#D32F2F"/><stop offset="1" stop-color="#8E1414"/></linearGradient></defs>
    <path d="M78 36C76 20 88 8 102 8C116 8 126 18 124 34C112 28 92 28 78 36Z" fill="url(#mtb)"/>
    <path d="M80 30C92 22 110 20 123 26M82 23C94 15 110 14 120 18M90 14C100 10 110 10 116 13" stroke="#7A0F0F" stroke-width="1.7" fill="none" opacity="0.75" stroke-linecap="round"/>
    <path d="M84 20C94 14 106 13 114 15" stroke="#FF9A8A" stroke-width="1.2" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M78 36C92 28 112 28 124 34L124 38C112 32 92 32 78 40Z" fill="#A61B1B"/>
    <path d="M116 18C115 12 118 6 123 3C121 9 121 13 118 18Z" fill="#F3DC8A"/>
    <circle cx="116" cy="22" r="4.4" fill="#D4AF37" stroke="#FFF0B8" stroke-width="0.8"/><circle cx="116" cy="22" r="1.9" fill="#2ECC71"/>`),
  lid: V('<ellipse cx="107" cy="44" rx="8.6" ry="8.6" fill="#55DE8C"/>'),
  lowerBeak: V('<path d="M117 59C122 60 127 62 127 66C125 70 120 70 116 66Z" fill="#8E1B1B"/>'),
  upperBeak: V(`<defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6F4F"/><stop offset="0.6" stop-color="#E53935"/><stop offset="1" stop-color="#B71C1C"/></linearGradient></defs>
    <path d="M114 47C125 42 137 49 137 61C137 68 133 72 128 75C130 69 128 63 122 61C118 60 115 57 114 53Z" fill="url(#mk)"/>
    <path d="M120 47C127 47 132 51 133 56" stroke="#FFB199" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round"/>`),
  nearWing: V(`<defs><linearGradient id="mn" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#1FAE5E"/><stop offset="0.7" stop-color="#11834A"/><stop offset="1" stop-color="#2C7FB8"/></linearGradient></defs>
    <path d="M80 86C70 62 56 40 30 22C40 40 34 46 22 46C34 56 30 62 18 66C32 72 34 78 26 86C44 88 62 92 80 98Z" fill="url(#mn)"/>
    <path d="M76 88C62 72 48 58 34 50M74 92C58 82 44 76 30 76" stroke="#7CEBA5" stroke-width="1.3" fill="none" opacity="0.5"/>`),
};

/** One static picture of Mittu on a perch pose (app icon, store art). */
export function mittuStaticSvg(turban = false) {
  const inner = (s: string) => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return V([L.tail, L.feet, L.body, L.foldedWing, L.head, L.lowerBeak, L.upperBeak, ...(turban ? [L.turban] : [])].map(inner).join(''));
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
