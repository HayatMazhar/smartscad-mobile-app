import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export type SanadkomScreenLoaderProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Size of the spinner ring in dp. Defaults to 40. */
  size?: number;
  /** Ring stroke width in dp. Defaults to 3.5. */
  strokeWidth?: number;
  /** Override the spinner color (defaults to theme primary). */
  color?: string;
};

/**
 * Branded circular spinner — identical look on iOS and Android.
 * Uses a rotating arc (View with borderRadius + selective border) so it
 * never falls back to the platform's native ActivityIndicator, which
 * renders differently on iOS (grey spokes) vs Android (material arc).
 */
const SanadkomScreenLoader: React.FC<SanadkomScreenLoaderProps> = ({
  style,
  testID,
  size = 40,
  strokeWidth = 3.5,
  color,
}) => {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const spinColor = color ?? colors.primary;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.center, style]} testID={testID}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: spinColor,
          // Hide the bottom ~25% to create an open-arc effect
          borderBottomColor: 'transparent',
          transform: [{ rotate }],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
});

export default SanadkomScreenLoader;
