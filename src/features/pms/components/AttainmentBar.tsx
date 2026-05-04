import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Linear attainment gauge used for KPI cards / detail views.
 *
 * Color rules (mirrors legacy KPIs view):
 *   ≥ 100% green
 *   ≥ 80%  primary blue
 *   <  80% danger red
 */
export const AttainmentBar: React.FC<{
  pct: number | null | undefined;
  colors: any;
  height?: number;
}> = ({ pct, colors, height = 8 }) => {
  const value = pct == null || Number.isNaN(Number(pct)) ? 0 : Math.max(0, Math.min(100, Number(pct)));
  let fill = colors.danger;
  if (value >= 100) fill = colors.success;
  else if (value >= 80) fill = colors.primary;

  return (
    <View>
      <View style={[styles.track, { backgroundColor: colors.greyCard, height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${value}%`,
              backgroundColor: fill,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: fill }]}>{value.toFixed(0)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%' },
  fill: {},
  label: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});

export default AttainmentBar;
