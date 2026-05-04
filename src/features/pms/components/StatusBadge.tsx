import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Renders a colored pill for PMS workflow statuses.
 *
 * Status values come from the SP CASE expression — typical values:
 * `Approved`, `Submitted`, `Draft`, `Pending`, `Rejected`.
 */
export const StatusBadge: React.FC<{ status?: string | null; colors: any; size?: 'sm' | 'md' }> = ({
  status,
  colors,
  size = 'sm',
}) => {
  const s = (status ?? '').toLowerCase();
  let bg = `${colors.warning}20`;
  let fg = colors.warning;
  if (s.includes('approv')) {
    bg = `${colors.success}20`;
    fg = colors.success;
  } else if (s.includes('reject')) {
    bg = `${colors.danger}20`;
    fg = colors.danger;
  } else if (s.includes('submit')) {
    bg = `${colors.primary}20`;
    fg = colors.primary;
  } else if (s.includes('draft')) {
    bg = `${colors.textMuted}25`;
    fg = colors.textSecondary;
  }
  return (
    <View
      style={[
        styles.badge,
        size === 'md' && styles.badgeMd,
        { backgroundColor: bg },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'md' && styles.textMd,
          { color: fg },
        ]}
      >
        {status ?? '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  text: { fontSize: 10, fontWeight: '700' },
  textMd: { fontSize: 12 },
});

export default StatusBadge;
