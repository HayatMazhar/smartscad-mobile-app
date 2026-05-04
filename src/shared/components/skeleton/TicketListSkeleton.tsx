import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';
import SkeletonBlock from './SkeletonBlock';

const ROWS = 5;

const TicketListSkeleton: React.FC = () => {
  const { colors, shadows } = useTheme();

  return (
    <View style={styles.wrap} accessibilityLabel="Loading tickets">
      {Array.from({ length: ROWS }).map((_, i) => (
        <View
          key={`tkt-sk-${i}`}
          style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        >
          <View style={styles.header}>
            <SkeletonBlock width={72} height={28} borderRadius={8} />
            <View style={{ flex: 1 }} />
            <SkeletonBlock width={120} height={26} borderRadius={12} />
          </View>
          <SkeletonBlock width="100%" height={15} borderRadius={4} style={{ marginTop: 10 }} />
          <SkeletonBlock width="65%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonBlock width="90%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <SkeletonBlock width={80} height={11} borderRadius={4} />
            <SkeletonBlock width={100} height={11} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 32, gap: 8 },
  card: { borderRadius: 14, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default TicketListSkeleton;
