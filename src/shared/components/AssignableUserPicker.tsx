import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  value: string;
  onChange: (loginId: string) => void;
  people: AssignablePerson[];
  isLoading?: boolean;
};

/**
 * Assigned-to picker: shows reporting/project users from `useAssignableReportingUsers`.
 * Stored value remains the login id (`scad\\user`) matching EPM.SP / web behaviour.
 */
const AssignableUserPicker: React.FC<Props> = ({
  label,
  value,
  onChange,
  people,
  isLoading,
}) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(
    () => people.find((p) => p.userId.toLowerCase() === value.trim().toLowerCase()),
    [people, value],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return people;
    return people.filter((p) => {
      const id = (p.userId || '').toLowerCase();
      const name = (p.displayName || '').toLowerCase();
      const jt = (p.jobTitle || '').toLowerCase();
      const dep = (p.department || '').toLowerCase();
      return id.includes(s) || name.includes(s) || jt.includes(s) || dep.includes(s);
    });
  }, [people, q]);

  const summary = selected
    ? `${selected.displayName} (${selected.userId})`
    : value
      ? value
      : t('epm.tapPickAssignee', 'Tap to choose');

  return (
    <>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label ?? t('epm.assignedTo', 'Assigned To')}</Text>
      <TouchableOpacity
        onPress={() => {
          setQ('');
          setOpen(true);
        }}
        activeOpacity={0.8}
        style={[
          styles.field,
          shadows.card,
          { borderColor: colors.divider, backgroundColor: colors.greyCard ?? colors.background },
        ]}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: 14 }} numberOfLines={2}>
          {summary}
          {isLoading ? ' …' : ''}
        </Text>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent={Platform.OS === 'web'} onRequestClose={() => setOpen(false)}>
        <View style={[styles.sheetBackdrop, Platform.OS !== 'web' && styles.sheetBackdropTint]}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {t('epm.pickAssignee', 'Choose assignee')}
            </Text>
            <TextInput
              placeholder={t('common.search', 'Search')}
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              style={[styles.search, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.background }]}
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
                  onPress={() => {
                    onChange(item.userId);
                    setOpen(false);
                  }}
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
                <Text style={{ padding: 16, color: colors.textMuted }}>{t('common.noMatches', 'No matches')}</Text>
              }
            />
            <TouchableOpacity onPress={() => setOpen(false)} style={[styles.closeBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.cancel', 'Close')}</Text>
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
  field: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropTint: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...(Platform.OS === 'web' ? { alignSelf: 'center', width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 12, marginVertical: '5%' } : {}),
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginBottom: 10, fontSize: 14 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowId: { fontSize: 12, marginTop: 2 },
  closeBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
});

export default AssignableUserPicker;
