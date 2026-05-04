import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';

type Props = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Subtle pulse placeholder (no extra dependencies). */
const SkeletonBlock: React.FC<Props> = ({ width, height, borderRadius = 8, style }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.38)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.72, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.38, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.greyCard,
          opacity,
        },
        style,
      ]}
    />
  );
};

export default SkeletonBlock;
