import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
}

/**
 * Shimmer-animated placeholder block for loading states.
 * Use multiple stacked instances to mimic the real card layout.
 */
const SkeletonBlock: React.FC<Props> = ({ width = '100%', height = 16, radius = 8, style }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.divider,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface CockpitSkeletonProps {
  cardBg: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

const CockpitSkeleton: React.FC<CockpitSkeletonProps> = ({
  cardBg,
  borderRadius,
  borderWidth,
  borderColor,
}) => {
  const cardStyle = {
    backgroundColor: cardBg,
    borderRadius,
    borderWidth,
    borderColor,
    padding: 16,
    marginBottom: 12,
  };

  return (
    <View style={styles.container}>
      {/* Approvals at a glance skeleton */}
      <View style={styles.section}>
        <SkeletonBlock width={140} height={12} style={{ marginBottom: 12 }} />
        <View style={cardStyle}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <SkeletonBlock width={60} height={32} style={{ marginBottom: 6 }} />
              <SkeletonBlock width={120} height={14} />
            </View>
            <SkeletonBlock width={24} height={24} radius={12} />
          </View>
          <View style={[styles.row, { marginTop: 16, gap: 8 }]}>
            <SkeletonBlock width={80} height={24} radius={6} />
            <SkeletonBlock width={80} height={24} radius={6} />
          </View>
        </View>
      </View>

      {/* KPI cards skeleton */}
      <View style={styles.section}>
        <SkeletonBlock width={140} height={12} style={{ marginBottom: 12 }} />
        {[0, 1].map((i) => (
          <View key={i} style={cardStyle}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="80%" height={16} style={{ marginBottom: 8 }} />
                <SkeletonBlock width="40%" height={12} />
              </View>
              <SkeletonBlock width={56} height={56} radius={28} />
            </View>
            <View style={[styles.row, { marginTop: 16, justifyContent: 'space-around' }]}>
              {[0, 1, 2, 3].map((j) => (
                <View key={j} style={{ alignItems: 'center', gap: 6 }}>
                  <SkeletonBlock width={30} height={16} />
                  <SkeletonBlock width={50} height={10} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Team pulse skeleton */}
      <View style={styles.section}>
        <SkeletonBlock width={100} height={12} style={{ marginBottom: 12 }} />
        <View style={cardStyle}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.row, { paddingVertical: 12 }]}>
              <View style={[styles.row, { flex: 1, gap: 12 }]}>
                <SkeletonBlock width={20} height={20} radius={10} />
                <SkeletonBlock width={120} height={14} />
              </View>
              <SkeletonBlock width={30} height={18} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 20 },
  section: { marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default CockpitSkeleton;
export { SkeletonBlock };
