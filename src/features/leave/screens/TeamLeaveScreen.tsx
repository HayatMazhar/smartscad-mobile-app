import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, TouchableOpacity, Modal, Pressable } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetTeamLeaveQuery } from '../services/leaveApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChroma } from '../../../app/theme/accentChroma';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';

// ─── Helpers ────────────────────────────────────────────────────────────
function statusStyle(status: string, colors: any) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('approve')) return { bg: `${colors.success}18`, fg: colors.success };
  if (s.includes('reject') || s.includes('cancel')) return { bg: `${colors.danger}18`, fg: colors.danger };
  if (s.includes('accept')) return { bg: `${colors.primary}18`, fg: colors.primary };
  return { bg: `${colors.warning}18`, fg: colors.warning };
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].charAt(0).toUpperCase()
    : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const toTime = (v?: string | null) => (v ? new Date(v).getTime() : 0);

// ─── Sort options ───────────────────────────────────────────────────────
type SortKey = 'startAsc' | 'startDesc' | 'daysDesc' | 'daysAsc' | 'nameAsc' | 'statusAsc';
const SORTS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'startAsc',  label: 'Start date — earliest first', icon: '📅' },
  { key: 'startDesc', label: 'Start date — latest first',   icon: '📅' },
  { key: 'daysDesc',  label: 'Duration — longest first',    icon: '⏳' },
  { key: 'daysAsc',   label: 'Duration — shortest first',   icon: '⏳' },
  { key: 'nameAsc',   label: 'Employee — A to Z',           icon: '🔤' },
  { key: 'statusAsc', label: 'Status',                      icon: '🏷️' },
];

// ─── Screen ─────────────────────────────────────────────────────────────
const TeamLeaveScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const { data, isFetching, isLoading, isError, error, refetch } = useGetTeamLeaveQuery();

  const [sortKey, setSortKey] = useState<SortKey>('startAsc');
  const [sortOpen, setSortOpen] = useState(false);

  // The SP returns a multi-result envelope: { meta: {...}, leaves: [...] }.
  const { meta, rows } = useMemo(() => {
    const envelope = asObject<any>(data) ?? {};
    const payload  = asObject<any>(envelope.data) ?? envelope;
    const metaObj  = asObject<any>(payload.meta) ?? {};
    const leaves   = asArray<any>(payload.leaves ?? payload);
    return { meta: metaObj, rows: leaves };
  }, [data]);

  const mode: 'team' | 'colleagues' | 'none' = (meta?.mode as any) ?? 'none';
  const isManager = !!meta?.isManager;
  const managerName: string | undefined = meta?.managerName ?? undefined;

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a: any, b: any) => {
      switch (sortKey) {
        case 'startAsc':  return toTime(a.startDate) - toTime(b.startDate);
        case 'startDesc': return toTime(b.startDate) - toTime(a.startDate);
        case 'daysDesc':  return Number(b.days ?? 0) - Number(a.days ?? 0);
        case 'daysAsc':   return Number(a.days ?? 0) - Number(b.days ?? 0);
        case 'nameAsc':   return String(a.employeeName ?? '').localeCompare(String(b.employeeName ?? ''));
        case 'statusAsc': return String(a.status ?? '').localeCompare(String(b.status ?? ''));
        default:          return 0;
      }
    });
    return list;
  }, [rows, sortKey]);

  const headerTitle =
    mode === 'team'       ? t('leave.teamTitle', 'Team Leave')
    : mode === 'colleagues' ? t('leave.colleaguesTitle', 'My Colleagues on Leave')
    : t('leave.teamTitle', 'Team Leave');

  const headerSub =
    mode === 'team'       ? t('leave.teamSub', '{{n}} team member(s) on leave', { n: sortedRows.length })
    : mode === 'colleagues'
        ? (managerName
            ? t('leave.colleaguesSub', 'Reporting to {{manager}} · {{n}} on leave', { manager: managerName, n: sortedRows.length })
            : t('leave.colleaguesSubNoMgr', '{{n}} colleague(s) on leave', { n: sortedRows.length }))
    : t('leave.noTeamSub', 'No team or colleagues to show');

  const headerEmoji = mode === 'colleagues' ? '🤝' : '👥';

  const activeSort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const st = statusStyle(item.status, colors);
    const initials = getInitials(item.employeeName);
    const avatarBg = accentChroma(colors, skin, index);

    return (
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.empName, { color: colors.text }]} numberOfLines={1}>
              {item.employeeName}
            </Text>
            <Text style={[styles.leaveType, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.leaveType}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.fg }]}>{item.status}</Text>
          </View>
        </View>
        <View style={[styles.dateRow, { borderTopColor: colors.divider }]}>
          <View style={styles.dateBlock}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>From</Text>
            <Text style={[styles.dateVal, { color: colors.text }]}>{item.startDate}</Text>
          </View>
          <Text style={[styles.arrow, { color: colors.textMuted }]}>---</Text>
          <View style={[styles.dateBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>To</Text>
            <Text style={[styles.dateVal, { color: colors.text }]}>{item.endDate}</Text>
          </View>
          <View style={[styles.daysChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.daysNum, { color: colors.primary }]}>{item.days}</Text>
            <Text style={[styles.daysLabel, { color: colors.primary }]}>days</Text>
          </View>
        </View>
      </View>
    );
  };

  const emptyState = mode === 'none' ? (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🙋</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No team context</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        You don't have any direct reports or recorded colleagues to display.
      </Text>
    </View>
  ) : (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>All hands on deck!</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {mode === 'colleagues' ? 'No colleagues on leave right now' : 'No team members on leave right now'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{headerEmoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
            {isManager ? (
              <View style={[styles.rolePill, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.rolePillText, { color: colors.primary }]}>Manager</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={2}>
            {headerSub}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setSortOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortBtnIcon, { color: colors.text }]}>⇅</Text>
        </TouchableOpacity>
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
        data={sortedRows}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={emptyState}
      />
      </QueryStates>

      {/* Sort bottom sheet */}
      <Modal transparent visible={sortOpen} animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={[styles.sheet, shadows.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Sort by · <Text style={{ color: colors.primary }}>{activeSort.label.split('—')[0].trim()}</Text>
            </Text>
            {SORTS.map((s) => {
              const active = s.key === sortKey;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sheetRow, { backgroundColor: active ? `${colors.primary}15` : 'transparent' }]}
                  onPress={() => { setSortKey(s.key); setSortOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sheetRowIcon}>{s.icon}</Text>
                  <Text style={[styles.sheetRowText, { color: active ? colors.primary : colors.text, fontWeight: active ? '800' : '500' }]}>
                    {s.label}
                  </Text>
                  {active ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 12, paddingBottom: 8,
  },
  headerEmoji: { fontSize: 32 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rolePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  sortBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBtnIcon: { fontSize: 16, fontWeight: '900' },

  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  empName: { fontSize: 15, fontWeight: '700' },
  leaveType: { fontSize: 12, marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  dateRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  dateBlock: { flex: 1 },
  dateLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  dateVal: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  arrow: { fontSize: 16, marginHorizontal: 8 },
  daysChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
  daysNum: { fontSize: 16, fontWeight: '900' },
  daysLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },

  emptyWrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginVertical: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10 },
  sheetRowIcon: { fontSize: 17 },
  sheetRowText: { flex: 1, fontSize: 14 },
  sheetCheck: { fontSize: 16, fontWeight: '900' },
});

export default TeamLeaveScreen;
