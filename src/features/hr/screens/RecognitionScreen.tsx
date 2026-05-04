import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import {
  useGetScadStarWinnersQuery,
  useGetRecognitionPeriodsQuery,
  useLikeNominationMutation,
} from '../services/hrApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import QueryStates from '../../../shared/components/QueryStates';
import { accentChroma } from '../../../app/theme/accentChroma';

type WinSort = 'dateDesc' | 'dateAsc' | 'nameAsc' | 'likesDesc' | 'department';
const WINNER_SORTS: SortOption<WinSort>[] = [
  { key: 'dateDesc',   label: 'Newest announcement', icon: '📅' },
  { key: 'dateAsc',    label: 'Oldest announcement', icon: '📅' },
  { key: 'nameAsc',    label: 'Winner — A to Z',     icon: '🔤' },
  { key: 'likesDesc',  label: 'Most liked',          icon: '❤️' },
  { key: 'department', label: 'Department',          icon: '🏢' },
];

const RecognitionScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows, skin } = useTheme();

  const paletteFor = useCallback(
    (seed?: string | number) => {
      const s = String(seed ?? '');
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return accentChroma(colors, skin, h);
    },
    [colors, skin],
  );

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(undefined);
  const [winnerSort, setWinnerSort] = useState<WinSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  const {
    data: winnersData,
    isFetching: fWinners,
    isLoading: lWinners,
    isError: isWinnersError,
    error: winnersLoadError,
    refetch: rWinners,
  } = useGetScadStarWinnersQuery(selectedPeriodId);
  const { data: periodsData, refetch: rPeriods } =
    useGetRecognitionPeriodsQuery();
  const [likeWinner] = useLikeNominationMutation();

  const winners = useMemo(() => {
    const list = asArray<any>(winnersData);
    switch (winnerSort) {
      case 'dateDesc':   return sortRowsBy(list, 'desc', (r) => toDate(r.announcedDate));
      case 'dateAsc':    return sortRowsBy(list, 'asc',  (r) => toDate(r.announcedDate));
      case 'nameAsc':    return sortRowsBy(list, 'asc',  (r) => String(r.winnerName ?? ''));
      case 'likesDesc':  return sortRowsBy(list, 'desc', (r) => Number(r.likesCount ?? 0));
      case 'department': return sortRowsBy(list, 'asc',  (r) => String(r.department ?? r.sector ?? ''));
      default:           return list;
    }
  }, [winnersData, winnerSort]);
  const periods = useMemo(() => asArray<any>(periodsData), [periodsData]);

  const onRefresh = useCallback(() => {
    void rWinners();
    void rPeriods();
  }, [rWinners, rPeriods]);

  const handleLike = async (shortlistId: number) => {
    try { await likeWinner(shortlistId).unwrap(); rWinners(); } catch {}
  };

  const renderWinnerCard = useCallback(({ item }: { item: any }) => {
    const winnerName = (isAr && item.winnerNameAr) ? item.winnerNameAr : (item.winnerName || '');
    const nominatorName = (isAr && item.nominatedByNameAr) ? item.nominatedByNameAr : (item.nominatedByName || '');
    const avatarBg = paletteFor(item.winnerId ?? item.shortlistId);
    const hasLiked = !!item.hasLiked;

    return (
      <TouchableOpacity
        style={[styles.winnerCard, shadows.card, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() => navigation?.navigate?.('WinnerDetail', { shortlistId: item.shortlistId })}
      >
        <View style={styles.winnerTop}>
          <ProfileAvatar
            userId={item.winnerId}
            name={winnerName}
            size={48}
            borderRadius={14}
            backgroundColor={avatarBg}
            fontSize={18}
          />
          <View style={[styles.winnerInfo, { marginLeft: 12 }]}>
            <Text style={[styles.winnerName, { color: colors.text }]} numberOfLines={1}>
              {winnerName}
            </Text>
            <Text style={[styles.winnerTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.jobTitle || item.department}
            </Text>
            <Text style={[styles.winnerDept, { color: colors.textMuted }]} numberOfLines={1}>
              {item.sector}
            </Text>
          </View>
          <View style={[styles.periodBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.periodBadgeText, { color: colors.primary }]}>
              {(item.period ?? '').split(' ')[0]?.substring(0, 3)}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.winnerDesc, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {nominatorName ? (
          <Text style={[styles.nominatedBy, { color: colors.textMuted }]}>
            {t('scadStar.nominatedBy', 'Nominated by')} {nominatorName}
          </Text>
        ) : null}

        <View style={[styles.socialRow, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={[
              styles.socialBtn,
              hasLiked && { backgroundColor: '#FCE8E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
            ]}
            onPress={() => handleLike(item.shortlistId)}
            activeOpacity={0.6}
          >
            <Text style={styles.socialEmoji}>{hasLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.socialCount, { color: colors.danger }]}>
              {item.likesCount ?? 0}
            </Text>
          </TouchableOpacity>
          <View style={styles.socialBtn}>
            <Text style={styles.socialEmoji}>💬</Text>
            <Text style={[styles.socialCount, { color: colors.primary }]}>
              {item.commentsCount ?? 0}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {item.announcedDate}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, shadows, handleLike, isAr, navigation, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Period (month) dropdown — the month picker that lets users browse
          winners from any historical month. Replaces the old Winners/History
          tab split; monthly breakdown is shown inside the picker itself. */}
      <View style={styles.periodPickerRow}>
        <TouchableOpacity
          style={[styles.periodPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setPeriodPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.periodPickerIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.periodPickerLabel, { color: colors.textMuted }]}>
              {t('scadStar.period', 'Period')}
            </Text>
            <Text style={[styles.periodPickerValue, { color: colors.text }]} numberOfLines={1}>
              {selectedPeriodId
                ? (periods.find((p: any) => p.periodId === selectedPeriodId)?.periodName
                    ?? t('scadStar.filtered', 'Filtered'))
                : t('scadStar.latestMonth', 'Latest month')}
            </Text>
          </View>
          <Text style={[styles.periodPickerChevron, { color: colors.textMuted }]}>▾</Text>
        </TouchableOpacity>
        {selectedPeriodId ? (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.primarySoft }]}
            onPress={() => setSelectedPeriodId(undefined)}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearBtnText, { color: colors.primary }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={periodPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPeriodPickerOpen(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('scadStar.selectPeriod', 'Select period')}
              </Text>
              <TouchableOpacity onPress={() => setPeriodPickerOpen(false)}>
                <Text style={[styles.modalClose, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              <TouchableOpacity
                style={[
                  styles.periodOption, { borderBottomColor: colors.divider },
                  !selectedPeriodId && { backgroundColor: colors.primarySoft },
                ]}
                onPress={() => { setSelectedPeriodId(undefined); setPeriodPickerOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodOptionText, { color: !selectedPeriodId ? colors.primary : colors.text }]}>
                  {t('scadStar.latestMonth', 'Latest month')}
                </Text>
                {!selectedPeriodId ? <Text style={{ color: colors.primary }}>✓</Text> : null}
              </TouchableOpacity>
              {periods.map((p: any) => {
                const active = p.periodId === selectedPeriodId;
                return (
                  <TouchableOpacity
                    key={p.periodId}
                    style={[
                      styles.periodOption, { borderBottomColor: colors.divider },
                      active && { backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => { setSelectedPeriodId(p.periodId); setPeriodPickerOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.periodOptionText, { color: active ? colors.primary : colors.text }]}>
                        {p.periodName}
                      </Text>
                      <Text style={[styles.periodOptionSub, { color: colors.textMuted }]}>
                        {(p.winnerCount ?? 0)} {t('scadStar.winners', 'Winners')} ·{' '}
                        {(p.nominationCount ?? 0)} {t('scadStar.nominations', 'Nominations')}
                      </Text>
                    </View>
                    {active ? <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort bar */}
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{winners.length}</Text>
          <Text> {t('scadStar.winnersLower', 'winners')} · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(WINNER_SORTS.find((s) => s.key === winnerSort) ?? WINNER_SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <TouchableOpacity
          onPress={() => setSortOpen(true)} activeOpacity={0.7}
          style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sortBtnIcon, { color: colors.text }]}>⇅</Text>
        </TouchableOpacity>
      </View>
      <SortSheet<WinSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={WINNER_SORTS}
        activeKey={winnerSort}
        onPick={setWinnerSort}
        title={t('scadStar.sortWinners', 'Sort winners')}
        colors={colors}
        shadows={shadows}
      />

      {/* Winners list */}
      <QueryStates
        errorGateOnly
        loading={false}
        apiError={isWinnersError}
        error={winnersLoadError}
        isRefreshing={fWinners}
        onRetry={rWinners}
        style={{ flex: 1 }}
      >
      <FlatList
        data={winners}
        keyExtractor={(item, i) => String(item.shortlistId ?? item.nominationId ?? i)}
        renderItem={renderWinnerCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={fWinners} isLoading={lWinners} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {fWinners ? '' : t('scadStar.noWinners', 'No winners to display')}
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

  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },
  sortBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBtnIcon: { fontSize: 15, fontWeight: '900' },

  periodPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  periodPickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  periodPickerIcon: { fontSize: 18 },
  periodPickerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  periodPickerValue: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  periodPickerChevron: { fontSize: 14, fontWeight: '700' },
  clearBtn: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '700' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  modalSheet: { width: '100%', maxWidth: 440, borderRadius: 16, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalClose: { fontSize: 18, fontWeight: '700' },
  periodOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodOptionText: { fontSize: 14, fontWeight: '700' },
  periodOptionSub: { fontSize: 11, marginTop: 2 },

  list: { padding: 16, paddingBottom: 32 },

  winnerCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  winnerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  winnerInfo: { flex: 1 },
  winnerName: { fontSize: 16, fontWeight: '700', marginBottom: 1 },
  winnerTitle: { fontSize: 12, fontWeight: '500' },
  winnerDept: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  periodBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  periodBadgeText: { fontSize: 11, fontWeight: '800' },
  winnerDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  nominatedBy: { fontSize: 11, fontStyle: 'italic', marginBottom: 10 },
  socialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10,
  },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialEmoji: { fontSize: 16 },
  socialCount: { fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 11, marginLeft: 'auto' },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default RecognitionScreen;
