import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { useGetMyKPIsQuery } from '../services/pmsApi';
import StatusBadge from '../components/StatusBadge';
import AttainmentBar from '../components/AttainmentBar';
import type { PmsKpi } from '../types';

type Filter = 'all' | 'mine';
type Sort = 'pctDesc' | 'pctAsc' | 'nameAsc' | 'recent';

const KpisListScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();

  const initialFilter: Filter = route?.params?.mineOnly ? 'mine' : 'all';
  const strategyId: number | undefined = route?.params?.strategyId;
  const objectiveId: number | undefined = route?.params?.objectiveId;
  const objectiveDetailId: number | undefined = route?.params?.objectiveDetailId;

  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [sortKey, setSortKey] = useState<Sort>('pctDesc');

  const params = {
    strategyId,
    objectiveId,
    objectiveDetailId,
    mineOnly: filter === 'mine',
  } as const;

  const q = useGetMyKPIsQuery(params);

  const list = useMemo(() => {
    const items = asArray<PmsKpi>(q.data);
    switch (sortKey) {
      case 'pctDesc':
        return [...items].sort((a, b) => (Number(b.attainmentPct ?? -1) - Number(a.attainmentPct ?? -1)));
      case 'pctAsc':
        return [...items].sort((a, b) => (Number(a.attainmentPct ?? 999) - Number(b.attainmentPct ?? 999)));
      case 'nameAsc':
        return [...items].sort((a, b) => nameOf(a, isAr).localeCompare(nameOf(b, isAr)));
      default:
        return items;
    }
  }, [q.data, sortKey, isAr]);

  const renderItem = ({ item }: { item: PmsKpi }) => {
    const name = nameOf(item, isAr);
    const owner = isAr ? (item.ownerNameAr || item.ownerName) : (item.ownerName || item.ownerNameAr);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('PmsKpiDetail', { kpiId: item.id, name })}
      >
        <View style={styles.cardTopRow}>
          <Text style={[styles.code, { color: colors.textMuted }]} numberOfLines={1}>
            {item.code || `KPI-${item.id}`}
          </Text>
          <StatusBadge status={item.statusName} colors={colors} />
          {item.isMine === 1 && (
            <View style={[styles.mineChip, { backgroundColor: `${colors.success}18` }]}>
              <Text style={[styles.mineText, { color: colors.success }]}>{t('pms.mine', 'Mine')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={3}>
          {name}
        </Text>
        {!!owner && (
          <Text style={[styles.subtle, { color: colors.textSecondary }]} numberOfLines={1}>
            👤 {owner}
          </Text>
        )}
        <View style={styles.targetRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.targetLabel, { color: colors.textMuted }]}>
              {t('pms.target', 'Target')}
            </Text>
            <Text style={[styles.targetValue, { color: colors.text }]}>
              {fmt(item.target)} {item.measuringUnit ? <Text style={[styles.unit, { color: colors.textMuted }]}>{item.measuringUnit}</Text> : null}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.targetLabel, { color: colors.textMuted }]}>
              {t('pms.actual', 'Actual')}
            </Text>
            <Text style={[styles.targetValue, { color: colors.text }]}>{fmt(item.actual)}</Text>
          </View>
        </View>
        <AttainmentBar pct={item.attainmentPct} colors={colors} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{list.length}</Text>{' '}
          {t('pms.kpis', 'KPIs')}
        </Text>
        <View style={styles.pillRow}>
          {(['all', 'mine'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              activeOpacity={0.75}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === f ? colors.primary : colors.background,
                  borderColor: filter === f ? colors.primary : colors.divider,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.text }]}>
                {f === 'all' ? t('pms.filterAll', 'All') : t('pms.filterMine', 'Mine')}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 8 }} />
          {(['pctDesc', 'pctAsc', 'nameAsc'] as Sort[]).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSortKey(s)}
              activeOpacity={0.75}
              style={[
                styles.sortPill,
                {
                  backgroundColor: sortKey === s ? `${colors.primary}18` : 'transparent',
                  borderColor: sortKey === s ? colors.primary : colors.divider,
                },
              ]}
            >
              <Text style={[styles.sortText, { color: sortKey === s ? colors.primary : colors.textSecondary }]}>
                {s === 'pctDesc'
                  ? t('pms.sortPctDesc', 'Top %')
                  : s === 'pctAsc'
                  ? t('pms.sortPctAsc', 'Bottom %')
                  : t('pms.sortName', 'A→Z')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <ThemedRefreshControl isFetching={q.isFetching} isLoading={q.isLoading} onRefresh={q.refetch} />
        }
        ListEmptyComponent={
          q.isFetching ? (
            <View style={styles.center}><ThemedActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>📈</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {q.isError ? t('common.loadError', 'Could not load data') : t('pms.noKpis', 'No KPIs match this filter')}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

function nameOf(item: PmsKpi, isAr: boolean): string {
  return isAr ? (item.kpiNameAr || item.kpiName) : (item.kpiName || item.kpiNameAr);
}

function fmt(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString();
  return String(v);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { borderBottomWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  toolbarLabel: { fontSize: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '700' },
  sortPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  sortText: { fontSize: 11, fontWeight: '700' },

  listContent: { padding: 14, paddingBottom: 32, gap: 10 },
  card: { borderRadius: 12, padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  code: { fontSize: 11, fontWeight: '700', flex: 1 },
  mineChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mineText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  subtle: { fontSize: 12, marginTop: 6 },
  targetRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 8 },
  targetLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  targetValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  unit: { fontSize: 11, fontWeight: '600' },

  center: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

export default KpisListScreen;
