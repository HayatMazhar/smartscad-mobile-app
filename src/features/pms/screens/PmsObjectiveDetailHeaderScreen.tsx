import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import {
  useGetObjectiveDetailQuery,
  useGetObjectiveDetailActivitiesQuery,
  useGetObjectiveDetailDeliverablesQuery,
  useGetMyKPIsQuery,
} from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import StatusBadge from '../components/StatusBadge';
import AttainmentBar from '../components/AttainmentBar';
import QueryStates from '../../../shared/components/QueryStates';
import type { PmsObjectiveDetail, PmsActivity, PmsDeliverable, PmsKpi } from '../types';

/**
 * Generic Service / Program detail page (Mode is decided by route.params.kind).
 * Mirrors the legacy `PMS\Views\Service\Details.cshtml` and
 * `PMS\Views\Program\Details.cshtml` layouts on a single mobile screen.
 */
const PmsObjectiveDetailHeaderScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();
  const id: number = route?.params?.id;
  const kind: 'services' | 'programs' = route?.params?.kind || 'services';
  const { canApproveKpi, canEditObjectiveDetail } = usePmsRoles();

  const headerQ = useGetObjectiveDetailQuery(id);
  const activitiesQ = useGetObjectiveDetailActivitiesQuery(id);
  const deliverablesQ = useGetObjectiveDetailDeliverablesQuery(id);
  const kpisQ = useGetMyKPIsQuery({ objectiveDetailId: id });

  const item = useMemo(
    () => asObject<PmsObjectiveDetail>((headerQ.data as any)?.data ?? headerQ.data),
    [headerQ.data],
  );
  const activities = useMemo(() => asArray<PmsActivity>(activitiesQ.data), [activitiesQ.data]);
  const deliverables = useMemo(() => asArray<PmsDeliverable>(deliverablesQ.data), [deliverablesQ.data]);
  const kpis = useMemo(() => asArray<PmsKpi>(kpisQ.data), [kpisQ.data]);

  const refreshAll = () => {
    headerQ.refetch();
    activitiesQ.refetch();
    deliverablesQ.refetch();
    kpisQ.refetch();
  };

  const name = item ? nameOfDetail(item, isAr) : '';
  const description = item
    ? (isAr ? (item.descriptionAr || item.description) : (item.description || item.descriptionAr))
    : '';
  const responsible = item
    ? (isAr ? (item.responsibleNameAr || item.responsibleName) : (item.responsibleName || item.responsibleNameAr))
    : '';
  const owner = item
    ? (isAr ? (item.ownerNameAr || item.ownerName) : (item.ownerName || item.ownerNameAr))
    : '';
  const businessOwner = item
    ? (isAr ? (item.businessOwnerNameAr || item.businessOwnerName) : (item.businessOwnerName || item.businessOwnerNameAr))
    : '';
  const objectiveName = item
    ? (isAr ? (item.objectiveNameAr || item.objectiveName) : (item.objectiveName || item.objectiveNameAr))
    : '';
  const strategyName = item
    ? (isAr ? (item.strategyNameAr || item.strategyName) : (item.strategyName || item.strategyNameAr))
    : '';
  const typeName = item
    ? (isAr ? (item.typeNameAr || item.typeName) : (item.typeName || item.typeNameAr))
    : '';

  const isPending = item
    ? ((item.statusName ?? '').toLowerCase().includes('submit') || (item.statusName ?? '').toLowerCase().includes('pend'))
    : false;
  const showApprove = !!(item && canApproveKpi && isPending);
  const showEdit = !!(item && canEditObjectiveDetail);

  return (
    <QueryStates
      loading={headerQ.isLoading && !item}
      apiError={!!(headerQ.isError && !item)}
      error={headerQ.error}
      isRefreshing={headerQ.isFetching || activitiesQ.isFetching || deliverablesQ.isFetching || kpisQ.isFetching}
      onRetry={() => void refreshAll()}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {!item ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.notFound', 'Item not found')}
          </Text>
        </View>
      ) : (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <ThemedRefreshControl
          isFetching={
            headerQ.isFetching || activitiesQ.isFetching || deliverablesQ.isFetching || kpisQ.isFetching
          }
          isLoading={
            headerQ.isLoading || activitiesQ.isLoading || deliverablesQ.isLoading || kpisQ.isLoading
          }
          onRefresh={refreshAll}
        />
      }
    >
      {/* Hero */}
      <View style={[styles.hero, shadows.card, { backgroundColor: colors.secondary }]}>
        <View style={styles.heroRow}>
          <Text style={styles.heroLabel}>
            {kind === 'services' ? t('pms.service', 'Service') : t('pms.program', 'Program')}
          </Text>
          <Text style={styles.heroCode} numberOfLines={1}>{item.code}</Text>
          {!!typeName && (
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{typeName}</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroName}>{name}</Text>
        <View style={styles.heroStatusRow}>
          <StatusBadge
            status={item.statusName}
            colors={{ ...colors, success: '#FFFFFF', primary: '#FFFFFF', danger: '#FFFFFF', warning: '#FFFFFF', textMuted: '#FFFFFF', textSecondary: '#FFFFFF' }}
            size="md"
          />
          {item.isMine === 1 && (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>{t('pms.mine', 'Mine')}</Text>
            </View>
          )}
        </View>
        {!!description && (
          <Text style={styles.heroDesc} numberOfLines={5}>{description}</Text>
        )}
      </View>

      {/* Counts */}
      <View style={styles.statsRow}>
        <StatTile label={t('pms.kpis', 'KPIs')} value={item.kpiCount} icon="📈" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.activities', 'Activities')} value={item.activityCount} icon="🧩" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.deliverables', 'Deliverables')} value={item.deliverableCount} icon="📦" colors={colors} shadows={shadows} />
      </View>

      {/* Context / People */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pms.context', 'Context')}</Text>
        {!!strategyName && <DataRow label={t('pms.strategy', 'Strategy')} value={strategyName} colors={colors} />}
        {!!objectiveName && <DataRow label={t('pms.objective', 'Objective')} value={objectiveName} colors={colors} />}
        {!!item.startDate && <DataRow label={t('pms.startDate', 'Start')} value={item.startDate.split('T')[0]} colors={colors} />}
        {!!item.endDate && <DataRow label={t('pms.endDate', 'End')} value={item.endDate.split('T')[0]} colors={colors} />}
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pms.people', 'People')}</Text>
        <DataRow label={t('pms.responsible', 'Responsible')} value={responsible} colors={colors} />
        {!!owner && <DataRow label={t('pms.owner', 'Owner')} value={owner} colors={colors} />}
        {!!businessOwner && <DataRow label={t('pms.businessOwner', 'Business Owner')} value={businessOwner} colors={colors} />}
        {!!item.approvedDate && (
          <DataRow label={t('pms.approvedDate', 'Approved')} value={item.approvedDate.split('T')[0]} colors={colors} />
        )}
      </View>

      {/* KPIs */}
      <Section
        title={t('pms.kpis', 'KPIs')}
        icon="📈"
        count={kpis.length}
        seeAll={kpis.length > 5 ? () => navigation.navigate('PmsKpisList', { objectiveDetailId: id }) : undefined}
        emptyText={t('pms.noKpis', 'No KPIs match this filter')}
        colors={colors}
        shadows={shadows}
        t={t}
      >
        {kpis.slice(0, 5).map((k) => {
          const kn = isAr ? (k.kpiNameAr || k.kpiName) : (k.kpiName || k.kpiNameAr);
          return (
            <TouchableOpacity
              key={k.id}
              activeOpacity={0.85}
              style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('PmsKpiDetail', { kpiId: k.id, name: kn })}
            >
              <View style={styles.itemTopRow}>
                <Text style={[styles.itemCode, { color: colors.textMuted }]} numberOfLines={1}>
                  {k.code || `KPI-${k.id}`}
                </Text>
                <StatusBadge status={k.statusName} colors={colors} />
              </View>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{kn}</Text>
              <AttainmentBar pct={k.attainmentPct} colors={colors} />
            </TouchableOpacity>
          );
        })}
      </Section>

      {/* Activities */}
      <Section
        title={t('pms.activities', 'Activities')}
        icon="🧩"
        count={activities.length}
        emptyText={t('pms.noActivities', 'No activities yet')}
        colors={colors}
        shadows={shadows}
        t={t}
      >
        {activities.map((a) => {
          const an = isAr ? (a.nameAr || a.name) : (a.name || a.nameAr);
          const ar = isAr ? (a.responsibleNameAr || a.responsibleName) : (a.responsibleName || a.responsibleNameAr);
          return (
            <View key={a.id} style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.itemTopRow}>
                <StatusBadge status={a.statusName} colors={colors} />
                {a.isMine === 1 && (
                  <View style={[styles.mineChip, { backgroundColor: `${colors.success}18` }]}>
                    <Text style={[styles.mineText, { color: colors.success }]}>{t('pms.mine', 'Mine')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{an}</Text>
              {!!ar && (
                <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>👤 {ar}</Text>
              )}
              {(a.startDate || a.endDate) && (
                <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
                  📅 {a.startDate?.split('T')[0]} → {a.endDate?.split('T')[0]}
                </Text>
              )}
              {(a.kpiCount ?? 0) > 0 && (
                <Text style={[styles.itemSub, { color: colors.textMuted }]}>📈 {a.kpiCount} {t('pms.kpis', 'KPIs')}</Text>
              )}
            </View>
          );
        })}
      </Section>

      {/* Deliverables */}
      <Section
        title={t('pms.deliverables', 'Deliverables')}
        icon="📦"
        count={deliverables.length}
        emptyText={t('pms.noDeliverables', 'No deliverables yet')}
        colors={colors}
        shadows={shadows}
        t={t}
      >
        {deliverables.map((d) => {
          const dn = isAr ? (d.nameAr || d.name) : (d.name || d.nameAr);
          const an = isAr ? (d.assignedToNameAr || d.assignedToName) : (d.assignedToName || d.assignedToNameAr);
          return (
            <View key={d.id} style={[styles.itemCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.itemTopRow}>
                <StatusBadge status={d.approvalStatusName} colors={colors} />
                {d.isMine === 1 && (
                  <View style={[styles.mineChip, { backgroundColor: `${colors.success}18` }]}>
                    <Text style={[styles.mineText, { color: colors.success }]}>{t('pms.mine', 'Mine')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{dn}</Text>
              {!!an && (
                <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>👤 {an}</Text>
              )}
              {(d.startDate || d.endDate) && (
                <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
                  📅 {d.startDate?.split('T')[0]} → {d.endDate?.split('T')[0]}
                </Text>
              )}
              {d.completion != null && (
                <View style={{ marginTop: 8 }}>
                  <AttainmentBar pct={d.completion} colors={colors} />
                </View>
              )}
            </View>
          );
        })}
      </Section>

      {/* Actions */}
      {(showApprove || showEdit) && (
        <View style={[styles.actionRow, shadows.card, { backgroundColor: colors.card }]}>
          {showEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PmsObjectiveDetailEdit', { id, kind, name })}
            >
              <Text style={styles.actionText}>✎ {t('common.edit', 'Edit')}</Text>
            </TouchableOpacity>
          )}
          {showApprove && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PmsObjectiveDetailApprove', { id, kind, name })}
            >
              <Text style={styles.actionText}>✓ {t('pms.approve', 'Approve')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
      )}
    </QueryStates>
  );
};

const Section: React.FC<{
  title: string; icon: string; count: number; emptyText: string;
  colors: any; shadows: any; t: any;
  seeAll?: () => void;
  children: React.ReactNode;
}> = ({ title, icon, count, emptyText, colors, shadows, t, seeAll, children }) => (
  <>
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{icon} {title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{count}</Text>
        {seeAll && (
          <TouchableOpacity onPress={seeAll} activeOpacity={0.75}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll', 'See all')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    {count === 0 ? (
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
        <Text style={styles.emptyEmoji}>{icon}</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
      </View>
    ) : (
      children
    )}
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
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroCode: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', flex: 1 },
  heroChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 8, lineHeight: 23 },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  mineBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)' },
  mineBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heroDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 8, lineHeight: 17 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statTile: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  card: { borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  dataRow: { paddingVertical: 8, gap: 4 },
  dataLabel: { fontSize: 12, fontWeight: '600' },
  dataValue: { fontSize: 13, fontWeight: '700', lineHeight: 18 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  seeAll: { fontSize: 12, fontWeight: '700' },

  itemCard: { borderRadius: 12, padding: 12 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemCode: { fontSize: 11, fontWeight: '700', flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginVertical: 4 },
  itemSub: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  mineChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mineText: { fontSize: 10, fontWeight: '700' },

  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },

  actionRow: { borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', minWidth: 120 },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

export default PmsObjectiveDetailHeaderScreen;
