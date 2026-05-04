import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Image, useWindowDimensions } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetOffersQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import RichHtmlView from '../../../shared/components/RichHtmlView';
import { offerCoverApiUrl } from '../../../shared/utils/portalCoverApi';
import QueryStates from '../../../shared/components/QueryStates';

const OfferDetailScreen = ({ route }: { route?: { params?: { offerId?: number } } }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { width: winW } = useWindowDimensions();
  const offerId = route?.params?.offerId;
  const { data, isLoading, isFetching, isError, error, refetch } = useGetOffersQuery();
  const [coverFailed, setCoverFailed] = useState(false);

  const item = useMemo(() => {
    const list = asArray<any>(data);
    if (offerId == null) return list[0] ?? null;
    const target = String(offerId);
    return list.find((o: any) => String(o.id ?? o.offerId) === target) ?? null;
  }, [data, offerId]);

  useEffect(() => {
    setCoverFailed(false);
  }, [item?.id]);

  const id = item?.id ?? item?.offerId;
  const hasCover = !!String(item?.coverImageUrl ?? '').trim();
  const coverUri = item && hasCover && id != null ? offerCoverApiUrl(id) : undefined;
  const bodyHtml = item ? String(item.bodyHtml ?? item.body ?? '').trim() : '';
  const contentW = winW - 32;

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
      {coverUri && !coverFailed ? (
        <Image
          source={{ uri: coverUri }}
          style={styles.heroImage}
          resizeMode="cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <View style={[styles.hero, { backgroundColor: '#E67E22' }]}>
          <Text style={styles.heroEmoji}>🏷️</Text>
          <Text style={styles.heroTitleLight} numberOfLines={4}>{item.title}</Text>
          {item.offerDate ? <Text style={styles.heroDateLight}>📅 {item.offerDate}</Text> : null}
        </View>
      )}
      {coverUri && !coverFailed ? (
        <View style={[styles.heroTextWrap, { backgroundColor: colors.background }]}>
          <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={4}>{item.title}</Text>
          {item.offerDate ? <Text style={[styles.heroDate, { color: colors.textMuted }]}>📅 {item.offerDate}</Text> : null}
        </View>
      ) : null}

      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        {item.titleAr && item.titleAr !== item.title ? (
          <Text style={[styles.titleAr, { color: colors.textSecondary }]}>{item.titleAr}</Text>
        ) : null}
        {bodyHtml ? (
          <RichHtmlView
            html={bodyHtml}
            minHeight={200}
            contentWidth={contentW}
            surfaceColor={colors.card}
            textColor={colors.text}
          />
        ) : (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {t('common.noData')}
          </Text>
        )}
      </View>
    </ScrollView>
      )}
    </QueryStates>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 20, paddingTop: Platform.OS === 'web' ? 20 : 16, paddingBottom: 28, alignItems: 'center' },
  heroImage: { width: '100%', height: 200, backgroundColor: '#E8EDF2' },
  heroTextWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  heroEmoji: { fontSize: 48, marginBottom: 12, opacity: 0.7 },
  heroTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26, textAlign: 'center' },
  heroTitleLight: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26, textAlign: 'center' },
  heroDate: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  heroDateLight: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  card: { marginHorizontal: 16, marginTop: 8, borderRadius: 14, padding: 16 },
  titleAr: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  muted: { fontSize: 15, lineHeight: 24 },
});

export default OfferDetailScreen;
