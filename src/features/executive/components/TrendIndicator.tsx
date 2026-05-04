import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';

interface Props {
  delta: number;
  /** When higher = better (default). Set false for metrics like "overdue tasks" where lower is better. */
  positiveIsGood?: boolean;
  suffix?: string;
  fontSize?: number;
}

/**
 * Compact trend pill: ▲ +5% or ▼ -3
 * Color-coded by whether the delta is positive (green/red) based on metric direction.
 */
const TrendIndicator: React.FC<Props> = ({ delta, positiveIsGood = true, suffix = '', fontSize = 11 }) => {
  const { colors, fontFamily } = useTheme();

  if (delta === 0) {
    return (
      <View style={[styles.pill, { backgroundColor: colors.divider }]}>
        <Text style={[styles.text, { color: colors.textMuted, fontFamily, fontSize }]}>
          ━ 0{suffix}
        </Text>
      </View>
    );
  }

  const isUp = delta > 0;
  const isGood = positiveIsGood ? isUp : !isUp;
  const accent = isGood ? colors.success : colors.danger;
  const arrow = isUp ? '▲' : '▼';

  return (
    <View style={[styles.pill, { backgroundColor: accent + '20' }]}>
      <Text style={[styles.text, { color: accent, fontFamily, fontSize }]}>
        {arrow} {isUp ? '+' : ''}{delta}{suffix}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '700' },
});

export default TrendIndicator;
