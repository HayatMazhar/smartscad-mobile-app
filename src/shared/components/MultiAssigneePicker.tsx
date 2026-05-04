import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/theme/ThemeContext';
import type { AssignablePerson } from '../hooks/useAssignableReportingUsers';

type Props = {
  label?: string;
  /** Selected logins. The first item is silently sent to the backend as
   *  `AssignedTo` to satisfy the legacy schema, but the UI now treats every
   *  chip as equal — no LEAD badge, no promote arrow. */
  values: string[];
  onChange: (loginIds: string[]) => void;
  people: AssignablePerson[];
  isLoading?: boolean;
  /** When true, refuses to drop the last remaining selection. */
  requireOne?: boolean;
};

/**
 * Multi-select assignee picker (chip-based) that mirrors the web EPM Create form's
 * `UserID[]` multi-select. Stored values are login ids (`scad\\user`) so the SP
 * doesn't need to translate. The user complained that a "LEAD" concept was
 * confusing — every assignee is equal in EPM mobile, so the first-position
 * highlight has been removed.
 */
const MultiAssigneePicker: React.FC<Props> = ({
  label,
  values,
  onChange,
  people,
  isLoading,
  requireOne = true,
}) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const peopleById = useMemo(() => {
    const m = new Map<string, AssignablePerson>();
    people.forEach((p) => {
      if (p?.userId) m.set(p.userId.toLowerCase(), p);
    });
    return m;
  }, [people]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const selected = new Set(values.map((v) => v.toLowerCase()));
    const remaining = people.filter((p) => !selected.has((p.userId ?? '').toLowerCase()));
    if (!s) return remaining;
    return remaining.filter((p) => {
      const id = (p.userId || '').toLowerCase();
      const name = (p.displayName || '').toLowerCase();
      const jt = (p.jobTitle || '').toLowerCase();
      const dep = (p.department || '').toLowerCase();
      return id.includes(s) || name.includes(s) || jt.includes(s) || dep.includes(s);
    });
  }, [people, q, values]);

  const addUser = (userId: string) => {
    const norm = userId.trim();
    if (!norm) return;
    if (values.some((v) => v.toLowerCase() === norm.toLowerCase())) return;
    onChange([...values, norm]);
  };

  const removeUser = (userId: string) => {
    const next = values.filter((v) => v.toLowerCase() !== userId.toLowerCase());
    if (requireOne && next.length === 0) return; // refuse to drop the only assignee
    onChange(next);
  };

  return (
    <>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label ?? t('epm.assignedTo', 'Assigned To')}
      </Text>

      {/* Selected chips list */}
      <View style={styles.chipRow}>
        {values.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13 }}>
            {t('epm.noAssignees', 'No one chosen yet')}
          </Text>
        ) : (
          values.map((v) => {
            const p = peopleById.get(v.toLowerCase());
            const display = p?.displayName ?? v;
            const subtitle = p?.jobTitle ?? '';
            return (
              <View
                key={v}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.primaryLight ?? colors.greyCard ?? colors.background,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                    {display}
                  </Text>
                  {subtitle ? (
                    <Text style={[styles.chipSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => removeUser(v)} hitSlop={6}>
                  <Text style={[styles.chipRemove, { color: colors.primary }]}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <TouchableOpacity
        onPress={() => {
          setQ('');
          setOpen(true);
        }}
        activeOpacity={0.8}
        style={[
          styles.addBtn,
          shadows.card,
          { borderColor: colors.divider, backgroundColor: colors.greyCard ?? colors.background },
        ]}
      >
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
          {`+ ${t('epm.addAssignee', 'Add assignee')}${isLoading ? ' …' : ''}`}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent={Platform.OS === 'web'}
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.sheetBackdrop, Platform.OS !== 'web' && styles.sheetBackdropTint]}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {t('epm.pickAssignees', 'Add assignees')}
            </Text>
            <TextInput
              placeholder={t('common.search', 'Search')}
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              style={[
                styles.search,
                { borderColor: colors.divider, color: colors.text, backgroundColor: colors.background },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.userId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => addUser(item.userId)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.rowId, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.userId}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ padding: 16, color: colors.textMuted }}>
                  {t('common.noMatches', 'No matches')}
                </Text>
              }
            />
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.done', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    minHeight: 32,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 180,
  },
  chipSub: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 180,
    marginTop: 1,
  },
  chipRemove: {
    fontSize: 18,
    lineHeight: 18,
    paddingHorizontal: 4,
    fontWeight: '700',
  },
  addBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdropTint: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...(Platform.OS === 'web'
      ? { alignSelf: 'center', width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 12, marginVertical: '5%' }
      : {}),
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 10,
    fontSize: 14,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowId: { fontSize: 12, marginTop: 2 },
  closeBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
});

export default MultiAssigneePicker;
