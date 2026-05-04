import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { useGetObjectivesQuery } from '../services/pmsApi';
import type { PmsObjective } from '../types';

type FilterKey = 'all' | 'mine';
type SortKey = 'priority' | 'kpiDesc' | 'nameAsc';

const ObjectivesListScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();
  const initialFilter: FilterKey = route?.params?.mineOnly ? 'mine' : 'all';
  const strategyId: number | undefined = route?.params?.strategyId;

  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const { data, isFetching, isLoading, refetch, isError } = useGetObjectivesQuery(strategyId);

  const list = useMemo(() => {
    let items = asArray<PmsObjective>(data);
    if (filter === 'mine') items = items.filter((o) => o.isMine === 1);
    switch (sortKey) {
      case 'priority':
        return [...items].sort((a, b) => (a.priorityOrder ?? 99) - (b.priorityOrder ?? 99));
      case 'kpiDesc':
        return [...items].sort((a, b) => (b.kpiCount ?? 0) - (a.kpiCount ?? 0));
      case 'nameAsc':
        return [...items].sort((a, b) =>
          (isAr ? (a.objectiveNameAr || a.objectiveName) : (a.objectiveName || a.objectiveNameAr))
            .localeCompare(isAr ? (b.objectiveNameAr || b.objectiveName) : (b.objectiveName || b.objectiveNameAr)),
        );
      default:
        return items;
    }
  }, [data, filter, sortKey, isAr]);

  const renderItem = ({ item }: { item: PmsObjective }) => {
    const name = isAr ? (item.objectiveNameAr || item.objectiveName) : (item.objectiveName || item.objectiveNameAr);
    const priority = isAr ? (item.priorityNameAr || item.priorityName) : (item.priorityName || item.priorityNameAr);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('PmsObjectiveDetail', {
          objectiveId: item.id,
          name,
        })}
      >
        <View style={styles.cardTopRow}>
          <Text style={[styles.code, { color: colors.textMuted }]} numberOfLines={1}>
            {item.code}
          </Text>
          {priority && (
            <View style={[styles.priorityChip, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[styles.priorityText, { color: colors.primary }]} numberOfLines={1}>
                {priority}
              </Text>
            </View>
          )}
          {item.isMine === 1 && (
            <View style={[styles.mineChip, { backgroundColor: `${colors.success}18` }]}>
              <Text style={[styles.mineText, { color: colors.success }]}>{t('pms.mine', 'Mine')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={3}>
          {name}
        </Text>
        <Text style={[styles.responsible, { color: colors.textSecondary }]} numberOfLines={1}>
          👤 {isAr ? (item.responsibleNameAr || item.responsibleName) : (item.responsibleName || item.responsibleNameAr)}
        </Text>
        <View style={styles.metaRow}>
          <MetaPill icon="🛠️" value={item.serviceCount} label={t('pms.services', 'Services')} colors={colors} />
          <MetaPill icon="📦" value={item.programCount} label={t('pms.programs', 'Programs')} colors={colors} />
          <MetaPill icon="📈" value={item.kpiCount} label={t('pms.kpis', 'KPIs')} colors={colors} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <View style={styles.toolbarRow}>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{list.length}</Text>{' '}
            {t('pms.objectives', 'Objectives')}
          </Text>
        </View>
        <View style={styles.pillRow}>
          {(['all', 'mine'] as FilterKey[]).map((f) => (
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
          {(['priority', 'kpiDesc', 'nameAsc'] as SortKey[]).map((s) => (
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
                {s === 'priority' ? t('pms.sortPriority', 'Priority') : s === 'kpiDesc' ? t('pms.sortKpis', 'KPIs') : t('pms.sortName', 'A→Z')}
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
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isFetching ? (
            <View style={styles.center}><ThemedActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isError
                  ? t('common.loadError', 'Could not load data')
                  : t('pms.noObjectives', 'No objectives match this filter')}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const MetaPill: React.FC<{ icon: string; value: number; label: string; colors: any }> = ({ icon, value, label, colors }) => (
  <View style={styles.metaPill}>
    <Text style={styles.metaIcon}>{icon}</Text>
    <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.metaLabel, { color: colors.textMuted }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center' },
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
  priorityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  mineChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mineText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  responsible: { fontSize: 12, marginTop: 6 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaValue: { fontSize: 13, fontWeight: '800' },
  metaLabel: { fontSize: 10, fontWeight: '600' },

  center: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

export default ObjectivesListScreen;
