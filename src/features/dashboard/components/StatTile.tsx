import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';

// Reusable colored tile with icon, big value, sub-label. Mirrors the inline
// `KpiTile` from ExecutiveDashboardScreen but accepts an onPress + flexible
// value (string | number) so it can also drive deep-link navigation tiles
// (e.g. tap "Objectives" → PMS Hub).
export interface StatTileProps {
  icon?: string;
  label: string;
  value: string | number;
  foot?: string;
  tint?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, foot, tint, onPress, style }) => {
  const { colors } = useTheme();
  const t = tint ?? colors.primary;
  const Inner = (
    <View style={[
      styles.tile,
      { backgroundColor: `${t}15`, borderColor: `${t}30` },
      style,
    ]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.value, { color: t }]} numberOfLines={1}>
        {typeof value === 'number' ? String(value) : value}
      </Text>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      {foot ? (
        <Text style={[styles.foot, { color: colors.textMuted }]} numberOfLines={1}>{foot}</Text>
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touch}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
};

const styles = StyleSheet.create({
  touch: { flex: 1, margin: 4 },
  tile: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 78,
  },
  icon: { fontSize: 22, marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 12, fontWeight: '600' },
  foot: { fontSize: 11, marginTop: 2 },
});

export default StatTile;
