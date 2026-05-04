import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import {
  useGetPmsHubSummaryQuery,
  useGetStrategiesQuery,
} from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import type { PmsHubSummary, PmsStrategy } from '../types';
import QueryStates from '../../../shared/components/QueryStates';

type Filter = 'all' | 'mine';

const PmsHubScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const isAr = i18n.language?.startsWith('ar');
  const { canEditStrategy, canApproveKpi, hasAnyPmsRole } = usePmsRoles();

  const summaryQ = useGetPmsHubSummaryQuery();
  const stratQ = useGetStrategiesQuery();

  const summary = (asObject<PmsHubSummary>(
    (summaryQ.data as any)?.data ?? summaryQ.data,
  ) ?? null) as PmsHubSummary | null;
  const strategies = useMemo(
    () => asArray<PmsStrategy>(stratQ.data),
    [stratQ.data],
  );
  /** Single current strategy from API (in-period, else latest active) — all hub counts use this. */
  const currentStrategyId = strategies[0]?.id ?? strategies[0]?.strategyId;

  const [filter, setFilter] = useState<Filter>('all');

  const refreshAll = () => {
    summaryQ.refetch();
    stratQ.refetch();
  };

  const showMineCounts = filter === 'mine' && !!summary;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <ThemedRefreshControl
          isFetching={summaryQ.isFetching || stratQ.isFetching}
          isLoading={summaryQ.isLoading || stratQ.isLoading}
          onRefresh={refreshAll}
        />
      }
    >
      {/* Hero */}
      <View style={[styles.hero, shadows.card, { backgroundColor: colors.secondary }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>
            {t('pms.title', 'Strategic Performance Management')}
          </Text>
          <Text style={styles.heroSub}>
            {t(
              'pms.subtitle',
              'Plan, deliver and measure SCAD strategy across services, programs & KPIs.',
            )}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'mine'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f ? colors.primary : colors.card,
                borderColor: filter === f ? colors.primary : colors.divider,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? '#FFFFFF' : colors.text },
              ]}
            >
              {f === 'all'
                ? t('pms.filterAll', 'All')
                : t('pms.filterMine', 'Mine')}
            </Text>
          </TouchableOpacity>
        ))}
        {(canEditStrategy || canApproveKpi) && (
          <View style={[styles.rolePill, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}40` }]}>
            <Text style={[styles.rolePillText, { color: colors.success }]} numberOfLines={1}>
              {canEditStrategy
                ? t('pms.roleStrategy', 'Strategy team')
                : t('pms.roleApprover', 'KPI approver')}
            </Text>
          </View>
        )}
      </View>

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(summaryQ.isError && !summary)}
        error={summaryQ.error}
        onRetry={() => summaryQ.refetch()}
        isRefreshing={summaryQ.isFetching}
        style={summaryQ.isError && !summary ? { alignSelf: 'stretch', minHeight: 240 } : undefined}
      >
        {null}
      </QueryStates>

      {/* Summary tiles */}
      <View style={styles.summaryGrid}>
        <SummaryTile
          icon="🎯"
          label={t('pms.objectives', 'Objectives')}
          total={summary?.objectiveCount ?? 0}
          mine={summary?.objectiveCountMine ?? 0}
          showMine={showMineCounts}
          colors={colors}
          shadows={shadows}
        />
        <SummaryTile
          icon="🛠️"
          label={t('pms.services', 'Main Services')}
          total={summary?.serviceCount ?? 0}
          mine={summary?.serviceCountMine ?? 0}
          showMine={showMineCounts}
          colors={colors}
          shadows={shadows}
        />
        <SummaryTile
          icon="📦"
          label={t('pms.programs', 'Programs')}
          total={summary?.programCount ?? 0}
          mine={summary?.programCountMine ?? 0}
          showMine={showMineCounts}
          colors={colors}
          shadows={shadows}
        />
        <SummaryTile
          icon="📈"
          label={t('pms.kpis', 'KPIs')}
          total={summary?.kpiCount ?? 0}
          mine={summary?.kpiCountMine ?? 0}
          showMine={showMineCounts}
          colors={colors}
          shadows={shadows}
        />
      </View>

      {/* Quick navigation */}
      <View style={styles.quickRow}>
        <QuickButton
          emoji="🎯"
          label={t('pms.viewObjectives', 'Objectives')}
          colors={colors}
          shadows={shadows}
          onPress={() => navigation.navigate('PmsObjectivesList', { mineOnly: filter === 'mine' })}
        />
        <QuickButton
          emoji="🛠️"
          label={t('pms.viewServices', 'Services')}
          colors={colors}
          shadows={shadows}
          onPress={() => navigation.navigate('PmsServicesList', { mineOnly: filter === 'mine' })}
        />
        <QuickButton
          emoji="📦"
          label={t('pms.viewPrograms', 'Programs')}
          colors={colors}
          shadows={shadows}
          onPress={() => navigation.navigate('PmsProgramsList', { mineOnly: filter === 'mine' })}
        />
        <QuickButton
          emoji="📈"
          label={t('pms.viewKpis', 'KPIs')}
          colors={colors}
          shadows={shadows}
          onPress={() => navigation.navigate('PmsKpisList', { mineOnly: filter === 'mine' })}
        />
      </View>

      {/* Strategies */}
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('pms.currentStrategy', 'Current strategy')}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
          {strategies.length ? 1 : 0}
        </Text>
      </View>

      {stratQ.isLoading ? (
        <View style={styles.center}>
          <ThemedActivityIndicator color={colors.primary} />
        </View>
      ) : strategies.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={styles.emptyEmoji}>🏛️</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.noStrategies', 'No active strategies')}
          </Text>
        </View>
      ) : (
        strategies.map((s) => {
          const name = isAr ? (s.strategyNameAr || s.strategyName) : (s.strategyName || s.strategyNameAr);
          return (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.85}
              style={[styles.strategyCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('PmsStrategyDetail', { strategyId: s.id, name })}
            >
              <View style={[styles.strategyAccent, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1, padding: 14 }}>
                <Text style={[styles.strategyName, { color: colors.text }]} numberOfLines={2}>
                  {name}
                </Text>
                <Text style={[styles.strategyPeriod, { color: colors.textSecondary }]}>
                  {s.period}
                </Text>
                <View style={styles.strategyMetaRow}>
                  <MiniStat label={t('pms.objectives', 'Objectives')} value={s.objectiveCount} colors={colors} />
                  <MiniStat label={t('pms.services', 'Services')} value={s.serviceCount} colors={colors} />
                  <MiniStat label={t('pms.programs', 'Programs')} value={s.programCount} colors={colors} />
                  <MiniStat label={t('pms.kpis', 'KPIs')} value={s.kpiCount} colors={colors} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {!hasAnyPmsRole && (
        <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            {t(
              'pms.readOnlyHint',
              'You are viewing PMS data in read-only mode. Approval/edit actions require a PMS role assignment.',
            )}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const SummaryTile: React.FC<{
  icon: string;
  label: string;
  total: number;
  mine: number;
  showMine: boolean;
  colors: any;
  shadows: any;
}> = ({ icon, label, total, mine, showMine, colors, shadows }) => (
  <View style={[styles.summaryTile, shadows.card, { backgroundColor: colors.card }]}>
    <Text style={styles.summaryIcon}>{icon}</Text>
    <Text style={[styles.summaryValue, { color: colors.text }]}>
      {showMine ? mine : total}
    </Text>
    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
      {label}
    </Text>
    {!showMine && mine > 0 && (
      <Text style={[styles.summaryMine, { color: colors.primary }]} numberOfLines={1}>
        {mine} mine
      </Text>
    )}
  </View>
);

const QuickButton: React.FC<{
  emoji: string;
  label: string;
  colors: any;
  shadows: any;
  onPress: () => void;
}> = ({ emoji, label, colors, shadows, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.quickBtn, shadows.card, { backgroundColor: colors.card }]}
  >
    <Text style={styles.quickEmoji}>{emoji}</Text>
    <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

const MiniStat: React.FC<{ label: string; value: number; colors: any }> = ({ label, value, colors }) => (
  <View style={styles.miniStat}>
    <Text style={[styles.miniValue, { color: colors.primary }]}>{value}</Text>
    <Text style={[styles.miniLabel, { color: colors.textMuted }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 18,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', lineHeight: 22 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6, lineHeight: 17 },

  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  rolePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginLeft: 'auto', maxWidth: 160 },
  rolePillText: { fontSize: 11, fontWeight: '700' },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  summaryIcon: { fontSize: 22, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  summaryMine: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    flexBasis: '23%',
    flexGrow: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },

  strategyCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  strategyAccent: { width: 4 },
  strategyName: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  strategyPeriod: { fontSize: 12, marginTop: 4 },
  strategyMetaRow: { flexDirection: 'row', marginTop: 12, gap: 16, flexWrap: 'wrap' },
  miniStat: { alignItems: 'flex-start' },
  miniValue: { fontSize: 16, fontWeight: '800' },
  miniLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },

  center: { padding: 24, alignItems: 'center' },

  infoBanner: { borderRadius: 10, padding: 12, marginTop: 8 },
  infoBannerText: { fontSize: 12, lineHeight: 18 },
});

export default PmsHubScreen;
