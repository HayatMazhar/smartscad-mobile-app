import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import {
  useGetObjectivesQuery,
  useGetServicesQuery,
  useGetProgramsQuery,
  useGetMyKPIsQuery,
} from '../services/pmsApi';
import StatusBadge from '../components/StatusBadge';
import AttainmentBar from '../components/AttainmentBar';
import QueryStates from '../../../shared/components/QueryStates';
import type { PmsObjective, PmsObjectiveDetail, PmsKpi } from '../types';

const PmsObjectiveDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();
  const objectiveId: number = route?.params?.objectiveId;

  const objectivesQ = useGetObjectivesQuery(undefined);
  const servicesQ = useGetServicesQuery({ objectiveId });
  const programsQ = useGetProgramsQuery({ objectiveId });
  const kpisQ = useGetMyKPIsQuery({ objectiveId });

  const objective = useMemo(() => {
    const all = asArray<PmsObjective>(objectivesQ.data);
    return all.find((o) => o.id === objectiveId || o.objectiveId === objectiveId);
  }, [objectivesQ.data, objectiveId]);

  const services = useMemo(() => asArray<PmsObjectiveDetail>(servicesQ.data), [servicesQ.data]);
  const programs = useMemo(() => asArray<PmsObjectiveDetail>(programsQ.data), [programsQ.data]);
  const kpis = useMemo(() => asArray<PmsKpi>(kpisQ.data), [kpisQ.data]);

  const refreshAll = () => {
    objectivesQ.refetch();
    servicesQ.refetch();
    programsQ.refetch();
    kpisQ.refetch();
  };

  const name = objective
    ? (isAr ? (objective.objectiveNameAr || objective.objectiveName) : (objective.objectiveName || objective.objectiveNameAr))
    : '';
  const description = objective
    ? (isAr ? (objective.descriptionAr || objective.description) : (objective.description || objective.descriptionAr))
    : '';
  const responsible = objective
    ? (isAr ? (objective.responsibleNameAr || objective.responsibleName) : (objective.responsibleName || objective.responsibleNameAr))
    : '';
  const priority = objective
    ? (isAr ? (objective.priorityNameAr || objective.priorityName) : (objective.priorityName || objective.priorityNameAr))
    : '';
  const strategyName = objective
    ? (isAr ? (objective.strategyNameAr || objective.strategyName) : (objective.strategyName || objective.strategyNameAr))
    : '';

  return (
    <QueryStates
      loading={objectivesQ.isLoading && !objective}
      apiError={!!(objectivesQ.isError && !objective)}
      error={objectivesQ.error}
      isRefreshing={objectivesQ.isFetching || servicesQ.isFetching || programsQ.isFetching || kpisQ.isFetching}
      onRetry={() => void refreshAll()}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {!objective ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.noObjective', 'Objective not found')}
          </Text>
        </View>
      ) : (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <ThemedRefreshControl
          isFetching={
            objectivesQ.isFetching || servicesQ.isFetching || programsQ.isFetching || kpisQ.isFetching
          }
          isLoading={
            objectivesQ.isLoading || servicesQ.isLoading || programsQ.isLoading || kpisQ.isLoading
          }
          onRefresh={refreshAll}
        />
      }
    >
      {/* Hero */}
      <View style={[styles.hero, shadows.card, { backgroundColor: colors.secondary }]}>
        <View style={styles.heroRow}>
          <Text style={styles.heroCode} numberOfLines={1}>{objective.code}</Text>
          {!!priority && (
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{priority}</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroName}>{name}</Text>
        {!!description && <Text style={styles.heroDesc} numberOfLines={4}>{description}</Text>}
      </View>

      {/* Counts */}
      <View style={styles.statsRow}>
        <StatTile label={t('pms.services', 'Services')} value={objective.serviceCount} icon="🛠️" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.programs', 'Programs')} value={objective.programCount} icon="📦" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.kpis', 'KPIs')} value={objective.kpiCount} icon="📈" colors={colors} shadows={shadows} />
      </View>

      {/* Context */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <DataRow label={t('pms.strategy', 'Strategy')} value={strategyName} colors={colors} />
        <DataRow label={t('pms.responsible', 'Responsible')} value={responsible} colors={colors} />
        {objective.priorityName && <DataRow label={t('pms.priority', 'Priority')} value={priority || ''} colors={colors} />}
      </View>

      {/* Services */}
      {services.length > 0 && (
        <SectionList
          title={t('pms.services', 'Services')}
          icon="🛠️"
          colors={colors}
          shadows={shadows}
          items={services}
          isAr={isAr}
          onPressItem={(item) => navigation.navigate('PmsObjectiveDetailHeader', { id: item.id, name: nameOfDetail(item, isAr), kind: 'services' })}
          onSeeAll={() => navigation.navigate('PmsServicesList', { objectiveId })}
          t={t}
        />
      )}

      {/* Programs */}
      {programs.length > 0 && (
        <SectionList
          title={t('pms.programs', 'Programs')}
          icon="📦"
          colors={colors}
          shadows={shadows}
          items={programs}
          isAr={isAr}
          onPressItem={(item) => navigation.navigate('PmsObjectiveDetailHeader', { id: item.id, name: nameOfDetail(item, isAr), kind: 'programs' })}
          onSeeAll={() => navigation.navigate('PmsProgramsList', { objectiveId })}
          t={t}
        />
      )}

      {/* KPIs */}
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 {t('pms.kpis', 'KPIs')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{kpis.length}</Text>
          {kpis.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('PmsKpisList', { objectiveId })} activeOpacity={0.75}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll', 'See all')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {kpis.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('pms.noKpis', 'No KPIs match this filter')}</Text>
        </View>
      ) : (
        kpis.slice(0, 5).map((k) => {
          const kn = isAr ? (k.kpiNameAr || k.kpiName) : (k.kpiName || k.kpiNameAr);
          return (
            <TouchableOpacity
              key={k.id}
              activeOpacity={0.85}
              style={[styles.kpiCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('PmsKpiDetail', { kpiId: k.id, name: kn })}
            >
              <View style={styles.kpiTopRow}>
                <Text style={[styles.kpiCode, { color: colors.textMuted }]} numberOfLines={1}>
                  {k.code || `KPI-${k.id}`}
                </Text>
                <StatusBadge status={k.statusName} colors={colors} />
              </View>
              <Text style={[styles.kpiName, { color: colors.text }]} numberOfLines={2}>{kn}</Text>
              <AttainmentBar pct={k.attainmentPct} colors={colors} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
      )}
    </QueryStates>
  );
};

const SectionList: React.FC<{
  title: string; icon: string; colors: any; shadows: any;
  items: PmsObjectiveDetail[]; isAr: boolean | undefined;
  onPressItem: (item: PmsObjectiveDetail) => void;
  onSeeAll: () => void; t: any;
}> = ({ title, icon, colors, shadows, items, isAr, onPressItem, onSeeAll, t }) => (
  <>
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{icon} {title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{items.length}</Text>
        {items.length > 3 && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.75}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll', 'See all')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    {items.slice(0, 3).map((item) => (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}
        onPress={() => onPressItem(item)}
      >
        <View style={styles.itemTopRow}>
          <Text style={[styles.itemCode, { color: colors.textMuted }]} numberOfLines={1}>{item.code}</Text>
          <StatusBadge status={item.statusName} colors={colors} />
        </View>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
          {nameOfDetail(item, isAr)}
        </Text>
        <View style={styles.itemMetaRow}>
          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
            📈 {item.kpiCount} · 🧩 {item.activityCount} · 📦 {item.deliverableCount}
          </Text>
        </View>
      </TouchableOpacity>
    ))}
  </>
);

