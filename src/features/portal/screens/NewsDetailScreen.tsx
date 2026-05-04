import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, Image, FlatList, useWindowDimensions, Modal, Pressable } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import {
  useGetNewsDetailQuery, useGetNewsCommentsQuery, useGetNewsLikesQuery,
  useLikeNewsMutation, useCommentOnNewsMutation,
} from '../services/portalApi';
import { API_BASE_URL } from '../../../store/baseApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { accentChroma } from '../../../app/theme/accentChroma';
import QueryStates from '../../../shared/components/QueryStates';

/**
 * Convert the WYSIWYG HTML stored in `News.PageContent` into a plain-text
 * paragraph stream we can render with React Native <Text>. Web parity:
 * legacy NewsDetail.cshtml renders the raw HTML inside a styled div; we keep
 * the visual structure (paragraph breaks) but strip every tag so the same
 * output works on native + web. Lists are flattened with bullets so they
 * stay readable.
 */
function htmlToParagraphs(html: unknown): string[] {
  if (html == null) return [];
  let s = String(html);
  if (!s) return [];

  s = s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return s
    .split(/\n{2,}/)
    .map((p) => p.replace(/^\s+|\s+$/g, ''))
    .filter((p) => p.length > 0);
}
function getInitials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].charAt(0).toUpperCase() : (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
}
function timeAgo(d?: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return d.substring(0, 10);
}

function resolvePortalBase(): string {
  const envBase = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_PROFILE_IMAGE_BASE;
  if (envBase && envBase.length > 0) return envBase.replace(/\/+$/, '');

  const w = typeof globalThis !== 'undefined'
    ? (globalThis as { window?: { location?: { protocol: string; hostname: string } } }).window
    : undefined;
  if (w?.location?.hostname) return `${w.location.protocol}//${w.location.hostname}`;

  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}`;
}

function resolveNewsImageUrl(path?: string): string | undefined {
  if (!path || !String(path).trim()) return undefined;
  const p = String(path).trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (/^\/\//.test(p)) return `https:${p}`;
  const base = resolvePortalBase();
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

/**
 * Use the mobile API (same host as the rest of the app) to stream the photo
 * bytes. The legacy web URL `Pages/GetNewsFile` requires a SmartSCAD portal
 * session cookie which native <Image> can't send. The mobile API endpoint is
 * AllowAnonymous and serves the file with proper Content-Type + cache headers.
 */
function resolveNewsFileImageUrl(newPhotoId: number): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/news/photos/${encodeURIComponent(String(newPhotoId))}`;
}

