import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import QueryStates from '../../../shared/components/QueryStates';
import {
  useV2GetFinanceDashboardQuery,
  type FinanceDashboardKpi,
  type FinanceDashboardSummary,
  type FinanceDashboardContracts,
} from '../services/financeApi';

// Plan: legacy_api_parity_rollout 5.2 - Finance Dashboard
//
// Mirrors the legacy SmartSCAD Finance dashboard (FinanceController.GetDashboardSummary).
// All scoping (delegation rules, "my staff" pool) is computed by
// `Mobile.spMobile_v2_Finance_GetDashboard`. This screen only renders.

const fmtMoney = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const Stat: React.FC<{
  label: string;
  value: string;
  hint?: string;
  color: string;
}> = ({ label, value, hint, color }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {hint ? <Text style={[styles.statHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
};

const ContractTile: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={2}>{label}</Text>
    </View>
  );
};

const FinanceDashboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const nav = useNavigation<MoreTabNavigation<'FinanceDashboard'>>();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data, isFetching, isError, isLoading, refetch } = useV2GetFinanceDashboardQuery({ year, lang });

  const kpi: FinanceDashboardKpi | null = useMemo(() => {
    const arr = (data?.kpi ?? []) as FinanceDashboardKpi[];
    return arr[0] ?? null;
  }, [data]);

  const summary: FinanceDashboardSummary | null = useMemo(() => {
    const arr = (data?.summary ?? []) as FinanceDashboardSummary[];
    return arr[0] ?? null;
  }, [data]);

  const contracts: FinanceDashboardContracts | null = useMemo(() => {
    const arr = (data?.contracts ?? []) as FinanceDashboardContracts[];
    return arr[0] ?? null;
  }, [data]);

  return (
    <QueryStates
      loading={isLoading}
      apiError={isError}
      isRefreshing={isFetching}
      onRetry={refetch}
      errorTitle={t('finance.error.title', 'Could not load finance data')}
      loadingTestID="screen.finance_dashboard_loading"
    >
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
    >
      {/* Year picker */}
      <View style={styles.yearRow}>
        <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.yearLabel, { color: colors.text }]}>{year}</Text>
        <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{'>'}</Text>
        </TouchableOpacity>
        <Text style={[styles.scopeText, { color: colors.textMuted }]}>
          {kpi
            ? t('finance.scope', '{{flows}} cash flow(s) \u00B7 {{users}} resource(s)', {
                flows: kpi.ScopeFlowsCount,
                users: kpi.ResourcesCount,
              })
            : ''}
        </Text>
      </View>

      {isFetching && !kpi ? (
        <View style={{ padding: 32 }}>
          <ThemedActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Top KPI band */}
          <View style={[styles.bandCard, { backgroundColor: colors.surface }, shadows.card]}>
            <Text style={[styles.bandTitle, { color: colors.text }]}>
              {t('finance.dashboardTitle', 'Spending performance')}
            </Text>
            <Text style={[styles.bigNumber, { color: colors.primary }]}>
              {kpi?.PerformancePct ?? 0}%
            </Text>
            <Text style={[styles.bandHint, { color: colors.textMuted }]}>
              {t('finance.spendingPctHint', 'Actual / Approved budget')}
            </Text>
            <View style={styles.statsGrid}>
              <Stat
                label={t('finance.approveBudget', 'Approved')}
                value={fmtMoney(kpi?.ApproveBudget)}
                color={colors.text}
              />
              <Stat
                label={t('finance.actualPayments', 'Actual')}
                value={fmtMoney(kpi?.ActualPayments)}
                color={colors.success}
              />
              <Stat
                label={t('finance.reservedAmount', 'Reserved')}
                value={fmtMoney(kpi?.ReservedAmount)}
                color={colors.warning}
              />
              <Stat
                label={t('finance.remaining', 'Remaining')}
                value={fmtMoney(kpi?.RemainingAmount)}
                color={colors.info}
              />
            </View>
          </View>

          {/* Spending performance till date */}
          {summary ? (
            <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('finance.summaryTitle', 'Spending performance - to date')}
              </Text>
              <View style={[styles.row, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.kvKey, { color: colors.textMuted }]}>
                  {t('finance.expectedTillNow', 'Expected till now')}
                </Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{fmtMoney(summary.TotalExpectedPaymentTillNow)}</Text>
              </View>
              <View style={[styles.row, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.kvKey, { color: colors.textMuted }]}>
                  {t('finance.actualTillNow', 'Actual till now')}
                </Text>
                <Text style={[styles.kvVal, { color: colors.success }]}>{fmtMoney(summary.TotalActualPaymentTillNow)}</Text>
              </View>
              <View style={[styles.row]}>
                <Text style={[styles.kvKey, { color: colors.textMuted }]}>
                  {t('finance.avgPerformance', 'Average performance')}
                </Text>
                <Text style={[styles.kvVal, { color: colors.primary }]}>
                  {Math.round(Number(summary.AveragePerformance ?? 0))}%
                </Text>
              </View>
            </View>
          ) : null}

          {/* Contracts / LPO */}
          {contracts ? (
            <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('finance.contractsTitle', 'Contracts & LPOs')}
              </Text>
              <View style={styles.tilesRow}>
                <ContractTile
                  label={t('finance.contractsTotal', 'Total contracts')}
                  value={contracts.TotalContracts}
                  color={colors.text}
                />
                <ContractTile
                  label={t('finance.contractsNoPayments', 'No payments')}
                  value={contracts.NoPayments}
                  color={colors.textMuted}
                />
                <ContractTile
                  label={t('finance.contractsInprogress', 'In progress')}
                  value={contracts.PaymentsInprogress}
                  color={colors.warning}
                />
                <ContractTile
                  label={t('finance.contractsCompleted', 'Completed')}
                  value={contracts.PaymentsCompleted}
                  color={colors.success}
                />
              </View>
            </View>
          ) : null}

          {/* Drill-down navigation */}
          <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
            <TouchableOpacity
              style={[styles.linkRow, { borderBottomColor: colors.divider }]}
              onPress={() => nav.navigate('CashFlowList', { year })}
            >
              <Text style={[styles.linkText, { color: colors.text }]}>
                {t('finance.cashFlowsLink', 'Browse cash flows')}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 18 }}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => nav.navigate('AccountsExpenditure', { year })}
            >
              <Text style={[styles.linkText, { color: colors.text }]}>
                {t('finance.accountsExpenditureLink', 'View accounts expenditure')}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 18 }}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
    </QueryStates>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  yearBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  yearLabel: { fontSize: 18, fontWeight: '700' },
  scopeText: { marginLeft: 10, flex: 1, fontSize: 12 },
  bandCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  bandTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  bigNumber: { fontSize: 44, fontWeight: '800' },
  bandHint: { fontSize: 11, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flexBasis: '48%', flexGrow: 1, borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  statLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statHint: { fontSize: 10, marginTop: 2 },
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  kvKey: { fontSize: 13 },
  kvVal: { fontSize: 14, fontWeight: '600' },
  tilesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tile: { flexBasis: '23%', flexGrow: 1, padding: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  tileValue: { fontSize: 22, fontWeight: '800' },
  tileLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  linkText: { fontSize: 14, fontWeight: '600' },
});

export default FinanceDashboardScreen;

