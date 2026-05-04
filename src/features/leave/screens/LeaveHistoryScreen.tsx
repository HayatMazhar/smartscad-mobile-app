import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetLeaveHistoryQuery } from '../services/leaveApi';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import { formatSmartDateTime, formatDateOnly } from '../../../shared/utils/dateUtils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type LeaveSort = 'startDesc' | 'startAsc' | 'durationDesc' | 'durationAsc' | 'typeAsc' | 'status';
const SORTS: SortOption<LeaveSort>[] = [
  { key: 'startDesc',    label: 'Start date — newest first', icon: '📅' },
  { key: 'startAsc',     label: 'Start date — oldest first', icon: '📅' },
  { key: 'durationDesc', label: 'Longest duration',          icon: '⏱️' },
  { key: 'durationAsc',  label: 'Shortest duration',         icon: '⏱️' },
  { key: 'typeAsc',      label: 'Leave type',                icon: '🏷️' },
  { key: 'status',       label: 'Status',                    icon: '📊' },
];

const FILTERS: { key: StatusFilter; label: string; emoji: string }[] = [
  { key: 'all',      label: 'All',      emoji: '📋' },
  { key: 'pending',  label: 'Pending',  emoji: '⏳' },
  { key: 'approved', label: 'Approved', emoji: '✅' },
  { key: 'rejected', label: 'Rejected', emoji: '❌' },
];

/** Normalise a raw row from the /leave/history response to the shape the UI uses. */
function normaliseRow(b: any) {
  const rawCategory = String(b.statusCategory ?? '').toLowerCase();
  const statusId = Number(b.statusId ?? b.ApplicationStatusID ?? 0) || 0;
  // Server-computed category is the source of truth; fall back to statusId
  // then to text matching for older envelopes.
  const category: StatusFilter | 'cancelled' =
    rawCategory === 'approved' || rawCategory === 'rejected' ||
    rawCategory === 'pending'  || rawCategory === 'cancelled'
      ? (rawCategory as any)
      : statusId === 22 ? 'approved'
      : statusId === 23 ? 'rejected'
      : statusId === 24 ? 'cancelled'
      : 'pending';

  const statusLabel =
    b.status ?? b.statusName ??
    (category === 'approved' ? 'Approved'
      : category === 'rejected' ? 'Rejected'
      : category === 'cancelled' ? 'Cancelled'
      : 'Pending');

  const leaveType = b.leaveType ?? b.leaveTypeName ?? b.type ?? 'Leave';
  const startDate = b.startDate ?? b.fromDate ?? b.StartDate;
  const endDate   = b.endDate   ?? b.toDate   ?? b.EndDate;

  const daysRaw  = b.days      ?? b.daysCount ?? b.duration ?? null;
  const hoursRaw = b.hours     ?? null;
  const isFullDay = b.isFullDay === true || b.isFullDay === 1 || b.isFullDay === '1'
    || (b.isFullDay == null && Number(daysRaw) > 0 && hoursRaw == null);

  const days  = Number(daysRaw)  || 0;
  const hours = Number(hoursRaw) || 0;

  return {
    id: b.id ?? b.leaveAppUID ?? `${leaveType}-${startDate}`,
    leaveType,
    status: statusLabel,
    statusCategory: category,
    startDate,
    endDate,
    days,
    hours,
    isFullDay,
    reason: b.reason ?? '',
    taskNo: b.taskNo ?? null,
  };
}

function statusColor(cat: string, colors: any) {
  switch (cat) {
    case 'approved':  return { bg: `${colors.success}18`, text: colors.success };
    case 'rejected':  return { bg: `${colors.danger}18`,  text: colors.danger  };
    case 'cancelled': return { bg: `${colors.textMuted}18`, text: colors.textMuted };
    default:          return { bg: `${colors.warning}18`, text: colors.warning };
  }
}

function leaveTypePillColor(type: string, colors: any) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('annual')) return { bg: `${colors.primary}18`, text: colors.primary };
  if (t.includes('sick'))   return { bg: `${colors.danger}18`,  text: colors.danger  };
  if (t.includes('remote')) return { bg: `${colors.info}18`,    text: colors.info    };
  if (t.includes('short'))  return { bg: `${colors.warning}18`, text: colors.warning };
  return { bg: `${colors.info}18`, text: colors.info };
}

