import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';

interface Props {
  colors: string[];
  style?: ViewStyle;
  children?: React.ReactNode;
}

const LinearGradientFallback: React.FC<Props> = ({ colors: gradientColors, style, children }) => (
  <View style={[{ backgroundColor: gradientColors[gradientColors.length - 1] }, style]}>
    {children}
  </View>
);

export default LinearGradientFallback;
