import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetMyProjectsQuery } from '../services/epmApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';

type ProjSort = 'endAsc' | 'endDesc' | 'nameAsc' | 'pctDesc' | 'pctAsc' | 'riskDesc' | 'status';
const SORTS: SortOption<ProjSort>[] = [
  { key: 'endAsc',   label: 'Due date — soonest',    icon: '📅' },
  { key: 'endDesc',  label: 'Due date — latest',     icon: '📅' },
  { key: 'nameAsc',  label: 'Name — A to Z',         icon: '🔤' },
  { key: 'pctDesc',  label: 'Completion — high to low', icon: '📈' },
  { key: 'pctAsc',   label: 'Completion — low to high', icon: '📉' },
  { key: 'riskDesc', label: 'Most risks first',      icon: '⚠️' },
  { key: 'status',   label: 'Status',                icon: '🏷️' },
];

const statusColor = (status: string | undefined) => {
  const s = (status ?? '').toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('delay') || s.includes('behind') || s.includes('overdue')) return 'delayed';
  if (s.includes('risk')) return 'atRisk';
  if (s.includes('plan')) return 'planned';
  return 'onTrack';
};

const ROLE_EMOJI: Record<string, string> = {
  Owner: '👑',
  'Project Manager': '🛠️',
  'Business Owner': '💼',
  'Team Member': '👥',
  'Read-Only': '👁️',
};

const StatBox: React.FC<{
  label: string;
  value: number;
  color: string;
  bgColor: string;
}> = ({ label, value, color, bgColor }) => (
  <View style={[styles.statBox, { backgroundColor: bgColor }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={[styles.statLabel, { color }]}>{label}</Text>
  </View>
);

const ProjectListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const { data, isFetching, isLoading, isError, refetch } = useGetMyProjectsQuery({ year });
  const [sortKey, setSortKey] = useState<ProjSort>('endAsc');
  const [sortOpen, setSortOpen] = useState(false);

  const projects = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'endAsc':   return sortRowsBy(list, 'asc',  (r) => toDate(r.endDate));
      case 'endDesc':  return sortRowsBy(list, 'desc', (r) => toDate(r.endDate));
      case 'nameAsc':  return sortRowsBy(list, 'asc',  (r) => String(r.projectName ?? r.name ?? ''));
      case 'pctDesc':  return sortRowsBy(list, 'desc', (r) => Number(r.completionPercentage ?? 0));
      case 'pctAsc':   return sortRowsBy(list, 'asc',  (r) => Number(r.completionPercentage ?? 0));
      case 'riskDesc': return sortRowsBy(list, 'desc', (r) => Number(r.riskCount ?? 0));
      case 'status':   return sortRowsBy(list, 'asc',  (r) => String(r.statusName ?? ''));
      default:         return list;
    }
  }, [data, sortKey]);

  const counts = {
    total: projects.length,
    onTrack: projects.filter((p) => statusColor(p.statusName) === 'onTrack').length,
    atRisk: projects.filter((p) => statusColor(p.statusName) === 'atRisk').length,
    delayed: projects.filter((p) => statusColor(p.statusName) === 'delayed').length,
  };

  const badgeMap: Record<string, { bg: string; fg: string }> = {
    onTrack: { bg: `${colors.success}20`, fg: colors.success },
    completed: { bg: `${colors.success}20`, fg: colors.success },
    planned: { bg: `${colors.primary}18`, fg: colors.primary },
    atRisk: { bg: `${colors.warning}20`, fg: colors.warning },
    delayed: { bg: `${colors.danger}20`, fg: colors.danger },
  };

  const renderItem = ({ item }: { item: any }) => {
    const key = statusColor(item.statusName);
    const badge = badgeMap[key];
    const pct = item.completionPercentage ?? 0;

    return (
      <TouchableOpacity
        style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
              {item.projectName ?? item.name}
            </Text>
            <Text style={[styles.manager, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.managerName ?? '—'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.fg }]}>
              {item.statusName ?? 'On Track'}
            </Text>
          </View>
        </View>

        {!!item.myRole && (
          <View style={[styles.roleChip, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}>
            <Text style={styles.roleEmoji}>{ROLE_EMOJI[item.myRole] ?? '👤'}</Text>
            <Text style={[styles.roleText, { color: colors.primary }]} numberOfLines={1}>
              {t('epm.myRole', 'My role')}: <Text style={{ fontWeight: '700' }}>{item.myRole}</Text>
            </Text>
          </View>
        )}

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {t('common.progress', 'Progress')}
            </Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{pct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.greyCard }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: pct >= 100 ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
          <Text style={[styles.dateRange, { color: colors.textMuted }]}>
            {item.startDate ?? '—'}  →  {item.endDate ?? '—'}
          </Text>
          <View style={styles.footerRight}>
            <View style={styles.footerChip}>
              <Text style={styles.chipEmoji}>🏁</Text>
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {item.completedMilestones ?? 0}/{item.totalMilestones ?? 0}
              </Text>
            </View>
            {(item.riskCount ?? 0) > 0 && (
              <View style={[styles.riskChip, { backgroundColor: `${colors.danger}18` }]}>
                <Text style={styles.chipEmoji}>⚠️</Text>
                <Text style={[styles.chipText, { color: colors.danger }]}>
                  {item.riskCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{projects.length}</Text>
          <Text> projects · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<ProjSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort projects"
        colors={colors}
        shadows={shadows}
      />
      {isError && (
        <TouchableOpacity
          onPress={() => refetch()}
          activeOpacity={0.75}
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 4,
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
      <FlatList
        data={projects}
        keyExtractor={(item, index) => String(item.id ?? item.projectName ?? item.name ?? index)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.yearRow}>
              {[thisYear, thisYear - 1].map((y) => {
                const active = y === year;
                return (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    activeOpacity={0.75}
                    style={[
                      styles.yearPill,
                      {
                        backgroundColor: active ? colors.primary : `${colors.primary}14`,
                        borderColor: active ? colors.primary : `${colors.primary}30`,
                      },
                    ]}
                  >
                    <Text style={[styles.yearPillText, { color: active ? '#fff' : colors.primary }]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.statsRow}>
              <StatBox
                label={t('epm.total', 'Total')}
                value={counts.total}
                color={colors.primary}
                bgColor={colors.primaryLight}
              />
              <StatBox
                label={t('epm.onTrack', 'On Track')}
                value={counts.onTrack}
                color={colors.success}
                bgColor={`${colors.success}18`}
              />
              <StatBox
                label={t('epm.atRisk', 'At Risk')}
                value={counts.atRisk}
                color={colors.warning}
                bgColor={`${colors.warning}18`}
              />
              <StatBox
                label={t('epm.delayed', 'Delayed')}
                value={counts.delayed}
                color={colors.danger}
                bgColor={`${colors.danger}18`}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isError ? t('common.loadError', 'Could not load data') : t('common.noData', 'No projects found')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },

  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  yearPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  yearPillText: { fontSize: 12, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  card: { borderRadius: 12, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  projectName: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  manager: { fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },

  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: -6,
    marginBottom: 12,
  },
  roleEmoji: { fontSize: 12 },
  roleText: { fontSize: 11, fontWeight: '600' },

  progressSection: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '500' },
  progressPct: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  dateRange: { fontSize: 11 },
  footerRight: { flexDirection: 'row', gap: 8 },
  footerChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipEmoji: { fontSize: 12 },
  chipText: { fontSize: 11, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default ProjectListScreen;