function formatDate(dateStr: string | undefined, withTime = false) {
  if (!dateStr) return '--';
  return withTime ? formatSmartDateTime(dateStr) : formatDateOnly(dateStr);
}

const LeaveHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows, radii } = useTheme();
  const navigation = useNavigation<MoreTabNavigation<'LeaveHistory'>>();
  const currentYear = new Date().getFullYear();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetLeaveHistoryQuery({ year: currentYear });
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<LeaveSort>('startDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const allLeaves = useMemo(
    () => asArray<any>(data).map(normaliseRow),
    [data],
  );

  // Pre-compute counts so the chips can show badges (matches taskList UX).
  const counts = useMemo(() => {
    const c = { all: allLeaves.length, pending: 0, approved: 0, rejected: 0 };
    for (const l of allLeaves) {
      if (l.statusCategory === 'pending')  c.pending  += 1;
      if (l.statusCategory === 'approved') c.approved += 1;
      if (l.statusCategory === 'rejected') c.rejected += 1;
    }
    return c;
  }, [allLeaves]);

  const filtered = useMemo(() => {
    const base = filter === 'all'
      ? allLeaves
      : allLeaves.filter((l) => l.statusCategory === filter);
    switch (sortKey) {
      case 'startDesc':    return sortRowsBy(base, 'desc', (r) => toDate(r.startDate));
      case 'startAsc':     return sortRowsBy(base, 'asc',  (r) => toDate(r.startDate));
      case 'durationDesc': return sortRowsBy(base, 'desc', (r) => Number(r.days || 0) + Number(r.hours || 0) / 24);
      case 'durationAsc':  return sortRowsBy(base, 'asc',  (r) => Number(r.days || 0) + Number(r.hours || 0) / 24);
      case 'typeAsc':      return sortRowsBy(base, 'asc',  (r) => String(r.leaveType ?? ''));
      case 'status':       return sortRowsBy(base, 'asc',  (r) => String(r.statusCategory ?? ''));
      default:             return base;
    }
  }, [allLeaves, filter, sortKey]);

  const renderItem = useCallback(({ item }: { item: ReturnType<typeof normaliseRow> }) => {
    const sc = statusColor(item.statusCategory, colors);
    const tc = leaveTypePillColor(item.leaveType, colors);

    const showTime = !item.isFullDay;
    const durationValue = showTime && item.hours > 0 ? item.hours : item.days;
    const durationUnit  = showTime && item.hours > 0
      ? t('leave.hrsShort', 'hrs')
      : t('leave.days', 'days');

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('LeaveDetail', { leaveId: item.id })}
        style={[styles.card, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
            <Text style={[styles.typePillText, { color: tc.text }]} numberOfLines={1}>
              {item.leaveType}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusPillText, { color: sc.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateBlock}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              {t('leave.from', 'From')}
            </Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>
              {formatDate(item.startDate, showTime)}
            </Text>
          </View>
          <View style={styles.dateArrow}>
            <Text style={[styles.dateArrowText, { color: colors.textMuted }]}>→</Text>
          </View>
          <View style={[styles.dateBlock, styles.dateBlockEnd]}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              {t('leave.to', 'To')}
            </Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>
              {formatDate(item.endDate, showTime)}
            </Text>
          </View>
          <View style={[styles.daysBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.daysNum, { color: colors.primary }]}>
              {durationValue || '-'}
            </Text>
            <Text style={[styles.daysLabel, { color: colors.primary }]}>
              {durationUnit}
            </Text>
          </View>
        </View>

        {item.taskNo ? (
          <Text style={[styles.taskNo, { color: colors.textMuted }]} numberOfLines={1}>
            {item.taskNo}
          </Text>
        ) : null}

        {item.reason ? (
          <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.reason}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }, [colors, shadows, radii, t, navigation]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isError && (
        <TouchableOpacity
          onPress={() => refetch()}
          activeOpacity={0.75}
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            backgroundColor: `${colors.danger}14`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
            {t('common.loadError', 'Could not load data. Tap to retry.')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Year pill (mirrors LeaveBalanceScreen) so the user sees what year is loaded */}
      <View style={styles.yearRow}>
        <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
          {t('leave.year', 'Year')}
        </Text>
        <View
          style={[
            styles.yearPill,
            { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.yearPillText, { color: colors.primary }]}>{currentYear}</Text>
        </View>
        {allLeaves.length > 0 && (
          <Text style={[styles.yearTotal, { color: colors.textMuted }]}>
            {t('leave.totalCount', '{{n}} records', { n: allLeaves.length })}
          </Text>
        )}
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<LeaveSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort leave history"
        colors={colors}
        shadows={shadows}
      />

      {/* Fixed-height strip — prevents the chip text descenders (g/p/y) and
          emoji glyphs from being clipped at the bottom on Android, which
          happens when the ScrollView relies on its intrinsic content height. */}
      <View style={styles.filterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count  = (counts as any)[f.key] ?? 0;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active ? shadows.button : shadows.card,
                ]}
              >
                <Text style={styles.chipEmoji} allowFontScaling={false}>{f.emoji}</Text>
                <Text
                  style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {t(`leave.filter.${f.key}`, f.label)}
                </Text>
                <View
                  style={[
                    styles.chipBadge,
                    { backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${colors.primary}14` },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipBadgeText,
                      { color: active ? '#fff' : colors.primary },
                    ]}
                    allowFontScaling={false}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isError
                  ? t('common.loadError', 'Could not load data')
                  : t('leave.noHistory', 'No leave requests')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {isError
                  ? ''
                  : t(
                      'leave.noHistoryDesc',
                      'Your leave history will appear here',
                    )}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating "Request leave" button — primary action for this screen */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('LeaveRequest')}
        style={[
          styles.fab,
          shadows.button,
          { backgroundColor: colors.primary },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('leave.request', 'Request leave')}
      >
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabLabel}>
          {t('leave.request', 'Request leave')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Year pill */
  yearRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  yearLabel:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  yearPill:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  yearPillText:  { fontSize: 12, fontWeight: '700' },
  yearTotal:     { marginLeft: 'auto', fontSize: 12 },

  /* Filter chips */
  // Fixed strip height ensures the ScrollView's intrinsic height is large
  // enough on Android to fit the chip + descenders + emoji baseline.
  filterStrip:  { height: 56, marginTop: 4, justifyContent: 'center' },
  filterRow:    { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    minHeight: 36,
  },
  // includeFontPadding:false removes Android's extra ascender padding so
  // the actual glyph centers vertically inside the chip; explicit lineHeight
  // gives descenders (g/p/y) room without being clipped.
  chipEmoji:     { fontSize: 14, lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center' },
  chipText:      { fontSize: 13, fontWeight: '600', lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center' },
  chipBadge:     { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipBadgeText: { fontSize: 11, fontWeight: '700', lineHeight: 14, includeFontPadding: false, textAlignVertical: 'center' },

  listContent: { padding: 16, paddingBottom: 40, gap: 12 },

  /* Card */
  card: { padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 },
  typePill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, maxWidth: '65%' },
  typePillText:  { fontSize: 12, fontWeight: '700' },
  statusPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText:{ fontSize: 12, fontWeight: '700' },

  dateRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBlock:     { flex: 1 },
  dateBlockEnd:  { alignItems: 'flex-start' },
  dateLabel:     { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  dateValue:     { fontSize: 15, fontWeight: '700' },
  dateArrow:     { paddingHorizontal: 4, paddingTop: 10 },
  dateArrowText: { fontSize: 18, fontWeight: '300' },
  daysBadge: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, marginLeft: 4, minWidth: 52,
  },
  daysNum:   { fontSize: 16, fontWeight: '800' },
  daysLabel: { fontSize: 9,  fontWeight: '600' },

  taskNo: { marginTop: 10, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  reason: { marginTop: 6,  fontSize: 13, lineHeight: 18 },

  /* Empty */
  emptyState:    { alignItems: 'center', marginTop: 80 },
  emptyEmoji:    { fontSize: 56, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, fontWeight: '400' },

  /* Floating action button */
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  fabPlus:  { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 22 },
  fabLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default LeaveHistoryScreen;
