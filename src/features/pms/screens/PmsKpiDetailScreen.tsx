import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import { useGetKPIDetailsQuery, useGetKPITargetsQuery } from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import StatusBadge from '../components/StatusBadge';
import AttainmentBar from '../components/AttainmentBar';
import QueryStates from '../../../shared/components/QueryStates';
import type { PmsKpiDetail, PmsKpiTarget } from '../types';

const PmsKpiDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();
  const kpiId: number = route?.params?.kpiId;
  const { canApproveKpiDefinition, canRevokeApproval, canEnterKpiResult } = usePmsRoles();

  const detailQ = useGetKPIDetailsQuery(kpiId);
  const targetsQ = useGetKPITargetsQuery(kpiId);

  const kpi = useMemo(
    () => asObject<PmsKpiDetail>((detailQ.data as any)?.data ?? detailQ.data),
    [detailQ.data],
  );
  const targets = useMemo(
    () => asArray<PmsKpiTarget>(targetsQ.data),
    [targetsQ.data],
  );

  const refreshAll = () => {
    detailQ.refetch();
    targetsQ.refetch();
  };

  const loading = detailQ.isLoading || (!kpi && !detailQ.isError);
  const fatalDetailError = !!(detailQ.isError && !kpi);

  let detailBody: React.ReactElement | null = null;
  if (kpi) {
    const name = isAr ? (kpi.kpiNameAr || kpi.kpiName) : (kpi.kpiName || kpi.kpiNameAr);
    const description = isAr ? (kpi.descriptionAr || kpi.description) : (kpi.description || kpi.descriptionAr);
    const ownerName = isAr ? (kpi.ownerNameAr || kpi.ownerName) : (kpi.ownerName || kpi.ownerNameAr);
    const responsibleName = isAr
      ? (kpi.responsibleNameAr || kpi.responsibleName)
      : (kpi.responsibleName || kpi.responsibleNameAr);
    const objectiveName = isAr ? (kpi.objectiveNameAr || kpi.objectiveName) : (kpi.objectiveName || kpi.objectiveNameAr);
    const detailName = isAr ? (kpi.objectiveDetailNameAr || kpi.objectiveDetailName) : (kpi.objectiveDetailName || kpi.objectiveDetailNameAr);

    const isApproved = !!kpi.approvedDate;
    const showApprove = canApproveKpiDefinition && !isApproved;
    const showRevoke = canRevokeApproval && isApproved;
    const isMine =
      kpi.isMine === 1 ||
      !!kpi.callerIsResponsible ||
      !!kpi.callerIsDataEntry ||
      !!kpi.callerIsApprover;
    const showEnterResult = canEnterKpiResult && (isMine || canApproveKpiDefinition) && !!targets.length;
    const latestTarget = targets[0];

    detailBody = (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <ThemedRefreshControl
          isFetching={detailQ.isFetching || targetsQ.isFetching}
          isLoading={detailQ.isLoading || targetsQ.isLoading}
          onRefresh={refreshAll}
        />
      }
    >
      {/* Hero */}
      <View style={[styles.hero, shadows.card, { backgroundColor: colors.secondary }]}>
        <View style={styles.heroRow}>
          <Text style={styles.heroCode} numberOfLines={1}>{kpi.code || `KPI-${kpi.id}`}</Text>
          <StatusBadge status={kpi.statusName} colors={{ ...colors, success: '#FFFFFF', primary: '#FFFFFF', danger: '#FFFFFF', warning: '#FFFFFF', textMuted: '#FFFFFF', textSecondary: '#FFFFFF' }} size="md" />
        </View>
        <Text style={styles.heroName}>{name}</Text>
        {!!description && <Text style={styles.heroDesc} numberOfLines={5}>{description}</Text>}
      </View>

      {/* Attainment + values */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.targetRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.target', 'Target')}</Text>
            <Text style={[styles.bigValue, { color: colors.text }]}>
              {fmt(kpi.target)} {kpi.measuringUnit ? <Text style={[styles.unit, { color: colors.textMuted }]}>{kpi.measuringUnit}</Text> : null}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.actual', 'Actual')}</Text>
            <Text style={[styles.bigValue, { color: colors.text }]}>{fmt(kpi.actual)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.baseline', 'Baseline')}</Text>
            <Text style={[styles.bigValue, { color: colors.text }]}>{fmt(kpi.baseline)}</Text>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <AttainmentBar pct={kpi.attainmentPct} colors={colors} height={10} />
        </View>
      </View>

      {/* People */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pms.people', 'People')}</Text>
        <PersonRow label={t('pms.owner', 'Owner')} name={ownerName} colors={colors} />
        <PersonRow label={t('pms.responsible', 'Responsible')} name={responsibleName} colors={colors} />
        {!!kpi.dataEntryName && (
          <PersonRow label={t('pms.dataEntry', 'Data Entry')} name={isAr ? (kpi.dataEntryNameAr || kpi.dataEntryName) : kpi.dataEntryName} colors={colors} />
        )}
        {!!kpi.approverName && (
          <PersonRow label={t('pms.approver', 'Approver')} name={isAr ? (kpi.approverNameAr || kpi.approverName) : kpi.approverName} colors={colors} />
        )}
        {!!kpi.viewerName && (
          <PersonRow label={t('pms.viewer', 'Viewer')} name={kpi.viewerName} colors={colors} />
        )}
      </View>

      {/* Hierarchy / context */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pms.context', 'Context')}</Text>
        {!!kpi.strategyName && (
          <DataRow label={t('pms.strategy', 'Strategy')} value={isAr ? (kpi.strategyNameAr || kpi.strategyName) : kpi.strategyName} colors={colors} />
        )}
        {!!objectiveName && (
          <DataRow label={t('pms.objective', 'Objective')} value={objectiveName} colors={colors} />
        )}
        {!!detailName && (
          <DataRow label={t('pms.serviceOrProgram', 'Service / Program')} value={detailName} colors={colors} />
        )}
        {!!kpi.measuringCycleId && (
          <DataRow label={t('pms.cycle', 'Cycle ID')} value={String(kpi.measuringCycleId)} colors={colors} />
        )}
        {!!kpi.dueDate && (
          <DataRow label={t('pms.dueDate', 'Due')} value={kpi.dueDate.split('T')[0]} colors={colors} />
        )}
      </View>

      {/* Targets / results */}
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('pms.targets', 'Targets / Results')}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{targets.length}</Text>
      </View>

      {targets.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.noTargets', 'No targets defined yet')}
          </Text>
        </View>
      ) : (
        targets.map((trg) => (
          <View key={trg.id} style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            <View style={styles.targetTopRow}>
              <Text style={[styles.targetCode, { color: colors.textMuted }]} numberOfLines={1}>
                {trg.code || `T-${trg.id}`}
              </Text>
              {!!trg.dueDate && (
                <Text style={[styles.targetDue, { color: colors.textSecondary }]}>
                  {trg.dueDate.split('T')[0]}
                </Text>
              )}
              {trg.approved === 1 ? (
                <View style={[styles.smallChip, { backgroundColor: `${colors.success}18` }]}>
                  <Text style={[styles.smallChipText, { color: colors.success }]}>✓ {t('pms.approved', 'Approved')}</Text>
                </View>
              ) : (
                <View style={[styles.smallChip, { backgroundColor: `${colors.warning}18` }]}>
                  <Text style={[styles.smallChipText, { color: colors.warning }]}>{t('pms.pending', 'Pending')}</Text>
                </View>
              )}
            </View>
            <View style={styles.targetRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.target', 'Target')}</Text>
                <Text style={[styles.midValue, { color: colors.text }]}>{fmt(trg.target)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.actual', 'Actual')}</Text>
                <Text style={[styles.midValue, { color: colors.text }]}>{fmt(trg.actual)}</Text>
              </View>
            </View>
            <AttainmentBar pct={trg.attainmentPct} colors={colors} />
            {!!trg.mainHighlights && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.highlights', 'Highlights')}</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{trg.mainHighlights}</Text>
              </View>
            )}
            {!!trg.challenges && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.challenges', 'Challenges')}</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{trg.challenges}</Text>
              </View>
            )}
            {!!trg.nextActions && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.nextActions', 'Next actions')}</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{trg.nextActions}</Text>
              </View>
            )}
          </View>
        ))
      )}

      {/* Actions */}
      {(showApprove || showRevoke || showEnterResult) && (
        <View style={[styles.actionRow, shadows.card, { backgroundColor: colors.card }]}>
          {showEnterResult && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('PmsKpiEnterResult', {
                  kpiId: kpi.id,
                  name,
                  kpiTargetId: kpi.latestTargetId ?? latestTarget?.id ?? null,
                  measuringUnit: kpi.measuringUnit,
                })
              }
            >
              <Text style={styles.actionText}>{t('pms.enterResult', 'Enter Result')}</Text>
            </TouchableOpacity>
          )}
          {showApprove && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PmsKpiApprove', { kpiId: kpi.id, name })}
            >
              <Text style={styles.actionText}>✓ {t('pms.approve', 'Approve')}</Text>
            </TouchableOpacity>
          )}
          {showRevoke && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PmsKpiRevoke', { kpiId: kpi.id, name })}
            >
              <Text style={styles.actionText}>↺ {t('pms.revoke', 'Revoke')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
    );
  }

  return (
    <QueryStates
      loading={loading}
      apiError={fatalDetailError}
      error={detailQ.error}
      onRetry={() => detailQ.refetch()}
      isRefreshing={detailQ.isFetching}
      style={{ flex: 1 }}
    >
      {detailBody}
    </QueryStates>
  );
};

const PersonRow: React.FC<{ label: string; name?: string | null; colors: any }> = ({ label, name, colors }) => (
  <View style={styles.personRow}>
    <Text style={[styles.personLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>{name || '—'}</Text>
  </View>
);

const DataRow: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
  <View style={styles.personRow}>
    <Text style={[styles.personLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={2}>{value}</Text>
  </View>
);

function fmt(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString();
  return String(v);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 12 },

  hero: { borderRadius: 14, padding: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroCode: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', flex: 1 },
  heroName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 8, lineHeight: 22 },
  heroDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 6, lineHeight: 17 },

  card: { borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  targetRow: { flexDirection: 'row', gap: 12 },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  bigValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  midValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  unit: { fontSize: 11, fontWeight: '600' },

  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  personLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  personName: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },

  targetTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  targetCode: { fontSize: 11, fontWeight: '700', flex: 1 },
  targetDue: { fontSize: 11, fontWeight: '600' },
  smallChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  smallChipText: { fontSize: 10, fontWeight: '700' },
  notesText: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  emptyCard: {
    borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },

  actionRow: { borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', minWidth: 120 },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

export default PmsKpiDetailScreen;
