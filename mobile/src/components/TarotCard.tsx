// A tarot card: ornate back, illustrated face, 3D Y-axis flip (guide 07).
// Face (meeting brief 2026-11-17): the authentic 1909 Rider-Waite-Smith illustration (public domain, Pamela Colman
// Smith; assets/cards/NN.webp, cropped and colour-graded to the night/gold palette) inside an ornate Indian gold frame,
// with the "XVII • The Star" / "Taara — तारा" titles (numeral + English, Hindi in Roman + Devanagari). Reversed cards are shown upside down with a
// small "Reversed" badge. Rendered at full size and scaled by the parent while it sits in the fan.
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { CardInfo } from '@/api/mittu';
import { CARD_DEFS, cardBackMarkup } from '@/data/cardArt';
import { fonts, scene } from '@/theme';

const BACK_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 480"><defs>${CARD_DEFS}</defs>${cardBackMarkup()}</svg>`;

export const CARD_IMAGES = [
  require('../../assets/cards/00.webp'), require('../../assets/cards/01.webp'), require('../../assets/cards/02.webp'),
  require('../../assets/cards/03.webp'), require('../../assets/cards/04.webp'), require('../../assets/cards/05.webp'),
  require('../../assets/cards/06.webp'), require('../../assets/cards/07.webp'), require('../../assets/cards/08.webp'),
  require('../../assets/cards/09.webp'), require('../../assets/cards/10.webp'), require('../../assets/cards/11.webp'),
  require('../../assets/cards/12.webp'), require('../../assets/cards/13.webp'), require('../../assets/cards/14.webp'),
  require('../../assets/cards/15.webp'), require('../../assets/cards/16.webp'), require('../../assets/cards/17.webp'),
  require('../../assets/cards/18.webp'), require('../../assets/cards/19.webp'), require('../../assets/cards/20.webp'),
  require('../../assets/cards/21.webp'),
];

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
export const roman = (id: number) => ROMAN[id] ?? '';

// Ornate Indian gold frame (viewBox 300 x 480): double rule, cusped arch over the picture, lotus corners.
const FRAME_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 480">
<rect x="5" y="5" width="290" height="470" rx="18" fill="none" stroke="#8E6A1E" stroke-width="6"/>
<rect x="5" y="5" width="290" height="470" rx="18" fill="none" stroke="#E9C866" stroke-width="2.5"/>
<rect x="14" y="14" width="272" height="452" rx="12" fill="none" stroke="#D4AF37" stroke-width="1.4" opacity="0.8"/>
<path d="M22 56 H112 Q126 56 132 44 Q150 26 168 44 Q174 56 188 56 H278" fill="none" stroke="#D4AF37" stroke-width="2.4"/>
<path d="M22 382 H278" stroke="#D4AF37" stroke-width="2.4"/>
<path d="M22 56 V382 M278 56 V382" stroke="#D4AF37" stroke-width="2.4"/>
${[[22, 56], [278, 56], [22, 382], [278, 382]].map(([x, y]) =>
    `<g transform="translate(${x} ${y})"><circle r="7" fill="#1A1250" stroke="#D4AF37" stroke-width="2"/><path d="M0 -4 Q3 0 0 4 Q-3 0 0 -4Z" fill="#FF9933"/></g>`).join('')}
${[[150, 400], [150, 466]].map(([x, y]) =>
    `<path d="M${x - 18} ${y} Q${x} ${y - 7} ${x + 18} ${y}" fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.7"/>`).join('')}
</svg>`;

export function CardFace({ card, reversed, width }: { card: CardInfo; reversed: boolean; width: number }) {
  const u = width / 300;
  return (
    <View style={[styles.face, { borderRadius: 20 * u }]}>
      <View style={[StyleSheet.absoluteFill, reversed && { transform: [{ rotate: '180deg' }] }]}>
        {/* the picture sits inside the frame's window (x 22-278, y 56-382 of 300 x 480) */}
        <Image source={CARD_IMAGES[card.id]} contentFit="cover" transition={0} accessibilityIgnoresInvertColors
          style={{ position: 'absolute', left: 22 * u, top: 56 * u, width: 256 * u, height: 326 * u }} />
        <SvgXml xml={FRAME_XML} width={width} height={width * 1.6} style={StyleSheet.absoluteFill as object} />
        <View style={{ position: 'absolute', top: 390 * u, left: 16 * u, right: 16 * u, alignItems: 'center' }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, color: scene.goldSoft,
            fontSize: 21 * u, letterSpacing: 1 * u }}>{roman(card.id)} • {card.name.toUpperCase()}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.hindi, color: scene.saffron,
            fontSize: 22 * u, marginTop: 6 * u }}>{card.hindi} — {card.hindiScript}</Text>
        </View>
      </View>
      {reversed ? (
        <View style={[styles.badge, { top: 64 * u, paddingHorizontal: 10 * u, paddingVertical: 3 * u, borderRadius: 10 * u }]}>
          <Text style={{ fontFamily: fonts.uiMedium, color: scene.goldSoft, fontSize: 13 * u }}>Reversed · Ulta</Text>
        </View>
      ) : null}
    </View>
  );
}

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
  face: { flex: 1, overflow: 'hidden', backgroundColor: '#140D3C' },
  glow: { boxShadow: '0 0 18px rgba(212,175,55,0.45)', overflow: 'hidden' },
  badge: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(9,9,36,0.85)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.7)' },
});