const DataRow: React.FC<{ label: string; value?: string | null; colors: any }> = ({ label, value, colors }) => (
  <View style={styles.dataRow}>
    <Text style={[styles.dataLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.dataValue, { color: colors.text }]} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const StatTile: React.FC<{ icon: string; label: string; value: number; colors: any; shadows: any }> = ({
  icon, label, value, colors, shadows,
}) => (
  <View style={[styles.statTile, shadows.card, { backgroundColor: colors.card }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
  </View>
);

function nameOfDetail(item: PmsObjectiveDetail, isAr: boolean | undefined): string {
  if (isAr) {
    return item.serviceNameAr || item.programNameAr || item.nameAr ||
      item.serviceName || item.programName || item.name || '';
  }
  return item.serviceName || item.programName || item.name ||
    item.serviceNameAr || item.programNameAr || item.nameAr || '';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  hero: { borderRadius: 14, padding: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroCode: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', flex: 1 },
  heroChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 8, lineHeight: 23 },
  heroDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 6, lineHeight: 17 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statTile: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  card: { borderRadius: 12, padding: 14 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  dataLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  dataValue: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  seeAll: { fontSize: 12, fontWeight: '700' },

  itemCard: { borderRadius: 12, padding: 12 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemCode: { fontSize: 11, fontWeight: '700', flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  itemMetaRow: { marginTop: 6 },
  itemMeta: { fontSize: 11, fontWeight: '600' },

  kpiCard: { borderRadius: 12, padding: 12 },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  kpiCode: { fontSize: 11, fontWeight: '700', flex: 1 },
  kpiName: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 8 },

  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

export default PmsObjectiveDetailScreen;
