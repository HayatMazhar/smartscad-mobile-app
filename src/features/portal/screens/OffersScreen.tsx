import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetOffersQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChroma } from '../../../app/theme/accentChroma';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import QueryStates from '../../../shared/components/QueryStates';

const CARD_COLORS = ['#E67E22', '#D35400', '#F39C12', '#C0392B', '#E74C3C', '#E67E22'];

type OfferSort = 'dateDesc' | 'dateAsc' | 'title';
const SORTS: SortOption<OfferSort>[] = [
  { key: 'dateDesc', label: 'Newest first',    icon: '📅' },
  { key: 'dateAsc',  label: 'Oldest first',    icon: '📅' },
  { key: 'title',    label: 'Title — A to Z',  icon: '🔤' },
];

const OffersScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const { data, isFetching, isLoading, isError, error, refetch } = useGetOffersQuery();
  const [sortKey, setSortKey] = useState<OfferSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const rows = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'dateDesc': return sortRowsBy(list, 'desc', (r) => toDate(r.offerDate ?? r.startDate));
      case 'dateAsc':  return sortRowsBy(list, 'asc',  (r) => toDate(r.offerDate ?? r.startDate));
      case 'title':    return sortRowsBy(list, 'asc',  (r) => String(r.title ?? ''));
      default:         return list;
    }
  }, [data, sortKey]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{rows.length}</Text>
          <Text> offers · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<OfferSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort offers"
        colors={colors}
        shadows={shadows}
      />
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
        keyExtractor={(item, i) => String(item.id ?? i)}
        contentContainerStyle={styles.list}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
            onPress={() => navigation?.navigate?.('OfferDetail', { offerId: item.id })}
            activeOpacity={0.7}
          >
            <View style={[styles.banner, { backgroundColor: accentChroma(colors, skin, index) }]}>
              <Text style={{ fontSize: 32 }}>🏷️</Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              {item.titleAr && item.titleAr !== item.title ? (
                <Text style={[styles.titleAr, { color: colors.textSecondary }]} numberOfLines={1}>{item.titleAr}</Text>
              ) : null}
              <Text style={[styles.date, { color: colors.textMuted }]}>📅 {item.offerDate ?? item.startDate ?? ''}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('common.noData')}</Text>
            </View>
        }
      />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 14, overflow: 'hidden', flexDirection: 'row' },
  banner: { width: 72, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  titleAr: { fontSize: 13, marginBottom: 4 },
  date: { fontSize: 12, marginTop: 4 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default OffersScreen;
