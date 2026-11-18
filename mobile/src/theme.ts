import { Platform } from 'react-native';

// Mystical Indian Night (meeting brief 2026-11-17): velvety indigo to midnight purple (#090924 → #180E38), antique
// gold, saffron and emerald parrot green; frosted-glass cards with a thin gold edge.
export const colors = {
  bg: '#090924',
  surface: '#17113F',       // inputs
  card: 'rgba(255,255,255,0.05)',   // frosted glass (blurred on web, translucent on phones)
  border: 'rgba(212,175,55,0.30)',
  text: '#F6EEDB',
  textSecondary: '#CFC5AC',
  textTertiary: '#8F879E',
  accent: '#D4AF37',        // gold
  accentSoft: 'rgba(212,175,55,0.14)',
  onAccent: '#1B1240',
  danger: '#FF7A7A',
  success: '#2ECC71',
};

export const scene = {
  night: '#090924',
  night2: '#180E38',
  gold: '#D4AF37',
  goldSoft: '#F3DC8A',
  saffron: '#FF9933',
  emerald: '#2ECC71',
  text: '#F6EEDB',
};

// Fonts (brief): Cinzel for display titles, Poppins for UI, Tiro Devanagari Hindi for Hindi script. Loaded in
// app/_layout.tsx; on Android a custom font needs the weight in its family name, so use these names, not fontWeight.
export const fonts = {
  display: 'Cinzel_700Bold',
  displayRegular: 'Cinzel_600SemiBold',
  ui: 'Poppins_400Regular',
  uiMedium: 'Poppins_500Medium',
  uiBold: 'Poppins_600SemiBold',
  hindi: 'TiroDevanagariHindi_400Regular',
};
/** Display titles (kept as `serif` so older screens pick up Cinzel without changes). */
export const serif = fonts.display;
/** Frosted-glass card: translucent with a 1 px gold edge; real backdrop blur where the platform supports it (web). */
export const glass = {
  backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
} as const;

export const shadow = { boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' };
export const glow = { boxShadow: '0 0 16px rgba(212, 175, 55, 0.45)' };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };

export const type = {
  largeTitle: { fontSize: 28, lineHeight: 36, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.4 },
  title: { fontSize: 20, fontFamily: fonts.uiBold, color: colors.text },
  headline: { fontSize: 16, fontFamily: fonts.uiBold, color: colors.text },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.ui, color: colors.text },
  callout: { fontSize: 15, lineHeight: 22, fontFamily: fonts.ui, color: colors.text },
  subhead: { fontSize: 14, lineHeight: 20, fontFamily: fonts.ui, color: colors.textSecondary },
  footnote: { fontSize: 12, lineHeight: 17, fontFamily: fonts.ui, color: colors.textSecondary },
};
