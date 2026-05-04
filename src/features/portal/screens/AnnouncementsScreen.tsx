import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetAnnouncementsQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppSelector } from '../../../store/store';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import QueryStates from '../../../shared/components/QueryStates';

type AnnSort = 'dateDesc' | 'dateAsc' | 'titleAsc' | 'category';
const SORTS: SortOption<AnnSort>[] = [
  { key: 'dateDesc', label: 'Newest first',   icon: '📅' },
  { key: 'dateAsc',  label: 'Oldest first',   icon: '📅' },
  { key: 'titleAsc', label: 'Title — A to Z', icon: '🔤' },
  { key: 'category', label: 'Category',       icon: '🏷️' },
];

const AnnouncementsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const lang = useAppSelector((s) => s.auth.language);
  const { data, isFetching, isLoading, isError, error, refetch } = useGetAnnouncementsQuery();
  const [sortKey, setSortKey] = useState<AnnSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const pick = (en: any, ar: any) => (lang === 'ar' ? (ar || en) : (en || ar));

  const rows = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'dateDesc': return sortRowsBy(list, 'desc', (r) => toDate(r.date ?? r.publishedDate));
      case 'dateAsc':  return sortRowsBy(list, 'asc',  (r) => toDate(r.date ?? r.publishedDate));
      case 'titleAsc': return sortRowsBy(list, 'asc',  (r) => String(pick(r.title, r.titleAr) ?? ''));
      case 'category': return sortRowsBy(list, 'asc',  (r) => String(pick(r.category, r.categoryAr) ?? ''));
      default:         return list;
    }
  }, [data, sortKey, lang]);

  const fmt = (v?: string) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const stripHtml = (s?: string) =>
    String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{rows.length}</Text>
          <Text> announcements · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<AnnSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort announcements"
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
        keyExtractor={(item, i) => String(item.announcementId ?? item.id ?? i)}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => {
          const title    = pick(item.title, item.titleAr);
          const category = pick(item.category, item.categoryAr);
          const body     = stripHtml(pick(item.body, item.bodyAr) ?? item.content);
          const entity   = pick(item.entity, item.entityAr);
          const dateStr  = fmt(item.date ?? item.publishedDate);

          return (
            <TouchableOpacity
              style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation?.navigate?.('AnnouncementDetail', {
                announcementId: item.announcementId ?? item.id,
              })}
              activeOpacity={0.7}
            >
              <View style={styles.tagRow}>
                <View style={[styles.categoryChip, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.categoryChipText, { color: colors.primary }]} numberOfLines={1}>
                    {category || 'General'}
                  </Text>
                </View>
                {dateStr ? (
                  <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr}</Text>
                ) : null}
              </View>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              {entity ? (
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>🏛 {entity}</Text>
              ) : null}
              {body ? (
                <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>{body}</Text>
              ) : null}
            </TouchableOpacity>
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
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  tagRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: '70%' },
  categoryChipText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 11 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 12, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
});

export default AnnouncementsScreen;
