import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetFAQsQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppSelector } from '../../../store/store';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, SortOption } from '../../../shared/components/SortSheet';
import QueryStates from '../../../shared/components/QueryStates';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FaqSort = 'category' | 'question' | 'sortOrder';
const SORTS: SortOption<FaqSort>[] = [
  { key: 'category',  label: 'Category',          icon: '🏷️' },
  { key: 'question',  label: 'Question — A to Z', icon: '🔤' },
  { key: 'sortOrder', label: 'Recommended order', icon: '↕️' },
];

const FAQsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { data, isFetching, isLoading, isError, error, refetch } = useGetFAQsQuery();
  const lang = useAppSelector((s) => s.auth.language);
  const [sortKey, setSortKey] = useState<FaqSort>('category');
  const [sortOpen, setSortOpen] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const pick = (en: any, ar: any) => (lang === 'ar' ? (ar || en) : (en || ar));

  const rows = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'category':  return sortRowsBy(list, 'asc', (r) => String(pick(r.category, r.categoryAr) ?? ''));
      case 'question':  return sortRowsBy(list, 'asc', (r) => String(pick(r.question, r.questionAr) ?? ''));
      case 'sortOrder': return sortRowsBy(list, 'asc', (r) => Number(r.sortOrder ?? 9999));
      default:          return list;
    }
  }, [data, sortKey, lang]);

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{rows.length}</Text>
          <Text> FAQs · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<FaqSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort FAQs"
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
        keyExtractor={(item, i) => String(item.faqId ?? item.id ?? i)}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => {
          const id = item.faqId ?? item.id;
          const expanded = openId === id;
          return (
            <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                onPress={() => toggle(id)}
                activeOpacity={0.7}
                style={styles.qRow}
              >
                <Text style={[styles.cat, { color: colors.primary }]}>{pick(item.category, item.categoryAr) || 'General'}</Text>
                <Text style={[styles.q, { color: colors.text }]}>{pick(item.question, item.questionAr)}</Text>
                <Text style={[styles.chev, { color: colors.textMuted }]}>{expanded ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {expanded ? (
                <Text style={[styles.a, { color: colors.textSecondary }]}>
                  {String(pick(item.answer, item.answerAr) ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                </Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>{t('common.noData')}</Text>
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
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  qRow: { position: 'relative', paddingRight: 24 },
  cat: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 },
  q: { fontSize: 15, fontWeight: '600', lineHeight: 21, paddingRight: 8 },
  chev: { position: 'absolute', right: 0, top: 18, fontSize: 14 },
  a: { fontSize: 14, lineHeight: 21, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
});

export default FAQsScreen;
