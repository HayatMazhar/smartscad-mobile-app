import type { ColorPaletteId } from '../settings/themePreferencesTypes';
import { shadows as baseShadows } from './spacing';

export type IconPresentation = 'emoji' | 'vector';
export type QuickAccessStyle = 'colorful' | 'professional';
export type PortalTabStyle = 'pill' | 'underline';
export type CardShadowLevel = 'default' | 'soft' | 'none';
export type GreetingMode = 'emoji' | 'icon' | 'text';
export type DonutPalette = 'vibrant' | 'tonal';

/**
 * Per color-palette visual language (icons, card chrome, tab patterns).
 * Colors still come from `palettes.ts` — this layer is shape + iconography + motion feel.
 */
export interface ThemeSkin {
  id: ColorPaletteId;
  label: string;
  iconPresentation: IconPresentation;
  quickAccessStyle: QuickAccessStyle;
  cardRadius: number;
  cardBorderWidth: number;
  cardShadow: CardShadowLevel;
  portalTabStyle: PortalTabStyle;
  heroGreeting: GreetingMode;
  performanceDonut: DonutPalette;
  /** false = hide dot under active tab, rely on solid vector icon */
  tabBarShowDot: boolean;
  tabIconSize: number;
  sectionTitleUppercase: boolean;
}

const skinScad: ThemeSkin = {
  id: 'scadVibrant',
  label: 'SCAD (demo)',
  iconPresentation: 'emoji',
  quickAccessStyle: 'colorful',
  cardRadius: 10,
  cardBorderWidth: 0,
  cardShadow: 'default',
  portalTabStyle: 'pill',
  heroGreeting: 'emoji',
  performanceDonut: 'vibrant',
  tabBarShowDot: true,
  tabIconSize: 20,
  sectionTitleUppercase: true,
};

/** Soft cards, red accent, outline icons, generous radius. */
const skinSoft: ThemeSkin = {
  id: 'govSoft',
  label: 'Government — soft',
  iconPresentation: 'vector',
  quickAccessStyle: 'professional',
  cardRadius: 16,
  cardBorderWidth: 0,
  cardShadow: 'soft',
  portalTabStyle: 'underline',
  heroGreeting: 'icon',
  performanceDonut: 'tonal',
  tabBarShowDot: false,
  tabIconSize: 24,
  sectionTitleUppercase: false,
};

/** AD blue: formal, line icons, soft lift, underline tabs. */
const skinAd: ThemeSkin = {
  id: 'govAbuDhabi',
  label: 'Government — Abu Dhabi',
  iconPresentation: 'vector',
  quickAccessStyle: 'professional',
  cardRadius: 12,
  cardBorderWidth: 1,
  cardShadow: 'soft',
  portalTabStyle: 'underline',
  heroGreeting: 'text',
  performanceDonut: 'tonal',
  tabBarShowDot: false,
  tabIconSize: 24,
  sectionTitleUppercase: false,
};

/**
 * Skin map. govAbuDhabi intentionally uses skinSoft so the home layout looks
 * identical to "Government — soft" — only the colour palette differs.
 */
const byId: Record<ColorPaletteId, ThemeSkin> = {
  scadVibrant: skinScad,
  govSoft: skinSoft,
  govAbuDhabi: skinSoft,
};

export function getThemeSkin(paletteId: ColorPaletteId): ThemeSkin {
  return byId[paletteId] ?? skinScad;
}

export function getShadowsForSkin(skin: ThemeSkin, isDark: boolean) {
  if (isDark) {
    return {
      ...baseShadows,
      card: {
        ...baseShadows.card,
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
      },
    } as const;
  }
  switch (skin.cardShadow) {
    case 'none':
      return {
        ...baseShadows,
        card: {
          ...baseShadows.card,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
      } as const;
    case 'soft':
      return {
        ...baseShadows,
        card: {
          ...baseShadows.card,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
      } as const;
    default:
      return baseShadows;
  }
}

export function getSectionTitleTransform(skin: ThemeSkin): 'uppercase' | 'none' {
  return skin.sectionTitleUppercase ? 'uppercase' : 'none';
}
