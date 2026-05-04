import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';
import SkeletonBlock from './SkeletonBlock';

const ROWS = 6;

const ApprovalsInboxSkeleton: React.FC = () => {
  const { colors, shadows } = useTheme();

  return (
    <View style={styles.wrap} accessibilityLabel="Loading approvals">
      {Array.from({ length: ROWS }).map((_, i) => (
        <View
          key={`ap-sk-${i}`}
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider },
          ]}
        >
          <View style={styles.row}>
            <SkeletonBlock width={40} height={40} borderRadius={12} />
            <View style={styles.body}>
              <View style={styles.pillLine}>
                <SkeletonBlock width={96} height={22} borderRadius={8} />
                <SkeletonBlock width={64} height={22} borderRadius={8} />
              </View>
              <SkeletonBlock width="100%" height={15} borderRadius={4} style={{ marginTop: 10 }} />
              <SkeletonBlock width="55%" height={13} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, gap: 10 },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  body: { flex: 1, minWidth: 0 },
  pillLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

export default ApprovalsInboxSkeleton;
