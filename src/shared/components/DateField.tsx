import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Pressable,
} from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

type Props = {
  label?: string;
  value: string;                  // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;                   // 'YYYY-MM-DD'
  max?: string;                   // 'YYYY-MM-DD'
  disabled?: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISO(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatPretty(d: Date): string {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

const DateField: React.FC<Props> = ({ label, value, onChange, placeholder = 'Select date', min, max, disabled }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseISO(value), [value]);
  const minDate = useMemo(() => parseISO(min), [min]);
  const maxDate = useMemo(() => parseISO(max), [max]);

  // calendar view anchor month
  const [viewYear, setViewYear] = useState<number>(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => (selected ?? new Date()).getMonth());

  useEffect(() => {
    if (open) {
      const anchor = selected ?? new Date();
      setViewYear(anchor.getFullYear());
      setViewMonth(anchor.getMonth());
    }
  }, [open, selected]);

  const today = useMemo(() => new Date(), []);

  const grid = useMemo(() => {
    // 6-row calendar grid (42 cells) starting from Sunday
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay(); // 0..6
    const startDate = new Date(viewYear, viewMonth, 1 - startOffset);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const isDisabled = (d: Date) => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };

  const clear = () => { onChange(''); setOpen(false); };
  const useToday = () => {
    if (isDisabled(today)) return;
    onChange(toISO(today));
    setOpen(false);
  };

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
        <Text style={[styles.fieldIcon, { color: colors.primary }]}>📅</Text>
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { color: selected ? colors.text : colors.textMuted }]}
        >
          {selected ? formatPretty(selected) : placeholder}
        </Text>
        {selected ? (
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => { e.stopPropagation?.(); clear(); }}
            style={styles.clearBtn}
          >
            <Text style={[styles.clearX, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        ) : null}
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => { /* eat clicks */ }}
            style={[styles.sheet, shadows.card, { backgroundColor: colors.card, borderRadius: radii?.lg ?? 14 }]}
          >
            {/* Header: prev | Month Year | next */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
              <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: isDark ? colors.background : '#F1F5F9' }]}>
                <Text style={[styles.navBtnText, { color: colors.text }]}>‹</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.title, { color: colors.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              </View>
              <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: isDark ? colors.background : '#F1F5F9' }]}>
                <Text style={[styles.navBtnText, { color: colors.text }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <View key={i} style={styles.weekCell}>
                  <Text style={[styles.weekText, { color: colors.textMuted }]}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === viewMonth;
                const isSelected = selected ? sameDay(d, selected) : false;
                const isToday = sameDay(d, today);
                const dis = isDisabled(d);
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={dis}
                    activeOpacity={0.7}
                    onPress={() => pick(d)}
                    style={[
                      styles.cell,
                      isSelected && { backgroundColor: colors.primary },
                      !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[
                      styles.cellText,
                      {
                        color: isSelected
                          ? '#fff'
                          : dis
                          ? colors.textMuted
                          : inMonth
                          ? colors.text
                          : colors.textMuted,
                        opacity: !inMonth ? 0.35 : dis ? 0.4 : 1,
                        fontWeight: isSelected || isToday ? '800' : '500',
                      },
                    ]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer actions */}
            <View style={[styles.footer, { borderTopColor: colors.divider }]}>
              <TouchableOpacity onPress={clear} style={styles.footerBtn}>
                <Text style={[styles.footerBtnText, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={useToday} style={styles.footerBtn}>
                <Text style={[styles.footerBtnText, { color: colors.primary }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)} style={[styles.footerBtnPrimary, { backgroundColor: colors.primary }]}>
                <Text style={styles.footerBtnPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const CELL = 40;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },

  field: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  fieldIcon: { fontSize: 15 },
  fieldText: { flex: 1, fontSize: 14, fontWeight: '600' },
  clearBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  clearX: { fontSize: 13, fontWeight: '700' },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0 } : null),
  },
  sheet: {
    width: '100%', maxWidth: 360,
    paddingTop: 14, paddingBottom: 10,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { fontSize: 20, fontWeight: '800', lineHeight: 22 },
  title: { fontSize: 15, fontWeight: '800' },

  weekRow: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10 },
  weekCell: { width: CELL, alignItems: 'center', paddingVertical: 6 },
  weekText: { fontSize: 11, fontWeight: '700' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10, paddingBottom: 8,
  },
  cell: {
    width: CELL, height: CELL, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  cellText: { fontSize: 13 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  footerBtnText: { fontSize: 13, fontWeight: '700' },
  footerBtnPrimary: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  footerBtnPrimaryText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

export default DateField;
