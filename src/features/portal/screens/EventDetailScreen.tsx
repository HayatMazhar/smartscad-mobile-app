import React, { useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image, useWindowDimensions, Alert } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useGetEventsQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import RichHtmlView from '../../../shared/components/RichHtmlView';
import { eventCoverApiUrl } from '../../../shared/utils/portalCoverApi';
import { addEventToGoogleCalendarFromRow, formatRangeShort } from '../../../shared/utils/addToGoogleCalendar';
import { formatTimeRange } from '../../../shared/utils/dateUtils';
import QueryStates from '../../../shared/components/QueryStates';

const EventDetailScreen = ({ route }: { route?: { params?: { eventId?: number | string } } }) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<MoreTabNavigation<'EventDetail'>>();
  const { colors, shadows } = useTheme();
  const { width: winW } = useWindowDimensions();
  const eventId = route?.params?.eventId;
  const { data, isLoading, isFetching, isError, error, refetch } = useGetEventsQuery();
  const [coverFailed, setCoverFailed] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('portal.events') });
  }, [navigation, t]);

  const ev = useMemo(() => {
    const list = asArray<any>(data);
    if (eventId == null) return list[0] ?? null;
    return list.find((e: any) => String(e.id ?? e.eventId) === String(eventId)) ?? null;
  }, [data, eventId]);

  const descHtml = String(ev?.description ?? ev?.body ?? '');

  const eid = ev?.id ?? ev?.eventId;
  const hasCover = !!String(ev?.coverImageUrl ?? '').trim();
  const coverUri = hasCover && eid != null && !coverFailed ? eventCoverApiUrl(eid) : undefined;
  const rangeLabel = ev
    ? formatRangeShort(String(ev.startDate ?? ev.date ?? ''), String(ev.endDate ?? ''))
    : '';
  const contentW = winW - 32;

  const isPast = (() => {
    if (ev?.isPast === true) return true;
    const end = ev?.endDate ? new Date(String(ev.endDate)) : null;
    const start = ev?.startDate || ev?.date;
    const last = (end && !Number.isNaN(end.getTime()) ? end : (start ? new Date(String(start)) : null));
    if (last && !Number.isNaN(last.getTime())) return last.getTime() < new Date().setHours(0, 0, 0, 0);
    return false;
  })();

  const onAddCal = useCallback(async () => {
    if (addBusy || !ev) return;
    setAddBusy(true);
    try {
      await addEventToGoogleCalendarFromRow(ev, { languageStartsWithAr: (i18n.language || '').startsWith('ar') });
    } catch {
      Alert.alert(t('common.error', 'Error'), t('portal.addCalendarError', 'Could not open the calendar app.'));
    } finally {
      setAddBusy(false);
    }
  }, [addBusy, ev, i18n.language, t]);

  return (
    <QueryStates
      loading={(isLoading || isFetching) && !ev}
      apiError={!!(isError && !ev)}
      error={error}
      isRefreshing={isFetching}
      onRetry={refetch}
      style={{ flex: 1 }}
    >
      {!ev ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>{t('common.noData')}</Text>
        </View>
      ) : (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}>
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={styles.heroImage}
          resizeMode="cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroDateBox}>
            <Text style={styles.heroMonth}>
              {ev.startDate
                ? new Date(String(ev.startDate)).toLocaleString('en', { month: 'short' }).toUpperCase()
                : '—'}
            </Text>
            <Text style={styles.heroDay}>
              {ev.startDate ? new Date(String(ev.startDate)).getDate() : ''}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={4}>{ev.title}</Text>
        </View>
      )}

      {coverUri ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.background }}>
          <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={4}>{ev.title}</Text>
        </View>
      ) : null}

      <View style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.card, marginTop: coverUri ? 8 : -20 },
      ]}
      >
        <InfoRow
          icon="📅"
          label={t('portal.dateRange', 'Date')}
          value={rangeLabel}
          colors={colors}
        />
        {formatTimeRange(ev.startTime, ev.endTime) ? (
          <InfoRow
            icon="🕐"
            label={t('portal.time', 'Time')}
            value={formatTimeRange(ev.startTime, ev.endTime)!}
            colors={colors}
          />
        ) : null}
        <InfoRow
          icon="📍"
          label={t('portal.location', 'Location')}
          value={String(ev.location ?? '—')}
          colors={colors}
        />
        {ev.eventType ? (
          <InfoRow icon="🏷️" label={t('portal.type', 'Type')} value={String(ev.eventType)} colors={colors} />
        ) : null}

        {descHtml ? (
          <View style={styles.richBlock}>
            <RichHtmlView
              html={descHtml}
              minHeight={180}
              contentWidth={contentW}
              surfaceColor={colors.card}
              textColor={colors.text}
            />
          </View>
        ) : null}

        {!isPast ? (
          <TouchableOpacity
            style={[styles.addCal, { backgroundColor: colors.success, opacity: addBusy ? 0.6 : 1 }]}
            onPress={onAddCal}
            disabled={addBusy}
            activeOpacity={0.75}
          >
            <Text style={styles.addCalText}>
              {addBusy ? '…' : `📅 ${t('portal.addToCalendar', 'Add to calendar')}`}
            </Text>
            <Text style={styles.addCalHint}>{t('portal.addCalendarHint', 'Opens Google Calendar — save to your account')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.pastBanner, { borderColor: colors.divider }]}>
            <Text style={[styles.pastText, { color: colors.textMuted }]}>
              {t('portal.eventEnded', 'This event has ended.')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
      )}
    </QueryStates>
  );
};

const InfoRow = ({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) => (
  <View style={styles.infoRow}>
    <Text style={{ fontSize: 18 }}>{icon}</Text>
    <View style={{ flex: 1, marginLeft: 10 }}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#27548A', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 16, paddingBottom: 36, alignItems: 'center' },
  heroImage: { width: '100%', height: 220, backgroundColor: '#E8EDF2' },
  listTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 8 },
  heroDateBox: { width: 68, height: 68, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroMonth: { color: '#FFD166', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroDay: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: -2 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26, textAlign: 'center', marginBottom: 10 },
  card: { marginHorizontal: 16, marginTop: -20, borderRadius: 14, padding: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  richBlock: { marginTop: 4 },
  addCal: { marginTop: 16, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' },
  addCalText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  addCalHint: { color: 'rgba(255,255,255,0.88)', fontSize: 11, marginTop: 4, textAlign: 'center' },
  pastBanner: { marginTop: 20, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14, alignItems: 'center' },
  pastText: { fontSize: 13, fontWeight: '600' },
});

export default EventDetailScreen;
