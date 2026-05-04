import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ApprovalsStackParamList, ApprovalsTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetApprovalsInboxQuery } from '../services/approvalsApi';
import { useAppSelector } from '../../../store/store';
import {
  ALL_APPROVAL_TYPES_ICON,
  getModuleDisplayName,
  moduleIcon,
} from '../utils/moduleLabels';
import type { ApprovalInboxRow } from '../utils/approvalInboxRouting';
import { formatSmartDateTime } from '../../../shared/utils/dateUtils';
import QueryStates from '../../../shared/components/QueryStates';
import ApprovalsInboxSkeleton from '../../../shared/components/skeleton/ApprovalsInboxSkeleton';

type ModuleCountRow = { module?: string; c?: number };

function parseModuleCounts(json: string | undefined | null): { code: string; count: number }[] {
  if (json == null || String(json).trim() === '') return [];
  try {
    const a = JSON.parse(String(json)) as unknown;
    if (!Array.isArray(a)) return [];
    return a
      .map((r) => {
        const x = r as ModuleCountRow;
        const code = (x?.module ?? '').toString();
        const count = Number(x?.c) || 0;
        return { code, count };
      })
      .filter((x) => x.code && x.count > 0);
  } catch {
    return [];
  }
}

function formatAge(ageDays: number | undefined | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (ageDays == null || !Number.isFinite(ageDays)) return '—';
  if (ageDays < 1 / 24) return t('approvals.inbox.ageJustNow', { defaultValue: 'Just now' });
  if (ageDays < 1) {
    const h = Math.round(ageDays * 24);
    return t('approvals.inbox.ageHours', { n: h, defaultValue: `${h}h` });
  }
  if (ageDays < 7) {
    const d = ageDays.toFixed(1);
    return t('approvals.inbox.ageDays', { n: d, defaultValue: `${d}d` });
  }
  const w = (ageDays / 7).toFixed(1);
  return t('approvals.inbox.ageWeeks', { n: w, defaultValue: `${w}w` });
}

const ApprovalsInboxScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<ApprovalsStackParamList, 'ApprovalsInbox'>>();
  const navigation = useNavigation<ApprovalsTabNavigation<'ApprovalsInbox'>>();
  const insets = useSafeAreaInsets();
  const { colors, fontFamily, shadows, isDark } = useTheme();
  /** Filled pill — high contrast on primary (fixes washed-out grey selected chips). */
  const chipFgOnPrimary = isDark ? '#041018' : '#FFFFFF';
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<'oldest' | 'newest'>('oldest');
  const deepLinkOpened = useRef(false);
  const userId = useAppSelector((s) => s.auth.user?.userId);

  // Unfiltered inbox: drives type chips only. Filtering by module in the API
  // reshapes summary.moduleCountsJson to the active module only — that made
  // other chips disappear. Always load counts across all modules (same q/search).
  const countsQueryArgs = useMemo(
    () => ({
      take: 100,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(userId ? { userId } : {}),
    }),
    [q, userId]
  );
  const listQueryArgs = useMemo(
    () => ({
      ...countsQueryArgs,
      ...(mod ? { module: mod } : {}),
    }),
    [countsQueryArgs, mod]
  );

  const {
    data: countsData,
    refetch: refetchCounts,
  } = useGetApprovalsInboxQuery(countsQueryArgs, { skip: !userId });
  const {
    data: listData,
    isFetching,
    isLoading: isListLoading,
    refetch: refetchList,
    isError: isListError,
    error: listLoadError,
  } = useGetApprovalsInboxQuery(listQueryArgs, {
    skip: !userId,
  });

  const countsBody = countsData as { summary?: { total?: number; moduleCountsJson?: string } } | undefined;
  const listBody = listData as { summary?: { total?: number }; items?: any[] } | undefined;

  /** Overall pending count — always full inbox for current search (not scoped to chip). */
  const total = countsBody?.summary?.total ?? 0;

  /** Filtered rows for the flat list only. */
  const rawItems: any[] = Array.isArray(listBody?.items) ? listBody.items! : [];

  const items = useMemo(() => {
    const list = [...rawItems];
    const getDate = (r: any) => {
      const s = r.createdDate ?? r.CreatedDate;
      const d = s ? new Date(s).getTime() : 0;
      return Number.isFinite(d) ? d : 0;
    };
    list.sort((a, b) => (sort === 'oldest' ? getDate(a) - getDate(b) : getDate(b) - getDate(a)));
    return list;
  }, [rawItems, sort]);

  const filterModules = useMemo(() => {
    const rows = parseModuleCounts(countsBody?.summary?.moduleCountsJson);
    return rows.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, undefined, { sensitivity: 'base' }));
  }, [countsBody?.summary?.moduleCountsJson]);

  const filterCodes = useMemo(() => new Set(filterModules.map((m) => m.code)), [filterModules]);

  useEffect(() => {
    if (mod != null && !filterCodes.has(mod)) {
      setMod(undefined);
    }
  }, [mod, filterCodes]);

  useEffect(() => {
    const p = route.params;
    if (p?.taskUid && !deepLinkOpened.current) {
      deepLinkOpened.current = true;
      navigation.navigate('ApprovalDetail', { itemId: p.taskUid });
    }
  }, [route, navigation]);

  const onRefresh = useCallback(() => {
    void refetchCounts();
    void refetchList();
  }, [refetchCounts, refetchList]);

  const openItem = (row: any) => {
    const id = (row.id ?? row.Id ?? row.taskUid) as string | undefined;
    if (id == null || String(id).trim() === '') return;
    const preview = row as ApprovalInboxRow;
    navigation.navigate('ApprovalDetail', { itemId: String(id).trim(), preview });
  };

  const shownCount = mod ? items.length : total;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="screen.approvals_inbox">
      <View style={[styles.top, { paddingTop: Math.max(4, insets.top > 0 ? 2 : 6) }]}>
        {/* Title is rendered by the native stack header — don't duplicate it
            in-screen. We keep only the subtitle (count summary) + total badge. */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <Text style={[styles.sub, { color: colors.textSecondary, fontFamily }]} numberOfLines={1}>
              {mod
                ? t('approvals.inbox.subtitleFiltered', '{{n}} in this type · {{total}} total', {
                    n: items.length,
                    total,
                  })
                : t('approvals.inbox.subtitle', '{{n}} need your action', { n: shownCount })}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${colors.primary}22` }]}>
            <Text style={[styles.badgeNum, { color: colors.primary, fontFamily }]}>
              {total > 999 ? '999+' : total}
            </Text>
          </View>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('approvals.inbox.searchPlaceholder', 'Search…')}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text, fontFamily }]}
            returnKeyType="search"
          />
        </View>

        <View style={styles.typeRow}>
          <Text style={[styles.filterLabel, { color: colors.textMuted, fontFamily }]}>
            {t('approvals.inbox.filterType', 'Type')}
          </Text>
          <Text style={[styles.filterHint, { color: colors.textMuted, fontFamily }]}>
            {t('approvals.inbox.byVolume', 'by count')}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            onPress={() => setMod(undefined)}
            activeOpacity={0.85}
            style={[
              styles.chip,
              shadows?.card,
              {
                borderColor: !mod ? colors.primary : colors.divider,
                backgroundColor: !mod ? colors.primary : colors.card,
              },
            ]}
          >
            <Text style={styles.chipEmoji} accessible={false}>
              {ALL_APPROVAL_TYPES_ICON}
            </Text>
            <Text
              style={[
                styles.chipTxt,
                { color: !mod ? chipFgOnPrimary : colors.text, fontFamily },
              ]}
              numberOfLines={1}
            >
              {t('common.all', 'All')} {total > 0 ? ` · ${total}` : ''}
            </Text>
          </TouchableOpacity>
          {filterModules.map((row) => {
            const c = row.code;
            const on = mod === c;
            const emoji = moduleIcon(c);
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setMod(c)}
                activeOpacity={0.85}
                accessibilityState={{ selected: on }}
                style={[
                  styles.chip,
                  shadows?.card,
                  {
                    borderColor: on ? colors.primary : colors.divider,
                    backgroundColor: on ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text style={styles.chipEmoji} accessible={false}>
                  {emoji}
                </Text>
                <Text
                  style={[styles.chipTxt, { color: on ? chipFgOnPrimary : colors.text, fontFamily }]}
                  numberOfLines={1}
                >
                  {getModuleDisplayName(t, c)}
                  {row.count > 0 ? ` · ${row.count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.sortRow, { borderTopColor: colors.divider }]}>
          <Text style={[styles.sortLabel, { color: colors.textMuted, fontFamily }]}>
            {t('approvals.inbox.sort', 'Order')}
          </Text>
          <View style={styles.sortToggles}>
            {(['oldest', 'newest'] as const).map((k) => {
              const sel = sort === k;
              return (
              <TouchableOpacity
                key={k}
                onPress={() => setSort(k)}
                activeOpacity={0.85}
                style={[
                  styles.sortChip,
                  {
                    borderColor: sel ? colors.primary : colors.divider,
                    backgroundColor: sel ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: sel ? chipFgOnPrimary : colors.textSecondary,
                    fontFamily,
                  }}
                >
                  {k === 'oldest'
                    ? t('approvals.inbox.sortOldestShort', 'Oldest')
                    : t('approvals.inbox.sortNewestShort', 'Newest')}
                </Text>
              </TouchableOpacity>
            );
            })}
          </View>
        </View>
      </View>

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(isListError && !!userId)}
        error={listLoadError}
        isRefreshing={isFetching}
        onRetry={refetchList}
        style={{ flex: 1 }}
      >
      <FlatList
        data={items}
        keyExtractor={(i, idx) => String(i.id ?? i.Id ?? idx)}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isListLoading} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(32, insets.bottom + 16) }}
        ListEmptyComponent={
          !userId ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 48, fontFamily }}>
              {t('approvals.inbox.signIn', 'Sign in to load your approvals')}
            </Text>
          ) : isFetching && items.length === 0 ? (
            <ApprovalsInboxSkeleton />
          ) : isFetching ? null : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16, fontFamily }}>
                {t('approvals.inbox.empty', 'You are all caught up')}
              </Text>
            </View>
          )
        }
        renderItem={({ item: row }) => {
          const code = (row.moduleCode ?? row.module ?? '') as string;
          return (
            <TouchableOpacity
              onPress={() => openItem(row)}
              style={[
                styles.card,
                shadows?.card,
                { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider },
              ]}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.modIcon, { backgroundColor: `${colors.primary}12` }]}> 
                  <Text style={styles.modEmoji}>{moduleIcon(code)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.pillLine}>
                    <View style={[styles.pill, { backgroundColor: `${colors.primary}14` }]}>
                      <Text style={[styles.pillTxt, { color: colors.primary, fontFamily }]} numberOfLines={1}>
                        {getModuleDisplayName(t, code)}
                      </Text>
                    </View>
                    <Text style={[styles.age, { color: colors.textMuted, fontFamily }]}>{formatAge(row.ageDays, t)}</Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text, fontFamily }]}> 
                    {row.title ?? '—'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.metaLine, { color: colors.textSecondary, fontFamily }]}> 
                    {[row.status, row.priority].filter(Boolean).join(' · ')}
                  </Text>
                  {(row.fromName || row.toName) && (
                    <Text numberOfLines={2} style={[styles.people, { color: colors.textSecondary, fontFamily }]}> 
                      {row.fromName ? `${t('approvals.inbox.from', 'From')}: ${row.fromName}` : ''}
                      {row.fromName && row.toName ? ' · ' : ''}
                      {row.toName ? `${t('approvals.inbox.to', 'To')}: ${row.toName}` : ''}
                    </Text>
                  )}
                  {row.createdDate && (
                    <Text style={[styles.dateLine, { color: colors.textMuted, fontFamily }]}> 
                      {t('approvals.inbox.queued', 'In queue since')}{' '}
                      {formatSmartDateTime(row.createdDate)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.chev, { color: colors.textMuted }]}>›</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  top: { paddingHorizontal: 14, paddingBottom: 8, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  sub: { fontSize: 12.5, marginTop: 2 },
  badgeNum: { fontWeight: '800', fontSize: 14 },
  badge: {
    minWidth: 36,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  searchIcon: { fontSize: 16, marginRight: 6, opacity: 0.55 },
  searchInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 8 : 7, fontSize: 14 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 2,
  },
  filterLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  filterHint: { fontSize: 10, opacity: 0.85 },
  chips: { flexDirection: 'row', gap: 6, paddingRight: 6, alignItems: 'center', flexWrap: 'nowrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 7 : 6,
    maxWidth: 240,
    flexShrink: 0,
  },
  chipEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  chipTxt: { flexShrink: 1, fontSize: 12, fontWeight: '700' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sortLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sortToggles: { flexDirection: 'row', gap: 6 },
  sortChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modEmoji: { fontSize: 22 },
  pillLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pill: { maxWidth: '80%', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pillTxt: { fontSize: 11, fontWeight: '800' },
  age: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginTop: 2 },
  metaLine: { fontSize: 13, marginTop: 4 },
  people: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  dateLine: { fontSize: 11, marginTop: 6 },
  chev: { fontSize: 22, fontWeight: '300', marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
});

export default ApprovalsInboxScreen;
