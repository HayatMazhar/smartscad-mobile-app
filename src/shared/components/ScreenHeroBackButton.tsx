import React from 'react';
import {
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/theme/ThemeContext';
import type { AppColors } from '../../app/theme/colors';

export type ScreenHeroBackLayout = 'hero' | 'fullscreen' | 'inline';

/** Shared pill surface for hero / org headers (matches stack header light vs dark hero). */
export function heroHeaderPillSurface(colors: AppColors): string {
  const onDarkHero = colors.stackStatusBar === 'light-content';
  return onDarkHero ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
}

export interface ScreenHeroBackButtonProps {
  onPress: () => void;
  /**
   * hero — fixed offset inside a tall coloured hero (Employee / Star winner).
   * fullscreen — below status bar on a plain background (loading / error).
   * inline — no absolute positioning; first control in a horizontal header row (Org chart).
   */
  layout?: ScreenHeroBackLayout;
  /** Optional style merged onto the touchable (e.g. zIndex). */
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * One consistent circular back control for screens that hide the native stack
 * header (`headerShown: false`) and draw a custom hero. Matches native-stack
 * tint via `stackHeaderTint` / `stackStatusBar` rules across light & dark heroes.
 */
const ScreenHeroBackButton: React.FC<ScreenHeroBackButtonProps> = ({
  onPress,
  layout = 'hero',
  style,
  accessibilityLabel = 'Go back',
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const surface = heroHeaderPillSurface(colors);

  if (layout === 'inline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.75}
        style={[styles.hit, { backgroundColor: surface }, style]}
      >
        <Text style={[styles.backGlyph, { color: colors.stackHeaderTint }]}>‹</Text>
      </TouchableOpacity>
    );
  }

  const top =
    layout === 'fullscreen'
      ? Math.max(insets.top + (Platform.OS === 'ios' ? 4 : 8), 12)
      : 50;
  const start = 14;
  const pos: ViewStyle = I18nManager.isRTL
    ? { position: 'absolute', top, right: start, left: undefined }
    : { position: 'absolute', top, left: start, right: undefined };

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.75}
      style={[styles.hit, pos, { backgroundColor: surface }, style]}
    >
      <Text style={[styles.backGlyph, { color: colors.stackHeaderTint }]}>‹</Text>
    </TouchableOpacity>
  );
};

/** Same chrome as back, for expand / filter icons in a hero header row (Org chart). */
export function ScreenHeroHeaderIconButton({
  onPress,
  children,
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const surface = heroHeaderPillSurface(colors);
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.75}
      style={[styles.hit, { backgroundColor: surface }, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Default text style for ⊞ / ⊟ etc. inside `ScreenHeroHeaderIconButton`. */
export const screenHeroHeaderActionText = (tint: string): TextStyle => ({
  color: tint,
  fontSize: 18,
  fontWeight: '800',
  includeFontPadding: false,
});

const styles = StyleSheet.create({
  hit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backGlyph: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4,
    includeFontPadding: false,
  },
});

export default ScreenHeroBackButton;
