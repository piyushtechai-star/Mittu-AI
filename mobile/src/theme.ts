import { Platform } from 'react-native';

// Night theme (HouseofTech storyboard 2026-11-12): every screen is deep navy with gold, like the reading scene.
export const colors = {
  bg: '#0B0B2B',
  surface: '#17113F',       // inputs
  card: 'rgba(24,17,66,0.86)',
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
  night: '#0B0B2B',
  night2: '#1A1040',
  gold: '#D4AF37',
  goldSoft: '#F3DC8A',
  saffron: '#FF9933',
  emerald: '#2ECC71',
  text: '#F6EEDB',
};

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });

export const shadow = { boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' };
export const glow = { boxShadow: '0 0 16px rgba(212, 175, 55, 0.45)' };

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
