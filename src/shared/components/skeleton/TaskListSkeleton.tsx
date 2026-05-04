import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';
import SkeletonBlock from './SkeletonBlock';

const ROWS = 6;

const TaskListSkeleton: React.FC = () => {
  const { colors, shadows } = useTheme();

  return (
    <View style={styles.wrap} accessibilityLabel="Loading tasks">
      {Array.from({ length: ROWS }).map((_, i) => (
        <View
          key={`tsk-sk-${i}`}
          style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        >
          <View style={styles.topRow}>
            <SkeletonBlock width={100} height={12} borderRadius={4} />
            <SkeletonBlock width={72} height={22} borderRadius={10} />
          </View>
          <SkeletonBlock width="100%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
          <SkeletonBlock width="78%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
          <View style={styles.metaRow}>
            <SkeletonBlock width={88} height={26} borderRadius={12} />
            <SkeletonBlock width={40} height={14} borderRadius={4} />
          </View>
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <SkeletonBlock width="42%" height={12} borderRadius={4} />
            <SkeletonBlock width="36%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  card: { borderRadius: 12, padding: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default TaskListSkeleton;
