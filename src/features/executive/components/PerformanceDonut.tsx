import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface Props {
  performance: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
  textColor: string;
  fontFamily?: string;
}

/**
 * Circular progress ring showing performance percentage.
 * Used on KPI cards in the executive cockpit.
 */
const PerformanceDonut: React.FC<Props> = ({
  performance,
  size = 56,
  strokeWidth = 6,
  trackColor,
  progressColor,
  textColor,
  fontFamily,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, performance));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.textWrap}>
          <Text style={[styles.percent, { color: textColor, fontFamily }]}>
            {Math.round(clamped)}
            <Text style={[styles.percentSign, { color: textColor }]}>%</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 14, fontWeight: '700' },
  percentSign: { fontSize: 9, fontWeight: '600' },
});

export default PerformanceDonut;
