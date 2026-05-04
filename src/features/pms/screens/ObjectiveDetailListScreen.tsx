import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { useGetServicesQuery, useGetProgramsQuery } from '../services/pmsApi';
import StatusBadge from '../components/StatusBadge';
import type { PmsObjectiveDetail } from '../types';

type Mode = 'services' | 'programs';
type Filter = 'all' | 'mine';
type Sort = 'recent' | 'nameAsc' | 'kpiDesc' | 'activityDesc';

/**
 * Shared list for Main Services (TypeID 1/7) and Programs (TypeID 2/8).
 * Differs only by which RTK query is used and copy.
 */
function makeScreen(mode: Mode) {
  const Screen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language?.startsWith('ar');
    const { colors, shadows } = useTheme();
    const initialFilter: Filter = route?.params?.mineOnly ? 'mine' : 'all';
    const objectiveId: number | undefined = route?.params?.objectiveId;
    const strategyId: number | undefined = route?.params?.strategyId;

    const [filter, setFilter] = useState<Filter>(initialFilter);
    const [sortKey, setSortKey] = useState<Sort>('recent');

    const params = {
      strategyId,
      objectiveId,
      mineOnly: filter === 'mine',
    } as const;

    const servicesQ = useGetServicesQuery(params, { skip: mode !== 'services' });
    const programsQ = useGetProgramsQuery(params, { skip: mode !== 'programs' });
    const q = mode === 'services' ? servicesQ : programsQ;

    const list = useMemo(() => {
      const items = asArray<PmsObjectiveDetail>(q.data);
      switch (sortKey) {
        case 'nameAsc':
          return [...items].sort((a, b) => nameOf(a, isAr).localeCompare(nameOf(b, isAr)));
        case 'kpiDesc':
          return [...items].sort((a, b) => (b.kpiCount ?? 0) - (a.kpiCount ?? 0));
        case 'activityDesc':
          return [...items].sort((a, b) => (b.activityCount ?? 0) - (a.activityCount ?? 0));
        default:
          return items;
      }
    }, [q.data, sortKey, isAr]);

    const renderItem = ({ item }: { item: PmsObjectiveDetail }) => {
      const name = nameOf(item, isAr);
      const responsible = isAr
        ? (item.responsibleNameAr || item.responsibleName)
        : (item.responsibleName || item.responsibleNameAr);
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
          onPress={() =>
            navigation.navigate('PmsObjectiveDetailHeader', {
              id: item.id,
              name,
              kind: mode,
            })
          }
        >
          <View style={styles.cardTopRow}>
            <Text style={[styles.code, { color: colors.textMuted }]} numberOfLines={1}>
              {item.code || (mode === 'services' ? 'SVC' : 'PRG')}
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
          {!!responsible && (
            <Text style={[styles.subtle, { color: colors.textSecondary }]} numberOfLines={1}>
              👤 {responsible}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Meta icon="📈" value={item.kpiCount} label={t('pms.kpis', 'KPIs')} colors={colors} />
            <Meta icon="🧩" value={item.activityCount} label={t('pms.activities', 'Activities')} colors={colors} />
            <Meta icon="📦" value={item.deliverableCount} label={t('pms.deliverables', 'Deliverables')} colors={colors} />
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{list.length}</Text>{' '}
            {mode === 'services' ? t('pms.services', 'Services') : t('pms.programs', 'Programs')}
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
            {(['recent', 'nameAsc', 'kpiDesc', 'activityDesc'] as Sort[]).map((s) => (
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
                  {s === 'recent'
                    ? t('pms.sortRecent', 'Recent')
                    : s === 'nameAsc'
                    ? t('pms.sortName', 'A→Z')
                    : s === 'kpiDesc'
                    ? t('pms.sortKpis', 'KPIs')
                    : t('pms.sortActivities', 'Activities')}
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
                <Text style={styles.emptyEmoji}>{mode === 'services' ? '🛠️' : '📦'}</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {q.isError ? t('common.loadError', 'Could not load data') : t('pms.noResults', 'No matches')}
                </Text>
              </View>
            )
          }
        />
      </View>
    );
  };
  return Screen;
}

function nameOf(item: PmsObjectiveDetail, isAr: boolean): string {
  if (isAr) {
    return item.serviceNameAr || item.programNameAr || item.nameAr ||
      item.serviceName || item.programName || item.name || '';
  }
  return item.serviceName || item.programName || item.name ||
    item.serviceNameAr || item.programNameAr || item.nameAr || '';
}

const Meta: React.FC<{ icon: string; value: number; label: string; colors: any }> = ({ icon, value, label, colors }) => (
  <View style={styles.metaPill}>
    <Text style={styles.metaIcon}>{icon}</Text>
    <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.metaLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
  </View>
);

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
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaValue: { fontSize: 13, fontWeight: '800' },
  metaLabel: { fontSize: 10, fontWeight: '600' },

  center: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

export const ServicesListScreen = makeScreen('services');
export const ProgramsListScreen = makeScreen('programs');
