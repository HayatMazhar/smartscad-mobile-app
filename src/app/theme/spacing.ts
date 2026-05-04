// Facelift spacing & design tokens for React Native

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  xs: 4,
  sm: 6,     // BS --bs-border-radius (0.375rem)
  md: 8,     // buttons, table headers, badges
  lg: 12,    // cards, inputs
  xl: 16,    // large cards, $b-radius SCSS token
  xxl: 20,   // sidebar corner
} as const;

export const shadows = {
  button: {
    shadowColor: 'rgb(128, 131, 144)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.075,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, includeFontPadding: false },
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, includeFontPadding: false },
  h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28, includeFontPadding: false },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, includeFontPadding: false },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, includeFontPadding: false },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, includeFontPadding: false },
  small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, includeFontPadding: false },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, includeFontPadding: false },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, includeFontPadding: false },
  captionBold: { fontSize: 13, fontWeight: '700' as const, lineHeight: 18, includeFontPadding: false },
  micro: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, includeFontPadding: false },
  badge: { fontSize: 12, fontWeight: '700' as const, lineHeight: 16, includeFontPadding: false },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
} as const;
