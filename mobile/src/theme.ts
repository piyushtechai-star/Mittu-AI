import { Platform } from 'react-native';

// Standard screens (guide 01): clean iOS-native look, white, neutrals, one accent colour (parrot green).
// The reading scene is the only immersive (dark, illustrated) screen; its colours are in `scene`.
export const colors = {
  bg: '#FFFFFF',
  surface: '#F4F5F3',
  card: '#FFFFFF',
  border: '#E6E8E5',
  text: '#121714',
  textSecondary: '#5D6661',
  textTertiary: '#98A09B',
  accent: '#17844B',        // parrot green, 4.7:1 on white (readable white text on it)
  accentSoft: '#E7F4EC',
  onAccent: '#FFFFFF',
  danger: '#C62828',
  success: '#17844B',
};

export const scene = {
  night: '#0B0B2B',
  night2: '#1A1040',
  gold: '#D4AF37',
  goldSoft: '#F3DC8A',
  saffron: '#FF9933',
  emerald: '#2ECC71',
  text: '#F6EEDB',
};

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });

export const shadow = { boxShadow: '0 2px 10px rgba(18, 23, 20, 0.06)' };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };

export const type = {
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.4 },
  title: { fontSize: 21, fontWeight: '700' as const, color: colors.text },
  headline: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  callout: { fontSize: 15, lineHeight: 21, color: colors.text },
  subhead: { fontSize: 14, lineHeight: 19, color: colors.textSecondary },
  footnote: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
};
