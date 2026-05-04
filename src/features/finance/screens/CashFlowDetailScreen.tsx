import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import QueryStates from '../../../shared/components/QueryStates';
import {
  useV2GetCashFlowDetailQuery,
  type FinanceCashFlowDetailRow,
  type FinanceCashFlowPayment,
  type FinanceCashFlowContract,
} from '../services/financeApi';

// Plan: legacy_api_parity_rollout 5.3 - Cash Flow detail
//
// Calls `Mobile.spMobile_v2_Finance_GetCashFlowDetail` which performs the
// authorization check (PM, delegate, view-only employee, or in user's staff)
// and returns { cashFlow, payments, contracts }. We render all three blocks.

const fmtMoney = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CashFlowDetailScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const route = useRoute<any>();
  const id = Number(route?.params?.id ?? 0);
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';

  const { data, isFetching, isLoading, isError, error, refetch } = useV2GetCashFlowDetailQuery(
    { id, lang },
    { skip: !id },
  );

  const cf: FinanceCashFlowDetailRow | null = useMemo(() => {
    const arr = (data?.cashFlow ?? []) as FinanceCashFlowDetailRow[];
    return arr[0] ?? null;
  }, [data]);
  const payments = (data?.payments ?? []) as FinanceCashFlowPayment[];
  const contracts = (data?.contracts ?? []) as FinanceCashFlowContract[];

  const monthly = useMemo(() => {
    if (!cf) return [];
    return MONTHS.map((m, i) => {
      const planned = (cf as any)[`M${i + 1}`] as number | undefined;
      const revKey = `RevisedBudget${m}`;
      const revised = (cf as any)[revKey] as number | undefined;
      return { month: m, planned: Number(planned ?? 0), revised: Number(revised ?? 0) };
    });
  }, [cf]);

  const performanceColor = cf
    ? (cf.PerformancePct >= 80 ? colors.success
      : cf.PerformancePct >= 40 ? colors.warning
      : colors.danger)
    : colors.textMuted;

  return (
    <QueryStates
      loading={!isError && !cf}
      apiError={isError}
      error={error}
      isRefreshing={isFetching}
      onRetry={refetch}
      style={{ flex: 1 }}
    >
      {!cf ? null : (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }, shadows.card]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {cf.DisplayName ?? cf.ProjectName ?? '-'}
        </Text>
        {cf.AccountName ? (
          <Text style={[styles.subText, { color: colors.textMuted }]}>
            {cf.AccountNo ? `${cf.AccountNo} \u00B7 ` : ''}{cf.AccountName}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {cf.ProjectCode ? (
            <Text style={[styles.metaPill, { backgroundColor: `${colors.primary}18`, color: colors.primary }]}>
              {cf.ProjectCode}
            </Text>
          ) : null}
          {cf.CostCenter ? (
            <Text style={[styles.metaPill, { backgroundColor: `${colors.info}18`, color: colors.info }]}>
              CC: {cf.CostCenter}
            </Text>
          ) : null}
          <Text style={[styles.metaPill, { backgroundColor: `${performanceColor}22`, color: performanceColor }]}>
            {cf.PerformancePct}%
          </Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiKey, { color: colors.textMuted }]}>{t('finance.approveBudget', 'Approved')}</Text>
            <Text style={[styles.kpiVal, { color: colors.text }]}>{fmtMoney(cf.ApproveBudget)}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiKey, { color: colors.textMuted }]}>{t('finance.actualPayments', 'Actual')}</Text>
            <Text style={[styles.kpiVal, { color: colors.success }]}>{fmtMoney(cf.ActualPayments)}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiKey, { color: colors.textMuted }]}>{t('finance.reservedAmount', 'Reserved')}</Text>
            <Text style={[styles.kpiVal, { color: colors.warning }]}>{fmtMoney(cf.ReservedAmount)}</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiKey, { color: colors.textMuted }]}>{t('finance.remaining', 'Remaining')}</Text>
            <Text style={[styles.kpiVal, { color: colors.info }]}>{fmtMoney(cf.RemainingAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Monthly plan */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('finance.monthlyPlanTitle', 'Monthly plan')}
        </Text>
        <View style={[styles.tableHeader, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.thMonth, { color: colors.textMuted }]}>{t('finance.month', 'Month')}</Text>
          <Text style={[styles.thAmount, { color: colors.textMuted }]}>{t('finance.planned', 'Planned')}</Text>
          <Text style={[styles.thAmount, { color: colors.textMuted }]}>{t('finance.revised', 'Revised')}</Text>
        </View>
        {monthly.map((m) => (
          <View key={m.month} style={[styles.tableRow, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.tdMonth, { color: colors.text }]}>{m.month}</Text>
            <Text style={[styles.tdAmount, { color: colors.text }]}>{fmtMoney(m.planned)}</Text>
            <Text style={[styles.tdAmount, { color: m.revised ? colors.warning : colors.textMuted }]}>
              {fmtMoney(m.revised)}
            </Text>
          </View>
        ))}
      </View>

      {/* Comments / Justifications */}
      {(cf.Comments || cf.Reason1 || cf.Justification) ? (
        <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('finance.notesTitle', 'Notes')}
          </Text>
          {cf.Reason1 ? (
            <View style={styles.noteBlock}>
              <Text style={[styles.noteKey, { color: colors.textMuted }]}>{t('finance.reason', 'Reason')}</Text>
              <Text style={[styles.noteVal, { color: colors.text }]}>{cf.Reason1}</Text>
            </View>
          ) : null}
          {cf.Justification ? (
            <View style={styles.noteBlock}>
              <Text style={[styles.noteKey, { color: colors.textMuted }]}>{t('finance.justification', 'Justification')}</Text>
              <Text style={[styles.noteVal, { color: colors.text }]}>{cf.Justification}</Text>
            </View>
          ) : null}
          {cf.Comments ? (
            <View style={styles.noteBlock}>
              <Text style={[styles.noteKey, { color: colors.textMuted }]}>{t('finance.comments', 'Comments')}</Text>
              <Text style={[styles.noteVal, { color: colors.text }]}>{cf.Comments}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Payment tickets */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('finance.paymentsTitle', 'Payment tickets')} ({payments.length})
        </Text>
        {payments.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {t('finance.noPayments', 'No payments recorded yet.')}
          </Text>
        ) : (
          payments.map((p) => (
            <View key={p.ID} style={[styles.paymentRow, { borderBottomColor: colors.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.payMain, { color: colors.text }]}>
                  #{p.TicketID ?? p.ID}{' \u00B7 '}{fmtMoney(p.PaymentAmount)}
                </Text>
                <Text style={[styles.paySub, { color: colors.textMuted }]}>
                  {p.Created ? new Date(String(p.Created)).toLocaleDateString() : ''}
                  {p.TicketCreatedBy ? ` \u00B7 ${p.TicketCreatedBy}` : ''}
                </Text>
                {p.Comments ? (
                  <Text style={[styles.payComment, { color: colors.text }]} numberOfLines={2}>
                    {p.Comments}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Contracts */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('finance.contractsTitle', 'Contracts')} ({contracts.length})
        </Text>
        {contracts.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {t('finance.noContracts', 'No contracts linked to this cash flow.')}
          </Text>
        ) : (
          contracts.map((c) => (
            <View key={c.ID} style={[styles.contractRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.contractTitle, { color: colors.text }]} numberOfLines={2}>
                {c.Name ?? c.ContractNo ?? `#${c.ID}`}
              </Text>
              <Text style={[styles.contractSub, { color: colors.textMuted }]} numberOfLines={1}>
                {c.CompanyName ?? ''}
                {c.StartDate ? `  \u00B7  ${new Date(String(c.StartDate)).toLocaleDateString()}` : ''}
                {c.EndDate   ? ` -> ${new Date(String(c.EndDate)).toLocaleDateString()}` : ''}
              </Text>
              <View style={styles.contractKpis}>
                <Text style={[styles.contractKpi, { color: colors.text }]}>
                  {t('finance.contractValue', 'Value')}: <Text style={{ fontWeight: '700' }}>{fmtMoney(c.ContractValue)}</Text>
                </Text>
                <Text style={[styles.contractKpi, { color: colors.success }]}>
                  {t('finance.paid', 'Paid')}: <Text style={{ fontWeight: '700' }}>{fmtMoney(c.PaidAmount)}</Text>
                </Text>
                <Text style={[styles.contractKpi, { color: colors.info }]}>
                  {t('finance.remaining', 'Remaining')}: <Text style={{ fontWeight: '700' }}>{fmtMoney(c.RemainingAmount)}</Text>
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
      )}
    </QueryStates>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  subText: { fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaPill: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  kpiCell: { flexBasis: '48%', flexGrow: 1, paddingVertical: 8 },
  kpiKey: { fontSize: 11, textTransform: 'uppercase' },
  kpiVal: { fontSize: 17, fontWeight: '700' },
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  thMonth: { width: 50, fontSize: 11, textTransform: 'uppercase' },
  thAmount: { flex: 1, textAlign: 'right', fontSize: 11, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  tdMonth: { width: 50, fontSize: 13 },
  tdAmount: { flex: 1, textAlign: 'right', fontSize: 13 },
  noteBlock: { paddingVertical: 6 },
  noteKey: { fontSize: 11, textTransform: 'uppercase', marginBottom: 2 },
  noteVal: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 12, padding: 6 },
  paymentRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  payMain: { fontSize: 14, fontWeight: '600' },
  paySub: { fontSize: 11, marginTop: 2 },
  payComment: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  contractRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  contractTitle: { fontSize: 14, fontWeight: '600' },
  contractSub: { fontSize: 11, marginTop: 2 },
  contractKpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  contractKpi: { fontSize: 12 },
});

export default CashFlowDetailScreen;

