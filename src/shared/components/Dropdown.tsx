import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Platform, TextInput,
} from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export type DropdownOption<V = string | number> = {
  value: V;
  label: string;
  sublabel?: string;
  icon?: string;          // emoji or short glyph rendered before the label
};

type Props<V extends string | number> = {
  label?: string;
  value: V | null | undefined;
  onChange: (value: V, option: DropdownOption<V>) => void;
  options: DropdownOption<V>[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
};

/**
 * Dropdown — tap-to-open selector that works on web and native.
 * Opens a centered Modal overlay containing a scrollable, optionally
 * searchable list of options. Built on RN primitives only; no native deps.
 */
function Dropdown<V extends string | number>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable,
  disabled,
}: Props<V>) {
  const { colors, radii, shadows } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => !disabled && setOpen(true)}
        style={[styles.field, {
          borderColor: open ? colors.primary : colors.border,
          backgroundColor: colors.card,
          borderRadius: radii?.md ?? 8,
          opacity: disabled ? 0.5 : 1,
        }]}
      >
        {selected?.icon ? <Text style={styles.fieldIcon}>{selected.icon}</Text> : null}
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { color: selected ? colors.text : colors.textMuted }]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={[styles.chev, { color: colors.textMuted }]}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <TouchableOpacity activeOpacity={1} onPress={() => { /* eat clicks */ }}
            style={[styles.sheet, shadows.card, { backgroundColor: colors.card, borderRadius: radii?.lg ?? 12 }]}>
            {label ? <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text> : null}
            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={colors.textMuted}
                style={[styles.search, { borderColor: colors.border, color: colors.text, borderRadius: radii?.md ?? 8 }]}
              />
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.divider }]} />}
              renderItem={({ item }) => {
                const active = selected?.value === item.value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { onChange(item.value, item); close(); }}
                    style={[styles.row, active ? { backgroundColor: `${colors.primary}14` } : null]}
                  >
                    {item.icon ? <Text style={styles.rowIcon}>{item.icon}</Text> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: active ? colors.primary : colors.text }]}>{item.label}</Text>
                      {item.sublabel ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{item.sublabel}</Text> : null}
                    </View>
                    {active ? <Text style={[styles.check, { color: colors.primary }]}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>No options</Text>
                </View>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  fieldIcon: { fontSize: 18, marginRight: 8 },
  fieldText: { flex: 1, fontSize: 14, fontWeight: '500' },
  chev: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0 } : null),
  },
  sheet: {
    width: '100%', maxWidth: 460,
    paddingTop: 16, paddingBottom: 8,
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', paddingHorizontal: 16, marginBottom: 10 },
  search: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginHorizontal: 16, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  rowIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  check: { fontSize: 16, fontWeight: '900' },
  sep: { height: StyleSheet.hairlineWidth },
});

export default Dropdown;
