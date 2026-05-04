import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';
import {
  useV2GetAttendanceTeamGridQuery,
  useV2GetAttendanceStatusesQuery,
} from '../services/attendanceSvcApi';

// Plan: legacy_api_parity_rollout 1.1
// Manager attendance grid â€” replaces legacy `Attendance/GetAttendance`. Calls
// `Mobile.spMobile_v2_Attendance_GetTeamGrid` which proxies the canonical web SP
// `[SMARTSCAD_BETA].[dbo].[GetAttendanceReport]`. The SP handles the
// sector/department/section/status filters server-side; this screen only
// collects user input and renders rows.

type GridRow = Record<string, any>;

function statusTheme(label: string | undefined, colors: any) {
  const s = (label ?? '').toLowerCase();
  if (s.includes('on time') || s === 'present') return { bg: `${colors.success}18`, fg: colors.success };
  if (s.includes('early')) return { bg: `${colors.success}18`, fg: colors.success };
  if (s.includes('late')) return { bg: `${colors.warning}18`, fg: colors.warning };
  if (s.includes('absent')) return { bg: `${colors.danger}18`, fg: colors.danger };
  if (s.includes('leave')) return { bg: `${colors.primary}18`, fg: colors.primary };
  if (s.includes('weekend')) return { bg: `${colors.textMuted}18`, fg: colors.textMuted };
  if (s.includes('holiday')) return { bg: `${colors.info}18`, fg: colors.info };
  return { bg: `${colors.textMuted}18`, fg: colors.textMuted };
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const AttendanceTeamGridScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState<string>(isoDate(monthStart));
  const [endDate, setEndDate] = useState<string>(isoDate(today));
  const [usersCsv, setUsersCsv] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState<string>('');

  const statusesCsv = useMemo(() => Array.from(statusFilter).join(','), [statusFilter]);

  const { data, isFetching, isLoading, isError, error, refetch } = useV2GetAttendanceTeamGridQuery({
    startDate,
    endDate,
    users: usersCsv || undefined,
    statuses: statusesCsv || undefined,
    activeOnly,
    lang,
  });

  const { data: statusesData } = useV2GetAttendanceStatusesQuery(lang);

  const rows: GridRow[] = useMemo(() => {
    const env = asObject<any>(data) ?? {};
    return asArray<GridRow>(env.data ?? data);
  }, [data]);

  const statuses: any[] = useMemo(() => {
    const env = asObject<any>(statusesData) ?? {};
    return asArray<any>(env.data ?? statusesData);
  }, [statusesData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = String(r.ResourceName ?? r.resourceName ?? r.UserName ?? r.userName ?? '').toLowerCase();
      const id = String(r.UserDomainID ?? r.userDomainId ?? r.ResourceID ?? r.resourceId ?? '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [rows, search]);

  const renderItem = ({ item }: { item: GridRow }) => {
    const status = item.Status ?? item.status ?? item.AttendanceStatus ?? '';
    const stTheme = statusTheme(String(status), colors);
    const dated = item.Dated ?? item.dated ?? item.AttendanceDate ?? item.attendanceDate;
    const inTime = item.CheckIn ?? item.checkIn ?? item.InTime ?? item.inTime;
    const outTime = item.CheckOut ?? item.checkOut ?? item.OutTime ?? item.outTime;
    const name = item.ResourceName ?? item.resourceName ?? item.UserName ?? item.userName ?? 'â€”';
    const dept = item.Department ?? item.department ?? '';
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <View style={styles.cardRow}>
          <Text style={[styles.empName, { color: colors.text }]} numberOfLines={1}>{String(name)}</Text>
          <View style={[styles.statusPill, { backgroundColor: stTheme.bg }]}>
            <Text style={[styles.statusText, { color: stTheme.fg }]}>{String(status || 'â€”')}</Text>
          </View>
        </View>
        <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={1}>
          {String(dept || '')}{dept ? ' Â· ' : ''}{dated ? new Date(String(dated)).toLocaleDateString() : ''}
        </Text>
        <View style={styles.timesRow}>
          <Text style={[styles.timeBlock, { color: colors.text }]}>
            {t('attendance.checkIn', 'Check In')}: <Text style={{ fontWeight: '600' }}>{inTime ? String(inTime) : 'â€”'}</Text>
          </Text>
          <Text style={[styles.timeBlock, { color: colors.text }]}>
            {t('attendance.checkOut', 'Check Out')}: <Text style={{ fontWeight: '600' }}>{outTime ? String(outTime) : 'â€”'}</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Filter bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.filterRow}>
          <TextInput
            style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={{ color: colors.textMuted }}>â†’</Text>
          <TextInput
            style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity onPress={() => setFilterOpen(true)} style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {t('common.filters', 'Filters')}{statusFilter.size ? ` (${statusFilter.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.search, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t('common.searchByName', 'Search by name or ID')}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={isError}
        error={error}
        isRefreshing={isFetching}
        onRetry={refetch}
        style={{ flex: 1 }}
      >
        <FlatList
          data={filteredRows}
          keyExtractor={(it, i) => String(it.UserDomainID ?? it.userDomainId ?? it.ID ?? it.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            isFetching ? (
              <View style={{ padding: 32 }}>
                <ThemedActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>
                  {t('common.noResults', 'No results')}
                </Text>
              </View>
            )
          }
        />
      </QueryStates>

      {/* Filters modal */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('attendance.filters', 'Attendance filters')}</Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {t('attendance.usersCsv', 'Specific users (CSV of domain IDs)')}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              value={usersCsv}
              onChangeText={setUsersCsv}
              placeholder="scad\\user1,scad\\user2"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <View style={[styles.toggleRow]}>
              <Text style={{ color: colors.text }}>{t('attendance.activeOnly', 'Active employees only')}</Text>
              <TouchableOpacity onPress={() => setActiveOnly((v) => !v)} style={[styles.toggle, { backgroundColor: activeOnly ? colors.primary : colors.border }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: activeOnly ? 18 : 0 }] }]} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {t('attendance.statuses', 'Statuses')}
            </Text>
            <View style={styles.chipWrap}>
              {statuses.map((s: any) => {
                const id = String(s.ID ?? s.id ?? s.StatusID ?? s.statusId ?? s.LeaveTypeID ?? s.leaveTypeId);
                const label = String(s.Name ?? s.name ?? s.Status ?? s.status ?? id);
                const active = statusFilter.has(id);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => {
                      const next = new Set(statusFilter);
                      if (active) next.delete(id); else next.add(id);
                      setStatusFilter(next);
                    }}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: colors.border }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12 }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setStatusFilter(new Set()); setUsersCsv(''); }} style={[styles.actionBtn, { borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={{ color: colors.text }}>{t('common.clear', 'Clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterOpen(false)} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.apply', 'Apply')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterBar: { padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 8 : 4 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  search: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6 },
  card: { borderRadius: 10, padding: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  subText: { fontSize: 12, marginTop: 4 },
  timesRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  timeBlock: { fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { fontSize: 12, marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  modalInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  toggle: { width: 40, height: 22, borderRadius: 11, padding: 2 },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
});

export default AttendanceTeamGridScreen;

