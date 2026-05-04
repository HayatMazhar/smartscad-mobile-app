import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList, MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import {
  useGetScadStarWinnerDetailQuery,
  useLikeNominationMutation,
  useCommentOnNominationMutation,
} from '../services/hrApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import QueryStates from '../../../shared/components/QueryStates';
import ScreenHeroBackButton from '../../../shared/components/ScreenHeroBackButton';
import { accentChroma } from '../../../app/theme/accentChroma';

type TabKey = 'about' | 'comments' | 'likes';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return dateStr.substring(0, 10);
}

const WinnerDetailScreen: React.FC<{ route: RouteProp<MoreStackParamList, 'WinnerDetail'> }> = ({ route }) => {
  const rawId = route.params.shortlistId;
  const shortlistId = typeof rawId === 'string' ? Number(rawId) : rawId;
  const navigation = useNavigation<MoreTabNavigation<'WinnerDetail'>>();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows, skin } = useTheme();
  const insets = useSafeAreaInsets();

  const paletteFor = useCallback(
    (seed?: string | number) => {
      const s = String(seed ?? '');
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return accentChroma(colors, skin, h);
    },
    [colors, skin],
  );
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const heroTitleColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.85)';
  const heroMuted = onStackLight ? colors.textMuted : 'rgba(255,255,255,0.6)';
  const heroNameArC = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.65)';

  const { data, isLoading, isFetching, isError, refetch } = useGetScadStarWinnerDetailQuery(shortlistId);
  const [likeWinner] = useLikeNominationMutation();
  const [commentWinner] = useCommentOnNominationMutation();

  const [tab, setTab] = useState<TabKey>('about');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // API returns { success: true, data: { winner: {...}, comments: [...], likes: [...] } }
  // See EnterpriseReadService.TryGetScadStarWinnerDetail + spMobile_ScadStar_GetWinnerDetail.
  const { winner, comments, likes } = useMemo(() => {
    if (!data) return { winner: null as any, comments: [] as any[], likes: [] as any[] };
    const envelope = asObject<any>(data) ?? {};
    const payload  = asObject<any>(envelope.data) ?? envelope;
    return {
      winner:   asObject<any>(payload.winner) ?? asObject<any>(payload) ?? null,
      comments: asArray<any>(payload.comments ?? []),
      likes:    asArray<any>(payload.likes ?? []),
    };
  }, [data]);

  const displayName = (en?: string, ar?: string) => (isAr && ar ? ar : (en || ar || ''));
  const hasLiked = !!winner?.hasLiked;

  const handleLike = useCallback(async () => {
    try { await likeWinner(shortlistId).unwrap(); void refetch(); } catch {}
  }, [likeWinner, shortlistId, refetch]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentWinner({ nominationId: shortlistId, body: { comment: commentText.trim() } }).unwrap();
      setCommentText('');
      void refetch();
    } catch {}
    setSubmitting(false);
  }, [commentText, commentWinner, shortlistId, refetch]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('More', { screen: 'Recognition' });
    }
  }, [navigation]);

  const winnerName = displayName(winner?.winnerName, winner?.winnerNameAr);
  const nominatorName = displayName(winner?.nominatedByName, winner?.nominatedByNameAr);
  const avatarBg = paletteFor(winner?.winnerId ?? shortlistId);

  const renderAbout = () => (
    <View>
      {winner?.description ? (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{'📝'}</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('scadStar.nominationReason', 'Nomination Reason')}
            </Text>
          </View>
          <Text style={[styles.descBody, { color: colors.textSecondary }]}>{winner.description}</Text>

          {winner.nominatedById ? (
            <View style={[styles.nominatorCard, { backgroundColor: colors.cardTint }]}>
              <ProfileAvatar
                userId={winner.nominatedById}
                name={nominatorName}
                size={40}
                borderRadius={12}
                backgroundColor={paletteFor(winner.nominatedById)}
                fontSize={14}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.nominatorLabel, { color: colors.textMuted }]}>
                  {t('scadStar.nominatedBy', 'Nominated by')}
                </Text>
                <Text style={[styles.nominatorName, { color: colors.text }]}>{nominatorName}</Text>
                {winner.nominatedByDepartment ? (
                  <Text style={[styles.nominatorDept, { color: colors.textMuted }]}>
                    {winner.nominatedByDepartment}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{'👤'}</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('scadStar.winnerProfile', 'Winner Profile')}
          </Text>
        </View>
        {[
          { label: t('scadStar.name', 'Name'), value: winnerName },
          { label: t('scadStar.jobTitle', 'Job Title'), value: winner?.jobTitle },
          { label: t('scadStar.department', 'Department'), value: winner?.department },
          { label: t('scadStar.sector', 'Sector'), value: winner?.sector },
          { label: t('scadStar.email', 'Email'), value: winner?.email },
          { label: t('scadStar.period', 'Period'), value: winner?.period },
          { label: t('scadStar.announced', 'Announced'), value: winner?.announcedDate },
        ].map((info, idx) => (
          info.value ? (
            <View key={idx} style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{info.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{info.value}</Text>
            </View>
          ) : null
        ))}
      </View>
    </View>
  );

  const renderComments = () => (
    <View>
      {comments.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{'💬'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('scadStar.noComments', 'No comments yet')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('scadStar.beFirstCommenter', 'Be the first to congratulate!')}
          </Text>
        </View>
      ) : (
        comments.map((c: any, i: number) => {
          const author = displayName(c.authorName, c.authorNameAr);
          return (
            <View key={c.id ?? i} style={[styles.commentCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.commentTop}>
                <ProfileAvatar
                  userId={c.authorId}
                  name={author}
                  size={36}
                  borderRadius={12}
                  backgroundColor={paletteFor(c.authorId ?? i)}
                  fontSize={13}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.commentAuthor, { color: colors.text }]} numberOfLines={1}>{author}</Text>
                  {c.authorDepartment || c.authorJobTitle ? (
                    <Text style={[styles.commentDept, { color: colors.textMuted }]} numberOfLines={1}>
                      {c.authorJobTitle || c.authorDepartment}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.commentTime, { color: colors.textMuted }]}>{timeAgo(c.createdDate)}</Text>
              </View>
              <Text style={[styles.commentBody, { color: colors.textSecondary }]}>{c.comment}</Text>
            </View>
          );
        })
      )}
    </View>
  );

  const renderLikes = () => (
    <View>
      {likes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>{'❤️'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('scadStar.noLikes', 'No likes yet')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('scadStar.beFirstLiker', 'Tap the heart to be the first!')}
          </Text>
        </View>
      ) : (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{'❤️'}</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('scadStar.likedByCount', 'Liked by {{count}}', { count: likes.length })}
            </Text>
          </View>
          {likes.map((l: any, i: number) => {
            const liker = displayName(l.likedByName, l.likedByNameAr);
            return (
              <View key={l.id ?? i} style={[styles.likeRow, { borderBottomColor: colors.divider }]}>
                <ProfileAvatar
                  userId={l.likedById}
                  name={liker}
                  size={36}
                  borderRadius={12}
                  backgroundColor={paletteFor(l.likedById ?? i)}
                  fontSize={13}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.likeName, { color: colors.text }]} numberOfLines={1}>{liker}</Text>
                  {l.likedByDepartment || l.likedByJobTitle ? (
                    <Text style={[styles.likeDept, { color: colors.textMuted }]} numberOfLines={1}>
                      {l.likedByJobTitle || l.likedByDepartment}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.likeTime, { color: colors.textMuted }]}>{timeAgo(l.likedDate)}</Text>
                <Text style={styles.likeHeart}>{'❤️'}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />
      <ScreenHeroBackButton layout="fullscreen" onPress={handleBack} style={{ zIndex: 10 }} />
      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(isError && !winner)}
        isRefreshing={isFetching}
        onRetry={() => void refetch()}
        style={{ flex: 1 }}
      >
      {isLoading && !winner ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ThemedActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !winner ? (
        <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
          <Text style={{ color: colors.textMuted }}>{t('scadStar.notFound', 'Winner not found')}</Text>
        </View>
      ) : (
      <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
      >
        <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground, paddingTop: insets.top + 8 }]}>
          <ScreenHeroBackButton layout="hero" onPress={handleBack} />
          <View style={styles.heroStarRow}>
            {skin.iconPresentation === 'vector' ? null : (
              <>
                <Text style={styles.heroStar}>{'⭐'}</Text>
                <Text style={styles.heroStar}>{'⭐'}</Text>
                <Text style={styles.heroStar}>{'⭐'}</Text>
              </>
            )}
          </View>
          <ProfileAvatar
            userId={winner?.winnerId}
            name={winnerName}
            size={84}
            borderRadius={26}
            backgroundColor={avatarBg}
            fontSize={30}
          />
          <Text style={[styles.heroName, { color: colors.stackHeaderText }]}>{winnerName || '---'}</Text>
          {winner?.winnerNameAr && winner.winnerNameAr !== winner.winnerName && !isAr ? (
            <Text style={[styles.heroNameAr, { color: heroNameArC }]}>{winner.winnerNameAr}</Text>
          ) : null}
          <Text style={[styles.heroTitle, { color: heroTitleColor }]}>{winner?.jobTitle ?? ''}</Text>
          <View style={styles.heroBadges}>
            {winner?.department ? (
              <View
                style={[
                  styles.heroBadge,
                  onStackLight && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text style={[styles.heroBadgeText, { color: onStackLight ? colors.text : '#fff' }]}>
                  {winner.department}
                </Text>
              </View>
            ) : null}
            {winner?.sector ? (
              <View
                style={[
                  styles.heroBadge,
                  onStackLight && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text style={[styles.heroBadgeText, { color: onStackLight ? colors.text : '#fff' }]}>
                  {winner.sector}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.heroPeriod, { color: heroMuted }]}>{winner?.period ?? ''}</Text>
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[
              styles.socialCard, shadows.card,
              { backgroundColor: hasLiked ? '#FCE8E6' : colors.card,
                borderColor: hasLiked ? colors.danger : 'transparent',
                borderWidth: hasLiked ? 1.5 : 0 },
            ]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Text style={styles.socialEmoji}>{hasLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.socialVal, { color: colors.danger }]}>
              {winner?.likesCount ?? likes.length}
            </Text>
            <Text style={[styles.socialLabel, { color: colors.textMuted }]}>
              {hasLiked
                ? t('scadStar.youLiked', 'You liked')
                : t('scadStar.likes', 'Likes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialCard, shadows.card, { backgroundColor: colors.card }]}
            onPress={() => setTab('comments')} activeOpacity={0.7}
          >
            <Text style={styles.socialEmoji}>{'💬'}</Text>
            <Text style={[styles.socialVal, { color: colors.primary }]}>
              {winner?.commentsCount ?? comments.length}
            </Text>
            <Text style={[styles.socialLabel, { color: colors.textMuted }]}>
              {t('scadStar.comments', 'Comments')}
            </Text>
          </TouchableOpacity>
          <View style={[styles.socialCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={styles.socialEmoji}>{'📅'}</Text>
            <Text style={[styles.socialVal, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
              {winner?.announcedDate ?? '---'}
            </Text>
            <Text style={[styles.socialLabel, { color: colors.textMuted }]}>
              {t('scadStar.announced', 'Announced')}
            </Text>
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: colors.divider }]}>
          {([
            { key: 'about' as TabKey, label: t('scadStar.tabs.about', 'About'), emoji: '📝', count: null },
            { key: 'comments' as TabKey, label: t('scadStar.tabs.comments', 'Comments'), emoji: '💬', count: comments.length },
            { key: 'likes' as TabKey, label: t('scadStar.tabs.likes', 'Likes'), emoji: '❤️', count: likes.length },
          ]).map((tb) => {
            const active = tab === tb.key;
            return (
              <TouchableOpacity
                key={tb.key}
                style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setTab(tb.key)} activeOpacity={0.7}
              >
                <Text style={styles.tabEmoji}>{tb.emoji}</Text>
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{tb.label}</Text>
                {tb.count != null ? (
                  <View style={[styles.tabBadge, { backgroundColor: active ? colors.primaryLight : colors.greyCard }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? colors.primary : colors.textMuted }]}>{tb.count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'about' && renderAbout()}
        {tab === 'comments' && renderComments()}
        {tab === 'likes' && renderLikes()}

        <View style={{ height: 20 }} />
      </ScrollView>

      {tab === 'comments' && (
        <View style={[styles.inputBar, shadows.card, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.cardTint }]}
            placeholder={t('scadStar.commentPlaceholder', 'Write a congratulations...')}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.greyCard }]}
            onPress={handleComment}
            disabled={!commentText.trim() || submitting} activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>{submitting ? '...' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      )}
      </>
      )}

      </QueryStates>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 16 },

  hero: {
    position: 'relative',
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroStarRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  heroStar: { fontSize: 20 },
  heroName: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  heroNameAr: { fontSize: 15, marginTop: 2, textAlign: 'center' },
  heroTitle: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroPeriod: { fontSize: 12, fontWeight: '600', marginTop: 10, letterSpacing: 0.5 },

  socialRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: -20 },
  socialCard: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  socialEmoji: { fontSize: 22, marginBottom: 6 },
  socialVal: { fontSize: 20, fontWeight: '900' },
  socialLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.3 },

  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, marginTop: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 14, marginRight: 4 },
  tabEmoji: { fontSize: 14 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginLeft: 2 },
  tabBadgeText: { fontSize: 11, fontWeight: '800' },

  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: '700' },

  descBody: { fontSize: 14, lineHeight: 22 },
  nominatorCard: { flexDirection: 'row', alignItems: 'center', marginTop: 14, borderRadius: 12, padding: 12 },
  nominatorLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  nominatorName: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  nominatorDept: { fontSize: 11, marginTop: 1 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },

  commentCard: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14 },
  commentTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  commentAuthor: { fontSize: 14, fontWeight: '700' },
  commentDept: { fontSize: 11, marginTop: 1 },
  commentTime: { fontSize: 11, marginLeft: 8 },
  commentBody: { fontSize: 14, lineHeight: 20, marginLeft: 46 },

  likeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  likeName: { fontSize: 14, fontWeight: '700' },
  likeDept: { fontSize: 11, marginTop: 1 },
  likeTime: { fontSize: 11, marginHorizontal: 8 },
  likeHeart: { fontSize: 16 },

  emptyWrap: { alignItems: 'center', marginTop: 50, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, maxHeight: 90 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

export default WinnerDetailScreen;
