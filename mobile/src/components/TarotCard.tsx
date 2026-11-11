// A tarot card: ornate back, illustrated face, 3D Y-axis flip (guide 07). Rendered at full size and scaled by the
// parent while it sits in the fan, so the face stays sharp when it grows to centre stage.
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { CardInfo } from '@/api/mittu';
import { CARD_ART, CARD_DEFS, cardBackMarkup } from '@/data/cardArt';
import { scene, serif } from '@/theme';

const BACK_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 480"><defs>${CARD_DEFS}</defs>${cardBackMarkup()}</svg>`;
const artXml = (id: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CARD_ART[id]}</g></svg>`;

export function CardFace({ card, reversed, width }: { card: CardInfo; reversed: boolean; width: number }) {
  const u = width / 300;
  return (
    <View style={[styles.face, { borderRadius: 20 * u }]}>
      <View style={[StyleSheet.absoluteFill, { margin: 10 * u, borderWidth: 3 * u, borderColor: scene.gold, borderRadius: 14 * u }]} />
      <View style={[StyleSheet.absoluteFill, { margin: 20 * u, borderWidth: 1.2 * u, borderColor: 'rgba(212,175,55,0.7)', borderRadius: 10 * u }]} />
      {/* Reversed cards are shown upside down (guide 06). */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingVertical: 30 * u, paddingHorizontal: 26 * u },
        reversed && { transform: [{ rotate: '180deg' }] }]}>
        <Text style={{ fontFamily: serif, fontWeight: '700', color: scene.gold, fontSize: 26 * u }}>{roman(card.id)}</Text>
        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 220 * u, height: 220 * u, borderRadius: 110 * u, backgroundColor: 'rgba(255,153,51,0.10)' }} />
          <SvgXml xml={artXml(card.id)} width={230 * u} height={230 * u} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit
          style={{ fontFamily: serif, fontWeight: '700', color: scene.goldSoft, fontSize: 21 * u, letterSpacing: 1.5 * u, textTransform: 'uppercase' }}>
          {card.name}
        </Text>
        <View style={{ width: '50%', height: StyleSheet.hairlineWidth * 2, backgroundColor: scene.gold, marginVertical: 8 * u, opacity: 0.8 }} />
        <Text style={{ color: scene.saffron, fontSize: 25 * u }}>{card.hindiScript}</Text>
      </View>
    </View>
  );
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const roman = (id: number) => ROMAN[id] ?? '';

export function CardBack({ width }: { width: number }) {
  return <SvgXml xml={BACK_XML} width={width} height={width * 1.6} />;
}

/** `flip` goes 0 (back showing) → 180 (face showing). The face swaps in at 90°, so it works the same on every
 *  platform (no reliance on backfaceVisibility). */
export function FlipCard({ card, reversed, width, flip }: { card: CardInfo | null; reversed: boolean; width: number; flip: SharedValue<number> }) {
  const height = width * 1.6;
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 90 ? 1 : 0,
    transform: [{ perspective: width * 5 }, { rotateY: `${flip.value}deg` }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 90 ? 1 : 0,
    transform: [{ perspective: width * 5 }, { rotateY: `${interpolate(flip.value, [90, 180], [-90, 0], 'clamp')}deg` }],
  }));
  return (
    <View style={{ width, height }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: width * 0.066 }, backStyle]}>
        <CardBack width={width} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: width * 0.066 }, faceStyle]}>
        {card ? <CardFace card={card} reversed={reversed} width={width} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { flex: 1, overflow: 'hidden', backgroundColor: '#1A1250' },
  glow: { boxShadow: '0 0 18px rgba(212,175,55,0.45)', overflow: 'hidden' },
});
