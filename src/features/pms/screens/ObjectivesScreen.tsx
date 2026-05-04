import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetStrategiesQuery } from '../services/pmsApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, SortOption } from '../../../shared/components/SortSheet';

type ObjSort = 'nameAsc' | 'nameDesc' | 'weightDesc' | 'status' | 'kpiDesc';
const SORTS: SortOption<ObjSort>[] = [
  { key: 'nameAsc',    label: 'Name — A to Z', icon: '🔤' },
  { key: 'nameDesc',   label: 'Name — Z to A', icon: '🔤' },
  { key: 'weightDesc', label: 'Weight — high to low', icon: '⚖️' },
  { key: 'status',     label: 'Status',        icon: '🏷️' },
  { key: 'kpiDesc',    label: 'Most KPIs first', icon: '📊' },
];

function sortObjectivesTree(list: any[], sortKey: ObjSort): any[] {
  const apply = (arr: any[]): any[] => {
    let out: any[];
    switch (sortKey) {
      case 'nameAsc':    out = sortRowsBy(arr, 'asc',  (r) => String(r.objectiveName ?? r.name ?? '')); break;
      case 'nameDesc':   out = sortRowsBy(arr, 'desc', (r) => String(r.objectiveName ?? r.name ?? '')); break;
      case 'weightDesc': out = sortRowsBy(arr, 'desc', (r) => Number(r.weight ?? 0)); break;
      case 'status':     out = sortRowsBy(arr, 'asc',  (r) => String(r.statusName ?? '')); break;
      case 'kpiDesc':    out = sortRowsBy(arr, 'desc', (r) => Number(r.kpiCount ?? r.kpis?.length ?? 0)); break;
      default:           out = arr;
    }
    return out.map((o) => ({
      ...o,
      subObjectives: o.subObjectives ? apply(o.subObjectives) : o.subObjectives,
      children:      o.children      ? apply(o.children)      : o.children,
    }));
  };
  return apply(list);
}

const statusBadgeColor = (status: string | undefined, colors: any) => {
  const s = (status ?? '').toLowerCase();
  if (s.includes('complete') || s.includes('achieved'))
    return { bg: `${colors.success}20`, fg: colors.success };
  if (s.includes('progress'))
    return { bg: `${colors.primary}20`, fg: colors.primary };
  if (s.includes('risk') || s.includes('behind'))
    return { bg: `${colors.danger}20`, fg: colors.danger };
  return { bg: `${colors.warning}20`, fg: colors.warning };
};

const ObjectiveCard: React.FC<{
  objective: any;
  level: number;
  colors: any;
  shadows: any;
}> = ({ objective, level, colors, shadows }) => {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadgeColor(objective.statusName, colors);
  const children: any[] = objective.subObjectives ?? objective.children ?? [];
  const kpiCount = objective.kpiCount ?? objective.kpis?.length ?? 0;
  const hasChildren = children.length > 0 || kpiCount > 0;

  return (
    <View style={{ marginLeft: level * 12 }}>
      <TouchableOpacity
        style={[
          styles.objectiveCard,
          shadows.card,
          {
            backgroundColor: colors.card,
            borderLeftColor: badge.fg,
          },
        ]}
        onPress={() => hasChildren && setExpanded(!expanded)}
        activeOpacity={hasChildren ? 0.7 : 1}
      >
        <View style={styles.objectiveTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.objectiveName, { color: colors.text }]} numberOfLines={2}>
              {hasChildren && (expanded ? '▾ ' : '▸ ')}
              {objective.objectiveName ?? objective.name}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>
              {objective.statusName ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.objectiveMeta}>
          {objective.weight != null && (
            <View style={[styles.weightChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.weightText, { color: colors.primary }]}>
                {objective.weight}%
              </Text>
            </View>
          )}
          {kpiCount > 0 && (
            <View style={styles.kpiLinkChip}>
              <Text style={styles.kpiEmoji}>📊</Text>
              <Text style={[styles.kpiLinkText, { color: colors.textSecondary }]}>
                {kpiCount} KPI{kpiCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded &&
        children.map((child: any, i: number) => (
          <ObjectiveCard
            key={child.id ?? i}
            objective={child}
            level={level + 1}
            colors={colors}
            shadows={shadows}
          />
        ))}
    </View>
  );
};

const ObjectivesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { data, isLoading, isError, refetch, isFetching } = useGetStrategiesQuery();
  const [sortKey, setSortKey] = useState<ObjSort>('nameAsc');
  const [sortOpen, setSortOpen] = useState(false);

  if (isLoading && !isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const strategies = useMemo(() => {
    return asArray<any>(data).map((s) => ({
      ...s,
      objectives: Array.isArray(s.objectives) ? sortObjectivesTree(s.objectives, sortKey) : s.objectives,
    }));
  }, [data, sortKey]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{strategies.length}</Text>
          <Text> strategies · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<ObjSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort objectives"
        colors={colors}
        shadows={shadows}
      />
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
      }
    >
      {isError && (
        <TouchableOpacity
          onPress={() => refetch()}
          activeOpacity={0.75}
          style={{
            backgroundColor: `${colors.danger}14`,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
            {t('common.loadError', 'Could not load data. Tap to retry.')}
          </Text>
        </TouchableOpacity>
      )}
      {strategies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {isError ? t('common.loadError', 'Could not load data') : t('common.noData', 'No strategies found')}
          </Text>
        </View>
      ) : (
        strategies.map((strategy, si) => {
          const objectives: any[] = strategy.objectives ?? [];

          return (
            <View key={strategy.id ?? si}>
              {/* Strategy Card */}
              <View
                style={[styles.strategyCard, shadows.card, { backgroundColor: colors.secondary }]}
              >
                <Text style={styles.strategyEmoji}>🏛️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strategyName}>
                    {strategy.strategyName ?? strategy.name}
                  </Text>
                  <Text style={styles.strategyPeriod}>
                    {strategy.period ?? `${strategy.startYear ?? ''} — ${strategy.endYear ?? ''}`}
                  </Text>
                </View>
              </View>

              {/* Objectives Tree */}
              {objectives.map((obj, oi) => (
                <ObjectiveCard
                  key={obj.id ?? oi}
                  objective={obj}
                  level={0}
                  colors={colors}
                  shadows={shadows}
                />
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },

  strategyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  strategyEmoji: { fontSize: 28, marginRight: 12 },
  strategyName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
  strategyPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  objectiveCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  objectiveTop: { flexDirection: 'row', alignItems: 'flex-start' },
  objectiveName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  objectiveMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  weightChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  weightText: { fontSize: 11, fontWeight: '700' },
  kpiLinkChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiEmoji: { fontSize: 12 },
  kpiLinkText: { fontSize: 11, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default ObjectivesScreen;