/** Streams News.CoverPhotoPath via the mobile API (same auth-free endpoint pattern). */
function resolveNewsCoverApiUrl(newsId?: number): string | undefined {
  if (newsId == null) return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/news/${encodeURIComponent(String(newsId))}/cover`;
}

function parseNewsPhotosJson(raw: unknown): { newPhotoId: number; title?: string; titleAr?: string; sortOrder?: number }[] {
  if (raw == null) return [];
  let s: string;
  if (typeof raw === 'string') {
    s = raw.trim();
    if (!s || s === '[]') return [];
  } else if (Array.isArray(raw)) {
    return raw
      .map((x: any) => ({
        newPhotoId: Number(x?.newPhotoId ?? x?.NewsPhotoID ?? x?.newsPhotoId),
        title: x?.title ?? x?.Title,
        titleAr: x?.titleAr ?? x?.TitleAr,
        sortOrder: x?.sortOrder != null ? Number(x.sortOrder) : undefined,
      }))
      .filter((x) => Number.isFinite(x.newPhotoId));
  } else return [];

  try {
    const arr = JSON.parse(s) as any[];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({
        newPhotoId: Number(x?.newPhotoId ?? x?.NewsPhotoID),
        title: x?.title,
        titleAr: x?.titleAr,
        sortOrder: x?.sortOrder != null ? Number(x.sortOrder) : undefined,
      }))
      .filter((x) => Number.isFinite(x.newPhotoId));
  } catch {
    return [];
  }
}

type TabKey = 'article' | 'comments' | 'likes';

const pickArticle = (raw: unknown, newsId: number | undefined): any | null => {
  if (newsId == null) return null;
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.title === 'string') return raw;
  }
  const list = asArray(raw);
  return list.find((x: any) => Number(x.id ?? x.newsId) === Number(newsId)) ?? list[0] ?? null;
};

const NewsDetailScreen = ({ route }: { route?: { params?: { newsId?: number } } }) => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const { width: winW } = useWindowDimensions();
  const newsId = route?.params?.newsId;

  const { data, isLoading, isFetching, isError, error, refetch } = useGetNewsDetailQuery(newsId ?? 0, { skip: newsId == null });
  const { data: commentsData, refetch: rComments } = useGetNewsCommentsQuery(newsId ?? 0, { skip: newsId == null });
  const { data: likesData, refetch: rLikes } = useGetNewsLikesQuery(newsId ?? 0, { skip: newsId == null });
  const [likeNews] = useLikeNewsMutation();
  const [commentNews] = useCommentOnNewsMutation();

  const [tab, setTab] = useState<TabKey>('article');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const carouselRef = useRef<FlatList<string> | null>(null);

  const article = useMemo(() => pickArticle(data, newsId), [data, newsId]);
  const comments = useMemo(() => asArray<any>(commentsData), [commentsData]);
  const likes = useMemo(() => asArray<any>(likesData), [likesData]);

  const gallerySlideW = Math.max(0, winW - 32);
  const photoRows = useMemo(() => parseNewsPhotosJson((article as any)?.photosJson), [article]);
  const galleryUris = useMemo(
    () => photoRows.map((p) => resolveNewsFileImageUrl(p.newPhotoId)),
    [photoRows],
  );
  // Prefer gallery photos. Fall back to a server-streamed cover (when the news
  // has News.CoverPhotoPath but no News_Photos rows). Last resort: a remote URL
  // already baked into the row, which is rare.
  const coverFromGallery = galleryUris[0];
  const articleId = article != null ? Number(article.id ?? article.newsId) : NaN;
  const coverHasPath = !!String(article?.coverImageUrl ?? '').trim();
  const coverFromApi = coverHasPath && Number.isFinite(articleId)
    ? resolveNewsCoverApiUrl(articleId)
    : undefined;
  const coverImageUrl = coverFromGallery
    ?? coverFromApi
    ?? resolveNewsImageUrl(article?.imageUrl);

  // Web parity: legacy NewsDetail.cshtml renders the full PageContent (or
  // PageContentAr). The mobile SP returns it as `content` — fall back to the
  // older Mock-data field names so existing fixtures keep working.
  const bodyParagraphs = useMemo(
    () => htmlToParagraphs(
      article?.content ?? article?.contentAr ?? article?.body ?? article?.bodyAr ?? article?.excerpt ?? '',
    ),
    [article],
  );

  // Reset carousel position whenever a new article loads.
  useEffect(() => {
    setGalleryIndex(0);
  }, [articleId]);

  const goToSlide = useCallback((idx: number) => {
    if (galleryUris.length === 0) return;
    const clamped = (idx + galleryUris.length) % galleryUris.length;
    setGalleryIndex(clamped);
    carouselRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, [galleryUris.length]);

  const openLightbox = useCallback((idx: number) => {
    if (galleryUris.length === 0) return;
    setLightboxIndex(idx);
  }, [galleryUris.length]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const lightboxNext = useCallback(() => {
    if (lightboxIndex == null || galleryUris.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % galleryUris.length);
  }, [lightboxIndex, galleryUris.length]);

  const lightboxPrev = useCallback(() => {
    if (lightboxIndex == null || galleryUris.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + galleryUris.length) % galleryUris.length);
  }, [lightboxIndex, galleryUris.length]);

  // Keyboard arrows + Escape on web for the lightbox.
  useEffect(() => {
    if (Platform.OS !== 'web' || lightboxIndex == null) return;
    const handler = (e: Event) => {
      const key = (e as { key?: string }).key;
      if (key === 'ArrowRight') lightboxNext();
      else if (key === 'ArrowLeft') lightboxPrev();
      else if (key === 'Escape') closeLightbox();
    };
    const w = (globalThis as any).window;
    w?.addEventListener?.('keydown', handler);
    return () => { w?.removeEventListener?.('keydown', handler); };
  }, [lightboxIndex, lightboxNext, lightboxPrev, closeLightbox]);

  const handleLike = useCallback(async () => {
    if (!newsId) return;
    try { await likeNews(newsId).unwrap(); } catch {}
    void refetch(); void rLikes();
  }, [newsId, likeNews, refetch, rLikes]);

  const handleComment = useCallback(async () => {
    if (!newsId || !commentText.trim()) return;
    setSubmitting(true);
    try { await commentNews({ newsId, body: { comment: commentText.trim() } }).unwrap(); setCommentText(''); } catch {}
    void rComments(); void refetch();
    setSubmitting(false);
  }, [newsId, commentText, commentNews, rComments, refetch]);

  const onRefresh = useCallback(() => { void refetch(); void rComments(); void rLikes(); }, [refetch, rComments, rLikes]);

  const isGovSoft = skin.id === 'govSoft';
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const heroSub = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.6)';

  return (
    <QueryStates
      loading={isLoading && !article}
      apiError={!!(isError && !article)}
      error={error}
      isRefreshing={isFetching}
      onRetry={onRefresh}
      style={{ flex: 1 }}
    >
      {!article ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>{t('common.noData')}</Text>
        </View>
      ) : (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefresh} />}>

        {/* Hero */}
        {isGovSoft ? (
          <View style={[styles.softHeroCard, shadows.card, { backgroundColor: colors.card }]}>
            <View style={styles.softMediaWrap}>
              {galleryUris.length > 0 ? (
                <NewsCarousel
                  uris={galleryUris}
                  width={gallerySlideW}
                  height={210}
                  index={galleryIndex}
                  onIndexChange={setGalleryIndex}
                  onSlidePress={openLightbox}
                  innerRef={carouselRef}
                  primaryColor={colors.primary}
                />
              ) : coverImageUrl ? (
                <Pressable onPress={() => openLightbox(0)} style={styles.softMedia}>
                  <Image source={{ uri: coverImageUrl }} style={styles.softMedia} resizeMode="cover" />
                </Pressable>
              ) : (
                <View style={[styles.softMediaFallback, { backgroundColor: colors.cardTint ?? colors.background }]}>
                  <Text style={{ fontSize: 44, opacity: 0.5 }}>📰</Text>
                </View>
              )}
              {!!article.category && (
                <View style={[styles.softCategory, { backgroundColor: `${colors.primary}DD` }]}>
                  <Text style={styles.softCategoryText}>{article.category}</Text>
                </View>
              )}
            </View>
            <View style={styles.softHeroBody}>
              <Text style={[styles.softTitle, { color: colors.text }]}>
                {article.title}
              </Text>
              <View style={styles.softMetaRow}>
                <Text style={[styles.softMetaText, { color: colors.textSecondary }]}>
                  {article.publishedDate ?? article.date}
                </Text>
                <Text style={[styles.softMetaDot, { color: colors.textMuted }]}>•</Text>
                <Text style={[styles.softMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {article.authorName ?? 'SCAD'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground }]}>
            {article.category ? (
              <View style={[styles.heroCat, onStackLight && { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.heroCatText, { color: onStackLight ? colors.primary : '#fff' }]}>
                  {article.category}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.heroTitle, { color: colors.stackHeaderText }]}>
              {article.title}
            </Text>
            <View style={styles.heroMeta}>
              <Text style={[styles.heroMetaText, { color: heroSub }]}>
                {skin.iconPresentation === 'vector' ? '' : '📅 '}
                {article.publishedDate ?? article.date}
              </Text>
              <Text style={[styles.heroMetaText, { color: heroSub }]}>
                {skin.iconPresentation === 'vector' ? '' : '✍️ '}
                {article.authorName ?? 'SCAD'}
              </Text>
            </View>
          </View>
        )}

        {/* Image carousel for non-soft skins (soft already shows it inside the hero card) */}
        {!isGovSoft && galleryUris.length > 0 && (
          <View style={[styles.classicCarouselWrap, shadows.card, { backgroundColor: colors.card }]}>
            <NewsCarousel
              uris={galleryUris}
              width={gallerySlideW - 16}
              height={220}
              index={galleryIndex}
              onIndexChange={setGalleryIndex}
              onSlidePress={openLightbox}
              innerRef={carouselRef}
              primaryColor={colors.primary}
            />
          </View>
        )}

        {/* Social bar */}
        <View style={[styles.socialBar, shadows.card, { backgroundColor: colors.card, marginTop: isGovSoft ? 10 : -16 }]}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleLike} activeOpacity={0.6}>
            <Text style={{ fontSize: 20 }}>❤️</Text>
            <Text style={[styles.socialVal, { color: colors.danger }]}>{article.likesCount ?? likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={() => setTab('comments')} activeOpacity={0.6}>
            <Text style={{ fontSize: 20 }}>💬</Text>
            <Text style={[styles.socialVal, { color: colors.primary }]}>{article.commentsCount ?? comments.length}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.divider }]}>
          {([
            { key: 'article' as TabKey, label: 'Article', emoji: '📄' },
            { key: 'comments' as TabKey, label: `Comments (${comments.length})`, emoji: '💬' },
            { key: 'likes' as TabKey, label: `Likes (${likes.length})`, emoji: '❤️' },
          ]).map((tb) => {
            const active = tab === tb.key;
            return (
              <TouchableOpacity key={tb.key} style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setTab(tb.key)} activeOpacity={0.7}>
                <Text style={{ fontSize: 13 }}>{tb.emoji}</Text>
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{tb.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Article tab */}
        {tab === 'article' && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            {article.titleAr && article.titleAr !== article.title ? (
              <Text style={[styles.titleAr, { color: colors.textSecondary }]}>{article.titleAr}</Text>
            ) : null}
            {bodyParagraphs.length === 0 ? (
              <Text style={[styles.body, { color: colors.textMuted, fontStyle: 'italic' }]}>
                No article content available.
              </Text>
            ) : (
              bodyParagraphs.map((p, i) => (
                <Text
                  key={`p-${i}`}
                  style={[
                    styles.body,
                    { color: colors.textSecondary, marginTop: i === 0 ? 0 : 12 },
                  ]}
                >
                  {p}
                </Text>
              ))
            )}
          </View>
        )}

        {/* Comments tab */}
        {tab === 'comments' && (
          <View>
            {comments.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No comments yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Be the first to share your thoughts!</Text>
              </View>
            ) : comments.map((c: any, i: number) => {
              const bg = accentChroma(colors, skin, i + 2);
              return (
                <View key={String(c.id ?? i)} style={[styles.commentCard, shadows.card, { backgroundColor: colors.card }]}>
                  <View style={styles.commentTop}>
                    <View style={[styles.commentAvatar, { backgroundColor: bg }]}>
                      <Text style={styles.commentAvatarText}>{getInitials(c.authorName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.commentAuthor, { color: colors.text }]}>{c.authorName}</Text>
                      {c.authorDepartment ? <Text style={[styles.commentDept, { color: colors.textMuted }]}>{c.authorDepartment}</Text> : null}
                    </View>
                    <Text style={[styles.commentTime, { color: colors.textMuted }]}>{timeAgo(c.createdDate)}</Text>
                  </View>
                  <Text style={[styles.commentBody, { color: colors.textSecondary }]}>{c.comment}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Likes tab */}
        {tab === 'likes' && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            {likes.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>❤️</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No likes yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap the heart to be the first!</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.likesHeader, { color: colors.text }]}>Liked by {likes.length} {likes.length === 1 ? 'person' : 'people'}</Text>
                {likes.map((l: any, i: number) => (
                  <View key={String(l.id ?? i)} style={[styles.likeRow, { borderBottomColor: colors.divider }]}>
                    <View style={[styles.likeAvatar, { backgroundColor: accentChroma(colors, skin, i + 4) }]}>
                      <Text style={styles.likeAvatarText}>{getInitials(l.likedByName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.likeName, { color: colors.text }]}>{l.likedByName}</Text>
                      {l.likedByDepartment ? <Text style={[styles.likeDept, { color: colors.textMuted }]}>{l.likedByDepartment}</Text> : null}
                    </View>
                    <Text style={[styles.likeTime, { color: colors.textMuted }]}>{timeAgo(l.likedDate)}</Text>
                    <Text style={{ fontSize: 14 }}>❤️</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Comment input — visible on comments tab */}
      {tab === 'comments' && (
        <View style={[styles.inputBar, shadows.card, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
          <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.cardTint }]}
            placeholder="Write a comment..." placeholderTextColor={colors.textMuted}
            value={commentText} onChangeText={setCommentText} multiline maxLength={500} />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.greyCard }]}
            onPress={handleComment} disabled={!commentText.trim() || submitting} activeOpacity={0.7}>
            <Text style={styles.sendBtnText}>{submitting ? '...' : '>'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <NewsLightbox
        uris={galleryUris}
        index={lightboxIndex}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
      />
    </KeyboardAvoidingView>
      )}
    </QueryStates>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Carousel + Lightbox                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

interface NewsCarouselProps {
  uris: string[];
  width: number;
  height: number;
  index: number;
  onIndexChange: (i: number) => void;
  onSlidePress: (i: number) => void;
  innerRef: React.MutableRefObject<FlatList<string> | null>;
  primaryColor: string;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({
  uris, width, height, index, onIndexChange, onSlidePress, innerRef, primaryColor,
}) => {
  const safeWidth = Math.max(1, width);
  const total = uris.length;

  const scrollTo = useCallback((target: number) => {
    if (total === 0) return;
    const next = (target + total) % total;
    onIndexChange(next);
    innerRef.current?.scrollToIndex({ index: next, animated: true });
  }, [total, onIndexChange, innerRef]);

  const handleMomentumEnd = useCallback((e: any) => {
    const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
    const i = Math.round(offsetX / safeWidth);
    if (i !== index) onIndexChange(Math.max(0, Math.min(total - 1, i)));
  }, [safeWidth, index, total, onIndexChange]);

  if (total === 0) return null;

  return (
    <View style={{ width: safeWidth, height, position: 'relative', alignSelf: 'center' }}>
      <FlatList
        ref={innerRef as any}
        data={uris}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => `${u}-${i}`}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({ length: safeWidth, offset: safeWidth * i, index: i })}
        renderItem={({ item, index: i }) => (
          <Pressable onPress={() => onSlidePress(i)} style={{ width: safeWidth, height }}>
            <Image source={{ uri: item }} style={{ width: safeWidth, height }} resizeMode="cover" />
          </Pressable>
        )}
      />

      {total > 1 && (
        <>
          {/* Prev / Next chevrons */}
          <TouchableOpacity
            accessibilityLabel="Previous photo"
            onPress={() => scrollTo(index - 1)}
            style={[styles.carouselNav, { left: 8 }]}
            activeOpacity={0.7}
          >
            <Text style={styles.carouselNavText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Next photo"
            onPress={() => scrollTo(index + 1)}
            style={[styles.carouselNav, { right: 8 }]}
            activeOpacity={0.7}
          >
            <Text style={styles.carouselNavText}>›</Text>
          </TouchableOpacity>

          {/* Counter pill */}
          <View style={styles.carouselCounter}>
            <Text style={styles.carouselCounterText}>{index + 1} / {total}</Text>
          </View>

          {/* Dot indicators */}
          <View style={styles.carouselDots} pointerEvents="box-none">
            {uris.map((_, i) => (
              <TouchableOpacity
                key={`dot-${i}`}
                onPress={() => scrollTo(i)}
                style={[
                  styles.carouselDot,
                  { backgroundColor: i === index ? primaryColor : 'rgba(255,255,255,0.55)' },
                  i === index && styles.carouselDotActive,
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

interface NewsLightboxProps {
  uris: string[];
  index: number | null;
  onClose: () => void;
  /** Called whenever the active slide changes — both via swipe and via the prev/next chevrons. */
  onIndexChange: (i: number) => void;
}

const NewsLightbox: React.FC<NewsLightboxProps> = ({ uris, index, onClose, onIndexChange }) => {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string> | null>(null);
  const total = uris.length;
  const safeWidth = Math.max(1, width);
  // Reserve a strip near the top/bottom for the close button and counter so a
  // tap there hits the backdrop (closes the lightbox) rather than the image.
  const stripH = Math.round(height * 0.82);

  // Whenever the index prop changes (prev/next buttons, web arrow keys), keep
  // the FlatList aligned to the new slide. Guard `total` so the effect bails
  // out before the list mounts.
  useEffect(() => {
    if (index == null || total === 0) return;
    listRef.current?.scrollToIndex({ index, animated: true });
  }, [index, total]);

  const handleMomentumEnd = useCallback((e: any) => {
    if (index == null || total === 0) return;
    const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
    const i = Math.round(offsetX / safeWidth);
    const clamped = Math.max(0, Math.min(total - 1, i));
    if (clamped !== index) onIndexChange(clamped);
  }, [safeWidth, index, total, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index == null || total === 0) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (index == null || total === 0) return;
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  if (index == null || total === 0) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.lbBackdrop}>
        {/* Backdrop tap-to-close. Lives behind the image strip so taps on the
            top/bottom dark areas dismiss, while horizontal swipes inside the
            image strip are owned by the FlatList. */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Swipeable image strip — same paging mechanic as the in-page carousel
            so users get the expected mobile gesture for next/previous photo. */}
        <FlatList
          ref={listRef as any}
          data={uris}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: safeWidth, offset: safeWidth * i, index: i })}
          onMomentumScrollEnd={handleMomentumEnd}
          keyExtractor={(u, i) => `${u}-${i}`}
          style={{ width: safeWidth, height: stripH, zIndex: 1 }}
          renderItem={({ item }) => (
            <View style={{ width: safeWidth, height: stripH, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={{ uri: item }}
                style={{ width: safeWidth, height: stripH }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Top bar */}
        <View style={styles.lbTopBar} pointerEvents="box-none">
          <Text style={styles.lbCounter}>{index + 1} / {total}</Text>
          <TouchableOpacity
            accessibilityLabel="Close image viewer"
            onPress={onClose}
            style={styles.lbClose}
            activeOpacity={0.7}
          >
            <Text style={styles.lbCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        {total > 1 && (
          <>
            <TouchableOpacity
              accessibilityLabel="Previous photo"
              onPress={goPrev}
              style={[styles.lbNav, { left: 16 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.lbNavText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Next photo"
              onPress={goNext}
              style={[styles.lbNav, { right: 16 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.lbNavText}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: { padding: 20, paddingTop: Platform.OS === 'web' ? 20 : 16, paddingBottom: 28 },
  heroCat: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  heroCatText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 10 },
  heroMeta: { flexDirection: 'row', gap: 16 },
  heroMetaText: { fontSize: 12 },

  softHeroCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  softMediaWrap: { height: 210, position: 'relative' },
  softMedia: { width: '100%', height: '100%' },
  softMediaFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  softCategory: { position: 'absolute', top: 12, left: 12, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  softCategoryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  softHeroBody: { padding: 14, paddingTop: 12 },
  softTitle: { fontSize: 21, lineHeight: 27, fontWeight: '800' },
  softMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  softMetaText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  softMetaDot: { fontSize: 11, fontWeight: '700' },

  socialBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: -16, borderRadius: 14, paddingVertical: 12 },
  socialBtn: { flex: 1, alignItems: 'center', gap: 2 },
  socialVal: { fontSize: 16, fontWeight: '900' },

  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, marginTop: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 12, marginRight: 4 },
  tabText: { fontSize: 12, fontWeight: '700' },

  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16 },
  titleAr: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24 },

  commentCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 14 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatar: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentDept: { fontSize: 10, marginTop: 1 },
  commentTime: { fontSize: 10, marginLeft: 'auto' },
  commentBody: { fontSize: 13, lineHeight: 19, marginLeft: 44 },

  likesHeader: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  likeAvatar: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  likeAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  likeName: { fontSize: 13, fontWeight: '700' },
  likeDept: { fontSize: 10, marginTop: 1 },
  likeTime: { fontSize: 10 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 13 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  classicCarouselWrap: { marginHorizontal: 16, marginTop: 12, padding: 8, borderRadius: 14, overflow: 'hidden' },
  carouselNav: {
    position: 'absolute', top: '50%', marginTop: -22,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  carouselNavText: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 30 },
  carouselCounter: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  carouselCounterText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  carouselDots: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  carouselDot: {
    width: 8, height: 8, borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)',
  },
  carouselDotActive: { width: 22 },

  lbBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbTopBar: {
    position: 'absolute', top: Platform.OS === 'web' ? 16 : 36, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 2,
  },
  lbCounter: {
    color: '#fff', fontSize: 13, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  lbClose: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  lbNav: {
    position: 'absolute', top: '50%', marginTop: -28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  lbNavText: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 38 },
});

export default NewsDetailScreen;
