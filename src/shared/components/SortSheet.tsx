import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Generic "Sort" bottom sheet used across the More-section listing screens
 * (News, Events, Announcements, Circulars, FAQs, Offers, Directory,
 * Recognition, Projects, Ideas, etc.). Each screen defines its own
 * SortKey literal type and an ordered list of options; this component
 * just renders them and fires back the key the user picked.
 *
 * Pairs with the small `SortTriggerButton` below which each screen can
 * drop into its header / action bar.
 */
export interface SortOption<K extends string = string> {
  key: K;
  label: string;
  icon?: string;
}

interface SortSheetProps<K extends string = string> {
  visible: boolean;
  onClose: () => void;
  options: SortOption<K>[];
  activeKey: K;
  onPick: (key: K) => void;
  title?: string;
  colors: any;
  shadows?: any;
}

export function SortSheet<K extends string = string>({
  visible, onClose, options, activeKey, onPick, title, colors, shadows,
}: SortSheetProps<K>) {
  const active = options.find((o) => o.key === activeKey) ?? options[0];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, shadows?.card, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {title ?? 'Sort by'} · <Text style={{ color: colors.primary }}>{active?.label?.split('—')[0].trim() ?? ''}</Text>
          </Text>
          {options.map((o) => {
            const isActive = o.key === activeKey;
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.sheetRow, { backgroundColor: isActive ? `${colors.primary}15` : 'transparent' }]}
                onPress={() => { onPick(o.key); onClose(); }}
                activeOpacity={0.7}
              >
                {o.icon ? <Text style={styles.sheetRowIcon}>{o.icon}</Text> : null}
                <Text style={[styles.sheetRowText, { color: isActive ? colors.primary : colors.text, fontWeight: isActive ? '800' : '500' }]}>
                  {o.label}
                </Text>
                {isActive ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Compact icon button that opens the SortSheet. */
export const SortTriggerButton: React.FC<{
  onPress: () => void;
  colors: any;
  label?: string;
  compact?: boolean;
}> = ({ onPress, colors, label = 'Sort', compact = false }) => {
  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.triggerCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.triggerIcon, { color: colors.text }]}>⇅</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={[styles.triggerIcon, { color: colors.text }]}>⇅</Text>
      <Text style={[styles.triggerLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * Generic comparator for any row shape. Each sort "direction" maps to a
 * getter that returns the value to compare. Values can be string, number,
 * date, or null; nulls always sort to the end.
 */
export function sortRowsBy<T>(
  rows: T[],
  direction: 'asc' | 'desc',
  getter: (r: T) => string | number | Date | null | undefined,
): T[] {
  const mul = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = getter(a);
    const bv = getter(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * mul;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });
}

/** Safe date parse → Date | null (handles ISO / SQL CONVERT 120 / yyyy-MM-dd). */
export const toDate = (v?: string | Date | null): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginVertical: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10 },
  sheetRowIcon: { fontSize: 17 },
  sheetRowText: { flex: 1, fontSize: 14 },
  sheetCheck: { fontSize: 16, fontWeight: '900' },

  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1,
  },
  triggerCompact: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  triggerIcon: { fontSize: 15, fontWeight: '900' },
  triggerLabel: { fontSize: 13, fontWeight: '700' },
});

export default SortSheet;
