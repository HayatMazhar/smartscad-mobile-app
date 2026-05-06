import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import AuthedImage from '../../../shared/components/AuthedImage';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useGetEventsQuery } from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import { eventCoverApiUrl } from '../../../shared/utils/portalCoverApi';
import { addEventToGoogleCalendarFromRow, formatRangeShort } from '../../../shared/utils/addToGoogleCalendar';
import { formatTimeRange } from '../../../shared/utils/dateUtils';

type EventSort = 'dateAsc' | 'dateDesc' | 'title' | 'location';
const SORTS: SortOption<EventSort>[] = [
  { key: 'dateAsc',  label: 'Date — soonest first', icon: '📅' },
  { key: 'dateDesc', label: 'Date — latest first',  icon: '📅' },
  { key: 'title',    label: 'Title — A to Z',       icon: '🔤' },
  { key: 'location', label: 'Location',             icon: '📍' },
];

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

const EventsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<MoreTabNavigation<'Events'>>();
  const { width } = useWindowDimensions();
  const imgW = Math.min(112, width * 0.28);
  const { colors, shadows } = useTheme();
  const { data, isFetching, isLoading, isError, refetch } = useGetEventsQuery();
  const [addBusy, setAddBusy] = useState(false);

  const [sortKey, setSortKey] = useState<EventSort>('dateAsc');
  const [sortOpen, setSortOpen] = useState(false);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('portal.events') });
  }, [navigation, t]);

  const allEvents = asArray<any>(data);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const isEventPast = (e: any): boolean => {
    if (e?.isPast === true) return true;
    const ed = e?.endDate ?? e?.endDateTime ?? e?.EndDate;
    const sd = e?.startDate ?? e?.date ?? e?.StartDate;
    const last = (ed && String(ed).trim() ? ed : sd) as string | undefined;
    if (!last) return false;
    const t = new Date(last).getTime();
    return Number.isFinite(t) ? t < todayMs : false;
  };

  const applySort = (list: any[]): any[] => {
    switch (sortKey) {
      case 'dateAsc':  return sortRowsBy(list, 'asc',  (r: any) => toDate(r.startDate ?? r.date ?? r.StartDate));
      case 'dateDesc': return sortRowsBy(list, 'desc', (r: any) => toDate(r.startDate ?? r.date ?? r.StartDate));
      case 'title':    return sortRowsBy(list, 'asc',  (r: any) => String(r.title ?? ''));
      case 'location': return sortRowsBy(list, 'asc',  (r: any) => String(r.location ?? ''));
      default:         return list;
    }
  };

  const upcoming = useMemo(() => applySort(allEvents.filter((e: any) => !isEventPast(e))), [allEvents, sortKey]);
  const past     = useMemo(() => applySort(allEvents.filter(isEventPast)),                    [allEvents, sortKey]);

  const eventKeyOf = (item: any) => String(item.id ?? item.eventId ?? '');

  const renderEventCard = ({ item, isPast: pastItem }: { item: any; isPast?: boolean }) => {
    const eid = eventKeyOf(item);
    const hasCover = !!String(item.coverImageUrl ?? '').trim();
    const coverFailed = failedCovers[eid];
    const coverUri = hasCover && item.id != null && !coverFailed ? eventCoverApiUrl(item.id) : undefined;
    const rangeLabel = formatRangeShort(item.startDate ?? item.date, item.endDate);
    const timeLabel = formatTimeRange(item.startTime, item.endTime);
    const descPlain = stripHtmlForCard(item.description).slice(0, 200);

    const addCal = async (e: any) => {
      if (addBusy) return;
      setAddBusy(true);
      try {
        await addEventToGoogleCalendarFromRow(e, { languageStartsWithAr: (i18n.language || '').startsWith('ar') });
      } finally {
        setAddBusy(false);
      }
    };

    return (
      <View
        style={[
          styles.card,
          shadows.card,
          { backgroundColor: colors.card, opacity: pastItem ? 0.58 : 1 },
        ]}
      >
        <TouchableOpacity
          style={styles.cardTap}
          onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          activeOpacity={0.75}
        >
          {coverUri ? (
            <AuthedImage
              source={{ uri: coverUri }}
              style={[styles.thumb, { width: imgW, backgroundColor: colors.divider }]}
              resizeMode="cover"
              onError={() => setFailedCovers((f) => ({ ...f, [eid]: true }))}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPh, { width: imgW, backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 28, opacity: 0.4 }}>📅</Text>
            </View>
          )}

          <View style={styles.textCol}>
            <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.rangeLine, { color: colors.textSecondary }]} numberOfLines={2}>
              📅 {rangeLabel}
            </Text>
            {timeLabel ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoEmoji}>🕐</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {timeLabel}
                </Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>📍</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.location ?? t('common.noData')}
              </Text>
            </View>
            {descPlain ? (
              <Text style={[styles.snippet, { color: colors.textMuted }]} numberOfLines={2}>
                {descPlain}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {!pastItem ? (
          <View style={[styles.bottomRow, { borderTopColor: colors.divider }]}>
            <TouchableOpacity
              style={[styles.addCalBtn, { backgroundColor: colors.success, opacity: addBusy ? 0.6 : 1 }]}
              activeOpacity={0.7}
              onPress={() => addCal(item)}
              disabled={addBusy}
            >
              <Text style={styles.addCalBtnText}>📅 {t('portal.addToCalendar', 'Add to calendar')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => renderEventCard({ item });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{upcoming.length}</Text>
          <Text> {t('portal.upcoming', 'upcoming')} · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<EventSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title={t('portal.sortCalendarEvents', 'Sort calendar events')}
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
        data={upcoming}
        keyExtractor={(item, index) => String(item.id ?? item.title ?? index)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          upcoming.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('portal.upcoming') || 'UPCOMING'}
            </Text>
          ) : null
        }
        ListFooterComponent={
          past.length > 0 ? (
            <View style={styles.pastSection}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {t('portal.past') || 'PAST'}
              </Text>
              {past.map((row: any, pi: number) => (
                <View key={String(row.id ?? row.title ?? `p-${pi}`)}>{renderEventCard({ item: row, isPast: true })}</View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && past.length === 0 && upcoming.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isError ? t('common.loadError', 'Could not load data') : t('common.noData')}
              </Text>
            </View>
          ) : null
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
  list: { padding: 16, gap: 12, paddingBottom: 32 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },

  card: { borderRadius: 12, overflow: 'hidden' },
  cardTap: { flexDirection: 'row', alignItems: 'stretch' },
  thumb: { minHeight: 120, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, paddingVertical: 10, paddingRight: 12, paddingLeft: 10, justifyContent: 'center' },
  eventTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 4, flex: 0 },
  rangeLine: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  infoEmoji: { fontSize: 12 },
  infoText: { fontSize: 12, flex: 1 },
  snippet: { fontSize: 12, lineHeight: 16, marginTop: 4 },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addCalBtn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addCalBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  pastSection: { marginTop: 20, gap: 12 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default EventsScreen;
