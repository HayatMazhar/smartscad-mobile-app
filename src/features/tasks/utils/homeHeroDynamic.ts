import { Platform, TextStyle, ViewStyle } from 'react-native';
import type { HeroBannerSize } from '../../../app/settings/homeLayoutTypes';

/** Full hero layout tokens — colors come from `ThemeContext` / `AppColors` (homeHero*). */
export function getHeroLayout(size: HeroBannerSize): {
  hero: ViewStyle;
  greeting: TextStyle;
  name: TextStyle;
  role: TextStyle;
  bell: ViewStyle;
  bellIcon: TextStyle;
  heroTop: ViewStyle;
  accent1: ViewStyle;
  accent2: ViewStyle;
  bellBadge: ViewStyle;
  bellBadgeText: TextStyle;
  avatarSize: number;
  avatarRadius: number;
} {
  const isWeb = Platform.OS === 'web';
  if (size === 'large') {
    return {
      hero: {
        paddingTop: isWeb ? 32 : 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      },
      heroTop: { marginBottom: 16, alignItems: 'flex-start' },
      accent1: { position: 'absolute', top: 0, right: -40, width: 200, height: 200, borderRadius: 100 },
      accent2: { position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: 75 },
      greeting: { fontSize: 14, fontWeight: '500' as const, marginBottom: 4 },
      name: { fontSize: 24, fontWeight: '800' as const, marginBottom: 2 },
      role: { fontSize: 13, fontWeight: '500' as const, marginTop: 0 },
      bell: { width: 44, height: 44, borderRadius: 14 },
      bellIcon: { fontSize: 20 },
      bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, borderWidth: 2 },
      bellBadgeText: { fontSize: 9, fontWeight: '900' as const },
      avatarSize: 44,
      avatarRadius: 14,
    };
  }
  if (size === 'compact') {
    return {
      hero: {
        paddingTop: isWeb ? 14 : 36,
        paddingBottom: 8,
        paddingHorizontal: 14,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      },
      heroTop: { marginBottom: 0, alignItems: 'center' },
      accent1: { position: 'absolute', top: -20, right: -24, width: 100, height: 100, borderRadius: 50 },
      accent2: { position: 'absolute', bottom: -16, left: -16, width: 72, height: 72, borderRadius: 36 },
      greeting: { fontSize: 11, marginBottom: 0 },
      name: { fontSize: 16, fontWeight: '800' as const },
      role: { fontSize: 10, marginTop: 0 },
      bell: { width: 36, height: 36, borderRadius: 10 },
      bellIcon: { fontSize: 16 },
      bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, borderWidth: 1.5 },
      bellBadgeText: { fontSize: 8, fontWeight: '900' as const },
      avatarSize: 36,
      avatarRadius: 10,
    };
  }
  return {
    hero: {
      paddingTop: isWeb ? 20 : 44,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    heroTop: { marginBottom: 0, alignItems: 'center' },
    accent1: { position: 'absolute', top: -24, right: -32, width: 120, height: 120, borderRadius: 60 },
    accent2: { position: 'absolute', bottom: -20, left: -20, width: 88, height: 88, borderRadius: 44 },
    greeting: { fontSize: 12, marginBottom: 2 },
    name: { fontSize: 18, fontWeight: '800' as const },
    role: { fontSize: 11, marginTop: 1 },
    bell: { width: 40, height: 40, borderRadius: 12 },
    bellIcon: { fontSize: 18 },
    bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, borderWidth: 1.5 },
    bellBadgeText: { fontSize: 8, fontWeight: '900' as const },
    avatarSize: 40,
    avatarRadius: 12,
  };
}
