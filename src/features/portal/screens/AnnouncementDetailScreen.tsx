import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetAnnouncementsQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';

function stripHtml(html: string): string {
  return (html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
}

const AnnouncementDetailScreen = ({ route }: { route?: { params?: { announcementId?: number } } }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const catBg = onStackLight ? colors.primaryLight : 'rgba(255,255,255,0.2)';
  const catFg = onStackLight ? colors.primary : '#fff';
  const dateColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.6)';
  const announcementId = route?.params?.announcementId;
  const { data, isLoading, isFetching, isError, error, refetch } = useGetAnnouncementsQuery();

  const item = useMemo(() => {
    const list = asArray<any>(data);
    if (announcementId == null) return list[0] ?? null;
    const target = String(announcementId);
    return list.find((a: any) => String(a.announcementId ?? a.id) === target) ?? null;
  }, [data, announcementId]);

  const bodyText = item ? stripHtml(item.body ?? item.pageContent ?? '') : '';

  return (
    <QueryStates
      loading={isLoading && !item}
      apiError={!!(isError && !item)}
      error={error}
      isRefreshing={isFetching}
      onRetry={refetch}
      style={{ flex: 1 }}
    >
      {!item ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>{t('common.noData')}</Text>
        </View>
      ) : (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}>
      <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground }]}>
        <View style={[styles.heroCat, { backgroundColor: catBg }]}><Text style={[styles.heroCatText, { color: catFg }]}>{item.category ?? 'General'}</Text></View>
        <Text style={[styles.heroTitle, { color: colors.stackHeaderText }]} numberOfLines={4}>{item.title}</Text>
        <Text style={[styles.heroDate, { color: dateColor }]}>📅 {item.publishedDate}</Text>
      </View>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        {item.titleAr && item.titleAr !== item.title ? (
          <Text style={[styles.titleAr, { color: colors.textSecondary }]}>{item.titleAr}</Text>
        ) : null}
        <Text style={[styles.body, { color: colors.textSecondary }]}>{bodyText || item.title}</Text>
      </View>
    </ScrollView>
      )}
    </QueryStates>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 20, paddingTop: Platform.OS === 'web' ? 20 : 16, paddingBottom: 28 },
  heroCat: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  heroCatText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 10 },
  heroDate: { fontSize: 12 },
  card: { marginHorizontal: 16, marginTop: -16, borderRadius: 14, padding: 18 },
  titleAr: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24 },
});

export default AnnouncementDetailScreen;
