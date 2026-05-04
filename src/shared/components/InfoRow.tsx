import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export type InfoRowVariant = 'kv' | 'iconDetail';

export interface InfoRowProps {
  label: string;
  value?: string | null;
  /** `iconDetail`: emoji + stacked label/value (portal event cards, etc.). Default `kv` = label | value row. */
  variant?: InfoRowVariant;
  /** Required when variant is `iconDetail`. */
  icon?: string;
  /** When true, row is not rendered if value is empty (Ticket detail parity). */
  hideWhenEmpty?: boolean;
  /** Shown when value is empty and hideWhenEmpty is false. Default '—'. */
  emptyLabel?: string;
  valueNumberOfLines?: number;
  /** Max width fraction for value column (default web-style ~55%). `kv` only. */
  valueMaxWidth?: `${number}%`;
  testID?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  variant = 'kv',
  icon,
  hideWhenEmpty = false,
  emptyLabel = '—',
  valueNumberOfLines = 1,
  valueMaxWidth = '55%',
  testID,
}) => {
  const { colors } = useTheme();
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : '';
  if (hideWhenEmpty && !raw) return null;
  const shown = raw || emptyLabel;

  if (variant === 'iconDetail') {
    return (
      <View style={styles.iconDetailRow} testID={testID}>
        <Text style={styles.iconDetailEmoji}>{icon ?? '•'}</Text>
        <View style={styles.iconDetailBody}>
          <Text style={[styles.iconDetailLabel, { color: colors.textMuted }]}>{label}</Text>
          <Text
            style={[styles.iconDetailValue, { color: colors.text }]}
            numberOfLines={valueNumberOfLines}
          >
            {shown}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]} testID={testID}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.value, { color: colors.text, maxWidth: valueMaxWidth as any }]}
        numberOfLines={valueNumberOfLines}
      >
        {shown}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '600', textAlign: 'right' },

  iconDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  iconDetailEmoji: { fontSize: 18 },
  iconDetailBody: { flex: 1, marginLeft: 10 },
  iconDetailLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  iconDetailValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});

export default InfoRow;
