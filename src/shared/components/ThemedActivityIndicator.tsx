import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export type ThemedActivityIndicatorProps = {
  /**
   * 'small' ≈ 20dp  |  'large' ≈ 36dp  |  number = exact dp.
   * Matches the RN ActivityIndicator `size` prop signature.
   */
  size?: 'small' | 'large' | number;
  /** Spinner arc color — defaults to theme primary. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZE_MAP = { small: 20, large: 36 } as const;

/**
 * Cross-platform branded spinner.
 * Replaces every `<ActivityIndicator>` import so iOS and Android
 * render the same arc instead of iOS grey-spokes vs Android material arc.
 */
const ThemedActivityIndicator: React.FC<ThemedActivityIndicatorProps> = ({
  size = 'small',
  color,
  style,
}) => {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const spinColor = color ?? colors.primary;

  const dp = typeof size === 'number' ? size : SIZE_MAP[size];
  const strokeWidth = dp <= 22 ? 2.5 : 3.5;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={[
        {
          width: dp,
          height: dp,
          borderRadius: dp / 2,
          borderWidth: strokeWidth,
          borderColor: spinColor,
          borderBottomColor: 'transparent',
          transform: [{ rotate }],
        },
        style,
      ]}
    />
  );
};

export default ThemedActivityIndicator;
