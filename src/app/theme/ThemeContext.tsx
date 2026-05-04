import React, { createContext, useContext, useMemo } from 'react';
import { useAppSelector } from '../../store/store';
import { lightColors, darkColors, brand, AppColors } from './colors';
import { spacing, radii, shadows as baseShadowsFromSpacing, typography as baseTypography } from './spacing';
import { getLightPalette } from './palettes';
import { getThemeSkin, getShadowsForSkin, type ThemeSkin } from './themeSkins';
import { scaleTypography } from './typographyScale';
import { resolveUiFontFamily } from './fontFamilyResolve';
import { FONT_SIZE_STEPS } from '../settings/themePreferencesTypes';
import type { ColorPaletteId, FontFamilyId, FontSizeStep } from '../settings/themePreferencesTypes';

type Typography = typeof baseTypography;
type Shadows = typeof baseShadowsFromSpacing;

interface ThemeContextType {
  colors: AppColors;
  brand: typeof brand;
  spacing: typeof spacing;
  radii: typeof radii;
  /** Light-skin–aware (card shadow, borders); use with `skin.cardRadius` in screens. */
  shadows: Shadows;
  /** Per color story: emoji vs line icons, card shape, tab pattern. */
  skin: ThemeSkin;
  typography: Typography;
  isDark: boolean;
  /** UI body font (use on Text for settings-driven family) */
  fontFamily?: string;
  fontScale: number;
  colorPaletteId: ColorPaletteId;
  fontSizeStep: FontSizeStep;
  fontFamilyId: FontFamilyId;
}

const defaults: ThemeContextType = {
  colors: lightColors,
  brand,
  spacing,
  radii,
  shadows: baseShadowsFromSpacing,
  skin: getThemeSkin('scadVibrant'),
  typography: baseTypography,
  isDark: false,
  fontFamily: undefined,
  fontScale: 1,
  colorPaletteId: 'scadVibrant',
  fontSizeStep: 'default',
  fontFamilyId: 'system',
};

const ThemeContext = createContext<ThemeContextType>(defaults);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppSelector((state) => state.auth.theme);
  const { colorPaletteId, fontSizeStep, fontFamilyId } = useAppSelector((s) => s.uiPreferences);
  const isDark = theme === 'dark';

  const colors = isDark ? darkColors : getLightPalette(colorPaletteId);
  const skin = getThemeSkin(colorPaletteId);
  const shadows = useMemo(() => getShadowsForSkin(skin, isDark) as Shadows, [skin, isDark]);
  const scale = FONT_SIZE_STEPS.find((f) => f.key === fontSizeStep)?.scale ?? 1;
  const fontFamily = resolveUiFontFamily(fontFamilyId);

  const typography = useMemo(() => {
    return scaleTypography(baseTypography, scale);
  }, [scale]);

  const value: ThemeContextType = useMemo(
    () => ({
      colors,
      brand,
      spacing,
      radii,
      shadows,
      skin,
      typography,
      isDark,
      fontFamily,
      fontScale: scale,
      colorPaletteId,
      fontSizeStep,
      fontFamilyId,
    }),
    [colors, shadows, skin, typography, isDark, fontFamily, scale, colorPaletteId, fontSizeStep, fontFamilyId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
