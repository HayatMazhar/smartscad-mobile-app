import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ProgressBarProps {
  label: string;
  value: number;             // 0..100
  display?: string;           // optional override for the right-hand label, e.g. "55.17%"
  color: string;
  trackColor: string;
  textColor: string;
  showCap?: boolean;          // whether to clamp at 100% visually
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  display,
  color,
  trackColor,
  textColor,
  showCap = true,
}) => {
  const visual = showCap ? Math.max(0, Math.min(100, value)) : Math.max(0, value);
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color: textColor }]}>
          {display ?? `${value.toFixed(2)}%`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${visual}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '600', flex: 1, marginEnd: 8 },
  value: { fontSize: 13, fontWeight: '700' },
  track: {
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 6 },
});

export default ProgressBar;
