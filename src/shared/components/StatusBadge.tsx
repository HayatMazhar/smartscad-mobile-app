import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  label: string;
  backgroundColor: string;
  textColor: string;
  size?: StatusBadgeSize;
  numberOfLines?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  backgroundColor,
  textColor,
  size = 'sm',
  numberOfLines = 1,
  style,
  textStyle,
  testID,
}) => {
  const pad = size === 'md' ? styles.padMd : styles.padSm;
  const fontSize = size === 'md' ? 12 : 11;
  return (
    <View style={[styles.wrap, pad, { backgroundColor }, style]} testID={testID}>
      <Text style={[styles.text, { color: textColor, fontSize }, textStyle]} numberOfLines={numberOfLines}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    maxWidth: 180,
  },
  padSm: { paddingHorizontal: 10, paddingVertical: 4 },
  padMd: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontWeight: '700' },
});

export default StatusBadge;
