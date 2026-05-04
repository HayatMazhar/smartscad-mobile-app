import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import {
  useGetCircularsQuery,
  useGetCircularTypesQuery,
  circularFileUrl,
} from '../services/portalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppSelector } from '../../../store/store';
import { asArray } from '../../../shared/utils/apiNormalize';
import {
  SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption,
} from '../../../shared/components/SortSheet';
import { downloadFile } from '../../../shared/utils/downloadFile';
import QueryStates from '../../../shared/components/QueryStates';

type CircSort = 'dateDesc' | 'dateAsc' | 'titleAsc' | 'typeAsc';
const SORTS: SortOption<CircSort>[] = [
  { key: 'dateDesc', label: 'Newest first',   icon: '📅' },
  { key: 'dateAsc',  label: 'Oldest first',   icon: '📅' },
  { key: 'titleAsc', label: 'Title — A to Z', icon: '🔤' },
  { key: 'typeAsc',  label: 'Type',           icon: '🏷️' },
];

/** One emoji per known CircularType ID — same intent as the web swiper icons. */
const TYPE_EMOJI: Record<number, string> = {
  1: '📰', // Circulars
  2: '⚖️', // Decisions
  3: '📜', // Legislation and Other
  4: '🏛️', // Official Gazette
  5: '🇦🇪', // Federal Laws and Decrees
  6: '📕', // Local Laws
  7: '📘', // Executive Regulations
  8: '🏢', // Executive Council Decisions
};

const CircularsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();

  const lang = useAppSelector((s) => s.auth.language);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const userId = useAppSelector((s) => s.auth.user?.userId);

  // ── data ───────────────────────────────────────────────────────────────
  const types = useGetCircularTypesQuery();
  const [selectedTypeId, setSelectedTypeId] = useState<number>(0); // 0 = All
  const list = useGetCircularsQuery(
    selectedTypeId > 0 ? { catId: selectedTypeId } : undefined,
  );

  const [sortKey, setSortKey] = useState<CircSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  const pick = (en: any, ar: any) => (lang === 'ar' ? (ar || en) : (en || ar));

  // Type chips: derive from /circulars/types endpoint; fall back to types
  // discovered in the list rows so the UI keeps working even if the types
  // endpoint isn't yet deployed.
  const typeChips = useMemo(() => {
    const fromTypes = asArray<any>(types.data).map((tt) => ({
      id: Number(tt.typeId ?? tt.id ?? 0),
      title: pick(tt.title ?? tt.titleEn, tt.titleAr),
      titleAr: tt.titleAr ?? tt.title,
      count: Number(tt.circularsCount ?? tt.rowCount ?? 0),
    })).filter((x) => x.id > 0);

    if (fromTypes.length > 0) return fromTypes;

    const seen = new Map<number, { id: number; title: string; titleAr: string; count: number }>();
    asArray<any>(list.data).forEach((r) => {
      const id = Number(r.circularTypeId ?? r.circularTypeID ?? 0);
      if (!id) return;
      const cur = seen.get(id);
      if (cur) cur.count += 1;
      else seen.set(id, {
        id,
        title: r.circularType ?? `Type ${id}`,
        titleAr: r.circularTypeAr ?? r.circularType ?? `Type ${id}`,
        count: 1,
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.id - b.id);
  }, [types.data, list.data, lang]);

  const totalCount = useMemo(
    () => typeChips.reduce((s, t) => s + t.count, 0),
    [typeChips],
  );

  const rows = useMemo(() => {
    const all = asArray<any>(list.data);
    switch (sortKey) {
      case 'dateDesc': return sortRowsBy(all, 'desc', (r) => toDate(r.issuedDate ?? r.date));
      case 'dateAsc':  return sortRowsBy(all, 'asc',  (r) => toDate(r.issuedDate ?? r.date));
      case 'titleAsc': return sortRowsBy(all, 'asc',  (r) => String(pick(r.title, r.titleAr) ?? ''));
      case 'typeAsc':  return sortRowsBy(all, 'asc',  (r) => String(pick(r.circularType, r.circularTypeAr) ?? ''));
      default:         return all;
    }
  }, [list.data, sortKey, lang]);

  const fmt = (v?: string) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime())
      ? String(v)
      : d.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        });
  };

  const stripHtml = (s?: string) =>
    String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // ── download ───────────────────────────────────────────────────────────
  const onDownload = async (item: any) => {
    const id = item.id ?? item.circularId;
    if (!id) return;
    if (item.canDownload === false) return;

    setDownloadingId(id);
    try {
      const fallbackName = `circular-${id}.pdf`;
      const fileName: string = item.fileName || fallbackName;
      await downloadFile({
        url: circularFileUrl(id),
        fileName,
        mime: undefined, // server sets Content-Type; helper guesses for the viewer
        bearerToken: accessToken ?? undefined,
        userId: userId ?? undefined,
        language: lang ?? 'en',
        autoOpen: true,
      });
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Download failed'),
        err?.message
          ? String(err.message)
          : t('circulars.downloadError', 'Could not download the file.'),
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────
  const isFetching = list.isFetching || types.isFetching;
  const isListInitialLoading = list.isLoading || types.isLoading;
  const refetchAll = () => { list.refetch(); types.refetch(); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Type filter chips — same set as the web swiper at the top of
          Pages/Circulars (Decisions, Circulars, Legislation, Official
          Gazette, Federal Laws & Decrees, Local Laws, Executive
          Regulations, Executive Council Decisions). */}
      <View style={styles.filterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* All */}
          {(() => {
            const active = selectedTypeId === 0;
            return (
              <TouchableOpacity
                key="all"
                onPress={() => setSelectedTypeId(0)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active ? shadows.button : shadows.card,
                ]}
              >
                <Text style={styles.chipEmoji} allowFontScaling={false}>📋</Text>
                <Text
                  style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {t('circulars.filter.all', 'All')}
                </Text>
                <View
                  style={[
                    styles.chipBadge,
                    { backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${colors.primary}14` },
                  ]}
                >
                  <Text
                    style={[styles.chipBadgeText, { color: active ? '#fff' : colors.primary }]}
                    allowFontScaling={false}
                  >
                    {totalCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {typeChips.map((tt) => {
            const active = selectedTypeId === tt.id;
            const emoji = TYPE_EMOJI[tt.id] ?? '🏷️';
            return (
              <TouchableOpacity
                key={tt.id}
                onPress={() => setSelectedTypeId(tt.id)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active ? shadows.button : shadows.card,
                ]}
              >
                <Text style={styles.chipEmoji} allowFontScaling={false}>{emoji}</Text>
                <Text
                  style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {tt.title}
                </Text>
                <View
                  style={[
                    styles.chipBadge,
                    { backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${colors.primary}14` },
                  ]}
                >
                  <Text
                    style={[styles.chipBadgeText, { color: active ? '#fff' : colors.primary }]}
                    allowFontScaling={false}
                  >
                    {tt.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort bar */}
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{rows.length}</Text>
          <Text> {t('circulars.unit', 'circulars')} · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<CircSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort circulars"
        colors={colors}
        shadows={shadows}
      />

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={list.isError}
        error={list.error}
        isRefreshing={list.isFetching}
        onRetry={list.refetch}
        style={{ flex: 1 }}
      >
      <FlatList
        data={rows}
        keyExtractor={(item, i) => String(item.circularId ?? item.id ?? i)}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isListInitialLoading} onRefresh={refetchAll} />
        }
        renderItem={({ item }) => {
          const id = item.id ?? item.circularId;
          const title   = pick(item.title, item.titleAr);
          const type    = pick(item.circularType, item.circularTypeAr) ?? item.category;
          const summary = stripHtml(pick(item.summary, item.summaryAr));
          const dateStr = fmt(item.issuedDate ?? item.date);
          const fileName: string | undefined = item.fileName;
          const canDownload = item.canDownload !== false; // default true if missing
          const isDownloading = downloadingId === id;

          return (
            <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.tagRow}>
                <View style={[styles.typeChip, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.typeChipText, { color: colors.primary }]} numberOfLines={1}>
                    {type || 'Circular'}
                  </Text>
                </View>
                {dateStr ? (
                  <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr}</Text>
                ) : null}
              </View>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              {summary ? (
                <Text style={[styles.sum, { color: colors.textSecondary }]} numberOfLines={3}>{summary}</Text>
              ) : null}

              {/* Download row */}
              <View style={styles.actionRow}>
                {fileName ? (
                  <Text
                    style={[styles.fileName, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    📎 {fileName}
                  </Text>
                ) : <View style={{ flex: 1 }} />}
                <TouchableOpacity
                  onPress={() => onDownload(item)}
                  disabled={!canDownload || isDownloading}
                  activeOpacity={0.7}
                  style={[
                    styles.dlButton,
                    {
                      backgroundColor: !canDownload
                        ? `${colors.border}80`
                        : isDownloading
                          ? `${colors.primary}40`
                          : colors.primary,
                    },
                    shadows.button,
                  ]}
                >
                  {isDownloading ? (
                    <ThemedActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.dlButtonText} allowFontScaling={false}>
                      ⬇  {t('circulars.download', 'Download')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isFetching ? null : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>{t('common.noData')}</Text>
          )
        }
      />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Type filter chips — fixed-height strip (same trick as LeaveHistory)
     so chip glyphs render without bottom-clipping on Android. */
  filterStrip: { height: 56, marginTop: 4, justifyContent: 'center' },
  filterRow:   { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    minHeight: 36,
  },
  chipEmoji:     { fontSize: 14, lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center' },
  chipText:      { fontSize: 13, fontWeight: '600', lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center', maxWidth: 180 },
  chipBadge:     { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipBadgeText: { fontSize: 11, fontWeight: '700', lineHeight: 14, includeFontPadding: false, textAlignVertical: 'center' },

  /* Sort bar */
  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },

  /* List */
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  tagRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  typeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: '70%' },
  typeChipText: { fontSize: 11, fontWeight: '700' },
  date:  { fontSize: 11 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sum:   { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, gap: 8,
  },
  fileName: {
    flex: 1, fontSize: 12,
  },
  dlButton: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    minWidth: 120, minHeight: 34,
  },
  dlButtonText: {
    color: '#fff', fontSize: 13, fontWeight: '700',
    includeFontPadding: false, textAlignVertical: 'center',
  },
});

export default CircularsScreen;
