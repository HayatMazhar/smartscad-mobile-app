import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import AuthedImage from '../../../shared/components/AuthedImage';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetNewsQuery } from '../services/portalApi';
import { API_BASE_URL } from '../../../store/baseApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChromaKey } from '../../../app/theme/accentChroma';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';

/**
 * Web parity: legacy News.cshtml uses News_Photos.FirstOrDefault(IsActive == true)
 * for every list/grid card. The SP now returns that id as `coverNewsPhotoId`.
 * We stream the bytes through the mobile API (/portal/news/photos/{id}), which
 * proxies the SmartHelp file-share file via Windows impersonation. If a news
 * item has no gallery rows, fall back to News.CoverPhotoPath via /cover (used
 * by some legacy items). Returns undefined when neither is available.
 */
function resolveNewsCardCoverUrl(item: any): string | undefined {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const photoId = item?.coverNewsPhotoId ?? item?.CoverNewsPhotoId;
  if (photoId != null && Number.isFinite(Number(photoId))) {
    return `${base}/portal/news/photos/${encodeURIComponent(String(photoId))}`;
  }
  const newsId = item?.id ?? item?.newsId;
  const hasCoverPath = !!String(item?.coverImageUrl ?? '').trim();
  if (newsId != null && hasCoverPath) {
    return `${base}/portal/news/${encodeURIComponent(String(newsId))}/cover`;
  }
  return undefined;
}

/**
 * The SP returns `excerpt` = LEFT(PageContent, 500) which still contains the
 * raw HTML markup from the rich-text editor. The list cards must show clean
 * text (no <p>/<strong>/&nbsp; etc).
 */
function stripHtmlForCard(html: unknown): string {
  if (html == null) return '';
  const s = String(html);
  if (!s) return '';
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

type NewsSort = 'dateDesc' | 'dateAsc' | 'title' | 'likesDesc' | 'commentsDesc' | 'category';
const SORTS: SortOption<NewsSort>[] = [
  { key: 'dateDesc',     label: 'Newest first',           icon: '📅' },
  { key: 'dateAsc',      label: 'Oldest first',           icon: '📅' },
  { key: 'title',        label: 'Title — A to Z',         icon: '🔤' },
  { key: 'likesDesc',    label: 'Most liked',             icon: '❤️' },
  { key: 'commentsDesc', label: 'Most commented',         icon: '💬' },
  { key: 'category',     label: 'Category',               icon: '🏷️' },
];

const NewsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const { data, isFetching, isLoading, isError, refetch } = useGetNewsQuery();
  const [sortKey, setSortKey] = useState<NewsSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const rows = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'dateDesc':     return sortRowsBy(list, 'desc', (r) => toDate(r.publishedDate ?? r.date));
      case 'dateAsc':      return sortRowsBy(list, 'asc',  (r) => toDate(r.publishedDate ?? r.date));
      case 'title':        return sortRowsBy(list, 'asc',  (r) => String(r.title ?? ''));
      case 'likesDesc':    return sortRowsBy(list, 'desc', (r) => Number(r.likesCount ?? 0));
      case 'commentsDesc': return sortRowsBy(list, 'desc', (r) => Number(r.commentsCount ?? 0));
      case 'category':     return sortRowsBy(list, 'asc',  (r) => String(r.category ?? ''));
      default:             return list;
    }
  }, [data, sortKey]);

  const renderItem = ({ item }: { item: any }) => {
    const category = item.category ?? 'General';
    const catColor = accentChromaKey(colors, skin, category);
    const coverUrl = resolveNewsCardCoverUrl(item);

    return (
      <TouchableOpacity
        style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('NewsDetail', { newsId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.imagePlaceholder, { backgroundColor: catColor }]}>
          {coverUrl ? (
            <AuthedImage
              source={{ uri: coverUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.gradientOverlay} />
          <View style={[styles.categoryTag, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
          {!coverUrl ? <Text style={styles.imageEmoji}>📰</Text> : null}
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {item.publishedDate ?? item.date}
          </Text>
          <Text style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={3}>
            {stripHtmlForCard(item.excerpt ?? item.description ?? item.body ?? item.content)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>❤️</Text>
              <Text style={[styles.statText, { color: colors.textMuted }]}>
                {item.likesCount ?? 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>💬</Text>
              <Text style={[styles.statText, { color: colors.textMuted }]}>
                {item.commentsCount ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{rows.length}</Text>
          <Text> articles · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<NewsSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort news"
        colors={colors}
        shadows={shadows}
      />
      {isError && (
        <TouchableOpacity
          onPress={() => refetch()}
          activeOpacity={0.75}
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 4,
            backgroundColor: `${colors.danger}14`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
            {t('common.loadError', 'Could not load data. Tap to retry.')}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={rows}
        keyExtractor={(item, index) => String(item.id ?? item.newsId ?? item.title ?? index)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📰</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isError ? t('common.loadError', 'Could not load data') : t('common.noData')}
            </Text>
          </View>
        }
      />
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
  list: { padding: 16, gap: 16, paddingBottom: 32 },

  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  imagePlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  categoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imageEmoji: {
    fontSize: 48,
    opacity: 0.6,
  },

  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 14,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default NewsScreen;
