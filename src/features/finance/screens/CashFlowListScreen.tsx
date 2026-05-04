import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList, MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import QueryStates from '../../../shared/components/QueryStates';
import {
  useV2GetCashFlowsQuery,
  type FinanceCashFlowRow,
} from '../services/financeApi';

// Plan: legacy_api_parity_rollout 5.3 - Cash Flows list (paged + searchable)
//
// Backed by `Mobile.spMobile_v2_Finance_GetCashFlows` which returns
//   { items, paging }. We pull more pages by raising `pageNo` with the same
// search/year context. Local `q` state debounces the search input.

const fmtMoney = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const CashFlowListScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const nav = useNavigation<MoreTabNavigation<'CashFlowList'>>();
  const route = useRoute<RouteProp<MoreStackParamList, 'CashFlowList'>>();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';
  const initialYear = Number(route?.params?.year) || new Date().getFullYear();

  const [year, setYear] = useState<number>(initialYear);
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [pageSize] = useState<number>(20);
  const [pages, setPages] = useState<FinanceCashFlowRow[][]>([]);
  const [pageNo, setPageNo] = useState<number>(1);

  // Debounce search -> reset paging when query changes
  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNo(1);
      setPages([]);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset when year changes
  React.useEffect(() => {
    setPageNo(1);
    setPages([]);
  }, [year]);

  const { data, isFetching, isLoading, isError, error, refetch } = useV2GetCashFlowsQuery({
    year,
    search: search || undefined,
    pageNo,
    pageSize,
    lang,
  });

  // Append the current page when a fetch completes successfully.
  const lastPageNoRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (!data) return;
    const items = (data.items ?? []) as FinanceCashFlowRow[];
    if (lastPageNoRef.current === pageNo) return;
    lastPageNoRef.current = pageNo;
    if (pageNo === 1) {
      setPages([items]);
    } else {
      setPages((prev) => [...prev, items]);
    }
  }, [data, pageNo]);

  const rows = useMemo(() => pages.flat(), [pages]);
  const paging = (data?.paging ?? [])[0];
  const totalPages = paging?.TotalPages ?? 1;
  const totalRows = paging?.TotalRows ?? 0;
  const canLoadMore = pageNo < totalPages && !isFetching;

  const onRefresh = () => {
    lastPageNoRef.current = 0;
    setPageNo(1);
    setPages([]);
    refetch();
  };

  const renderItem = ({ item }: { item: FinanceCashFlowRow }) => {
    const performanceColor =
      item.PerformancePct >= 80 ? colors.success
      : item.PerformancePct >= 40 ? colors.warning
      : colors.danger;
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => nav.navigate('CashFlowDetail', { id: item.ID })}
        style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.DisplayName ?? item.ProjectName ?? '-'}
          </Text>
          <View style={[styles.perfBadge, { backgroundColor: `${performanceColor}22`, borderColor: performanceColor }]}>
            <Text style={[styles.perfText, { color: performanceColor }]}>{item.PerformancePct ?? 0}%</Text>
          </View>
        </View>
        {item.AccountName ? (
          <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={1}>
            {item.AccountNo ? `${item.AccountNo} \u00B7 ` : ''}{item.AccountName}
          </Text>
        ) : null}
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={[styles.yearLabel, { color: colors.text }]}>{year}</Text>
          <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>{'>'}</Text>
          </TouchableOpacity>
          <Text style={[styles.totalsText, { color: colors.textMuted }]}>
            {t('finance.totalRows', '{{count}} result(s)', { count: totalRows })}
          </Text>
        </View>
        <TextInput
          style={[styles.search, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('finance.searchCashFlows', 'Search by project, code, LPO, cost center...')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      </View>

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
          data={rows}
          keyExtractor={(it, i) => String(it.ID ?? i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <ThemedRefreshControl
              isFetching={isFetching && pageNo === 1}
              isLoading={isLoading}
              onRefresh={onRefresh}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (canLoadMore) setPageNo((p) => p + 1);
          }}
          ListFooterComponent={
            isFetching && pageNo > 1 ? (
              <View style={{ padding: 16 }}>
                <ThemedActivityIndicator color={colors.primary} />
              </View>
            ) : pageNo >= totalPages && rows.length > 0 ? (
              <Text style={[styles.endText, { color: colors.textMuted }]}>
                {t('common.endOfList', 'End of list')}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            isFetching ? (
              <View style={{ padding: 32 }}>
                <ThemedActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>{t('common.noResults', 'No results')}</Text>
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
  filterBar: { padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  yearBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  yearLabel: { fontSize: 16, fontWeight: '700' },
  totalsText: { marginLeft: 12, flex: 1, fontSize: 12 },
  search: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6 },
  card: { borderRadius: 12, padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
  perfBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  perfText: { fontSize: 12, fontWeight: '700' },
  subText: { fontSize: 12, marginTop: 4 },
  amountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  amount: { flexBasis: '47%', flexGrow: 1 },
  amountKey: { fontSize: 11, textTransform: 'uppercase' },
  amountVal: { fontSize: 14, fontWeight: '700' },
  endText: { textAlign: 'center', padding: 16, fontSize: 12 },
});

export default CashFlowListScreen;

