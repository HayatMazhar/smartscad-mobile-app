/**
 * iOS-native blurred tab bar background.
 *
 * On iOS we render an `expo-blur` `BlurView` filling the tab bar area
 * to mimic UITabBar's `UIVisualEffectView` chrome material. We pair it
 * with a faint surface tint so the tab bar still has a discernible
 * background even when there's no underlying content to blur (e.g.
 * empty list states, plain backgrounds). The hairline top border is
 * applied by the navigator's `tabBarStyle.borderTopColor`.
 *
 * On Android we return `null`; React Navigation falls back to the
 * navigator's `tabBarStyle.backgroundColor`, which is the brand
 * surface set in `MainTabNavigator`. Material 3 elevation and our
 * existing styling already provide the right feel there.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../app/theme/ThemeContext';

const TabBarBackground: React.FC = () => {
  const { colors, isDark } = useTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(20,22,26,0.55)'
              : 'rgba(255,255,255,0.55)',
          },
        ]}
      />
      <View
        style={[
          styles.hairline,
          { backgroundColor: colors.divider },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});

export default TabBarBackground;
