import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import QueryStates from '../../../shared/components/QueryStates';
import {
  useV2GetAccountsExpenditureQuery,
  type FinanceAccountRow,
  type FinanceAccountsTotals,
} from '../services/financeApi';

// Plan: legacy_api_parity_rollout 5.4 - Accounts Expenditure
//
// Backed by `Mobile.spMobile_v2_Finance_GetAccountsExpenditure` which returns
//   { accounts, totals }. The screen sums approved/actual/reserved/remaining
// per Account and shows a totals header on top.

const fmtMoney = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const AccountsExpenditureScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const route = useRoute<any>();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';
  const initialYear = Number(route?.params?.year) || new Date().getFullYear();
  const [year, setYear] = useState<number>(initialYear);

  const { data, isFetching, isLoading, isError, error, refetch } = useV2GetAccountsExpenditureQuery({ year, lang });

  const accounts: FinanceAccountRow[] = useMemo(
    () => (data?.accounts ?? []) as FinanceAccountRow[],
    [data],
  );
  const totals: FinanceAccountsTotals | null = useMemo(() => {
    const arr = (data?.totals ?? []) as FinanceAccountsTotals[];
    return arr[0] ?? null;
  }, [data]);

  const renderItem = ({ item }: { item: FinanceAccountRow }) => {
    const performanceColor =
      item.PerformancePct >= 80 ? colors.success
      : item.PerformancePct >= 40 ? colors.warning
      : colors.danger;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.code, { color: colors.textMuted }]} numberOfLines={1}>
              {item.AccountNo ?? ''}
            </Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {item.AccountName ?? '-'}
            </Text>
          </View>
          <View style={[styles.perfBadge, { backgroundColor: `${performanceColor}22`, borderColor: performanceColor }]}>
            <Text style={[styles.perfText, { color: performanceColor }]}>{item.PerformancePct ?? 0}%</Text>
          </View>
        </View>
        <Text style={[styles.flowsCount, { color: colors.textMuted }]}>
          {t('finance.cashFlowsCount', '{{count}} cash flow(s)', { count: item.CashFlowsCount })}
        </Text>
        <View style={styles.amountsRow}>
          <View style={styles.amount}>
            <Text style={[styles.amountKey, { color: colors.textMuted }]}>{t('finance.approveBudget', 'Approved')}</Text>
            <Text style={[styles.amountVal, { color: colors.text }]}>{fmtMoney(item.ApproveBudget)}</Text>
          </View>
          <View style={styles.amount}>
            <Text style={[styles.amountKey, { color: colors.textMuted }]}>{t('finance.actualPayments', 'Actual')}</Text>
            <Text style={[styles.amountVal, { color: colors.success }]}>{fmtMoney(item.ActualPayments)}</Text>
          </View>
          <View style={styles.amount}>
            <Text style={[styles.amountKey, { color: colors.textMuted }]}>{t('finance.reservedAmount', 'Reserved')}</Text>
            <Text style={[styles.amountVal, { color: colors.warning }]}>{fmtMoney(item.ReservedAmount)}</Text>
          </View>
          <View style={styles.amount}>
            <Text style={[styles.amountKey, { color: colors.textMuted }]}>{t('finance.remaining', 'Remaining')}</Text>
            <Text style={[styles.amountVal, { color: colors.info }]}>{fmtMoney(item.RemainingAmount)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Year picker */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.yearLabel, { color: colors.text }]}>{year}</Text>
        <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>{'>'}</Text>
        </TouchableOpacity>
        {totals ? (
          <Text style={[styles.totalsText, { color: colors.textMuted }]}>
            {t('finance.accountsCount', '{{accounts}} account(s) \u00B7 {{flows}} cash flow(s)', {
              accounts: totals.AccountsCount,
              flows: totals.CashFlowsCount,
            })}
          </Text>
        ) : null}
      </View>

      {/* Totals strip */}
      {totals ? (
        <View style={[styles.totalsCard, { backgroundColor: colors.surface }, shadows.card]}>
          <View style={styles.totCell}>
            <Text style={[styles.totKey, { color: colors.textMuted }]}>{t('finance.approveBudget', 'Approved')}</Text>
            <Text style={[styles.totVal, { color: colors.text }]}>{fmtMoney(totals.ApproveBudget)}</Text>
          </View>
          <View style={styles.totCell}>
            <Text style={[styles.totKey, { color: colors.textMuted }]}>{t('finance.actualPayments', 'Actual')}</Text>
            <Text style={[styles.totVal, { color: colors.success }]}>{fmtMoney(totals.ActualPayments)}</Text>
          </View>
          <View style={styles.totCell}>
            <Text style={[styles.totKey, { color: colors.textMuted }]}>{t('finance.reservedAmount', 'Reserved')}</Text>
            <Text style={[styles.totVal, { color: colors.warning }]}>{fmtMoney(totals.ReservedAmount)}</Text>
          </View>
        </View>
      ) : null}

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={isError}
        error={error}
        isRefreshing={isFetching}
        onRetry={refetch}
        style={{ flex: 1 }}
      >
        <FlatList
          data={accounts}
          keyExtractor={(it, i) => String(it.AccountID ?? i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            isFetching ? (
              <View style={{ padding: 32 }}>
                <ThemedActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>
                  {t('finance.noAccounts', 'No accounts in scope for this year.')}
                </Text>
              </View>
            )
          }
        />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  yearBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  yearLabel: { fontSize: 16, fontWeight: '700' },
  totalsText: { marginLeft: 12, flex: 1, fontSize: 12 },
  totalsCard: {
    flexDirection: 'row', gap: 8, padding: 12, marginHorizontal: 12, marginTop: 12,
    borderRadius: 12,
  },
  totCell: { flex: 1 },
  totKey: { fontSize: 11, textTransform: 'uppercase' },
  totVal: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  card: { borderRadius: 12, padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  code: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  perfBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, marginLeft: 10 },
  perfText: { fontSize: 12, fontWeight: '700' },
  flowsCount: { fontSize: 11, marginTop: 4 },
  amountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  amount: { flexBasis: '47%', flexGrow: 1 },
  amountKey: { fontSize: 11, textTransform: 'uppercase' },
  amountVal: { fontSize: 14, fontWeight: '700' },
});

export default AccountsExpenditureScreen;

