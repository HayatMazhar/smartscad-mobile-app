import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetVideoGalleriesQuery } from '../services/portalApi';
import { API_BASE_URL } from '../../../store/baseApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import { accentChroma } from '../../../app/theme/accentChroma';
import QueryStates from '../../../shared/components/QueryStates';

// File historically named GalleryScreen because the Portal "Gallery" page used
// to host both Photos and Videos tabs. We've narrowed this screen down to
// videos only (the Photos catalogue is being retired on mobile because we
// don't have a strong UX for it yet, and every news item already exposes its
// own photo gallery via NewsDetailScreen). The route is still registered as
// `Gallery` to avoid a churn cascade across the home layouts and deep-link
// handlers — only the visible label and the rendered content changed.

/** Resolves /portal/news/{id}/cover for a video tile thumbnail. */
function resolveVideoCoverUrl(videoId?: number | string): string | undefined {
  if (videoId == null) return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/news/${encodeURIComponent(String(videoId))}/cover`;
}

type VideoSort = 'dateDesc' | 'dateAsc' | 'title';
const SORTS: SortOption<VideoSort>[] = [
  { key: 'dateDesc', label: 'Newest first',   icon: '📅' },
  { key: 'dateAsc',  label: 'Oldest first',   icon: '📅' },
  { key: 'title',    label: 'Title — A to Z', icon: '🔤' },
];

const { width: SW } = Dimensions.get('window');
const CARD_GAP = 12;
const COLS = SW > 500 ? 3 : 2;
const CARD_W = (SW - 32 - CARD_GAP * (COLS - 1)) / COLS;
// Slightly taller than the old 0.7 ratio so the modern play button has more
// breathing room and the cover image actually reads as a video poster.
const THUMB_H = Math.round(CARD_W * 0.78);

const GalleryScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const { data: videoData, isFetching, isLoading, isError, error, refetch } = useGetVideoGalleriesQuery();

  const [sortKey, setSortKey] = useState<VideoSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const videos = useMemo(() => {
    const list = asArray<any>(videoData);
    switch (sortKey) {
      case 'dateDesc':  return sortRowsBy(list, 'desc', (r: any) => toDate(r.createdDate ?? r.date));
      case 'dateAsc':   return sortRowsBy(list, 'asc',  (r: any) => toDate(r.createdDate ?? r.date));
      case 'title':     return sortRowsBy(list, 'asc',  (r: any) => String(r.title ?? ''));
      default:          return list;
    }
  }, [videoData, sortKey]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const bg = accentChroma(colors, skin, index);
    const coverUrl = resolveVideoCoverUrl(item.id ?? item.videoId);

    return (
      <TouchableOpacity
        style={[styles.card, shadows.card, { backgroundColor: colors.card, width: CARD_W }]}
        onPress={() => navigation?.navigate?.('VideoDetail', { videoId: item.id })}
        activeOpacity={0.85}
      >
        <View style={[styles.thumb, { backgroundColor: bg, height: THUMB_H }]}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : null}
          {/* Soft gradient-ish dim that's heavier at the bottom — keeps the
              poster bright at the top while the play button gets enough
              contrast in the centre. RN doesn't ship a gradient primitive in
              the base lib so we approximate with two stacked dim layers. */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
          <View style={styles.thumbBottomDim} />

          {/* Modern play button: glassy white pill with a centered triangle.
              No more giant black square — the previous build rendered a flat
              black/▶ glyph that swallowed the poster. */}
          <View style={styles.playButton} pointerEvents="none">
            <View style={styles.playInner}>
              <View style={styles.playTriangle} />
            </View>
          </View>

          {/* "VIDEO" pill in the top-left so the tile reads as video at a
              glance — useful when posters look generic or are missing. */}
          <View style={styles.videoTag} pointerEvents="none">
            <Text style={styles.videoTagText}>VIDEO</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.cardDate, { color: colors.textMuted }]} numberOfLines={1}>
            {item.createdDate}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SortSheet<VideoSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort videos"
        colors={colors}
        shadows={shadows}
      />

      {/* Lightweight summary header — no more Photos/Videos tabs because the
          screen is video-only now. Keeps the count chip + sort affordance. */}
      <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🎬</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('portal.videos', 'Videos')}
          </Text>
          <View style={[styles.headerCount, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.headerCountText, { color: colors.primary }]}>{videos.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setSortOpen(true)} activeOpacity={0.7} style={styles.sortBtn}>
          <Text style={[{ color: colors.text, fontSize: 15, fontWeight: '900' }]}>⇅</Text>
          <Text style={[{ color: colors.text, fontSize: 12, fontWeight: '700' }]}>Sort</Text>
        </TouchableOpacity>
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
        data={videos}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={renderItem}
        numColumns={COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No videos found
              </Text>
            </View>
        }
      />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerEmoji: { fontSize: 18 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerCount: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 10, marginLeft: 2 },
  headerCountText: { fontSize: 11, fontWeight: '800' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },

  list: { padding: 16, paddingBottom: 32 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: { borderRadius: 14, overflow: 'hidden' },
  thumb: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  thumbBottomDim: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  // Glassy round play button — outer translucent ring, solid inner disc, an
  // off-centre triangle so the icon visually reads as "play".
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  // CSS triangle pointing right.
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#111',
  },

  videoTag: {
    position: 'absolute',
    top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  videoTagText: { color: '#fff', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },

  cardContent: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 4 },
  cardDate: { fontSize: 11 },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default GalleryScreen;
