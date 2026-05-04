import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import ThemedActivityIndicator from '../../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../app/theme/ThemeContext';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { accentChroma } from '../../../../app/theme/accentChroma';

/** Unified spotlight block: SCAD Star winners ↔ Saahem contributors with a tab switch. */
type TabKey = 'contributors' | 'winners';

type Nav = {
  navigate: (
    stack: 'More',
    params:
      | { screen: 'Recognition' }
      | { screen: 'WinnerDetail'; params: { shortlistId: number } }
  ) => void;
};

type Props = {
  compact?: boolean;
  contributors: any[];
  contributorsLoading: boolean;
  contributorsSubtitle: string;
  contributorsEmptyHint?: string;
  winners: any[];
  winnersAvailable: boolean;
  contributorsAvailable: boolean;
  navigation: Nav;
  secTitleStyle: any[];
};

function pickName(row: any, isAr: boolean): string {
  if (!row) return '';
  if (isAr) {
    const ar = row.arabicName ?? row.ArabicName ?? row.nameAr;
    if (ar != null && String(ar).trim() !== '') return String(ar);
  }
  return String(row.englishName ?? row.EnglishName ?? row.name ?? row.winnerName ?? '—');
}

function contribCount(row: any): string {
  const v = row?.totalContributions ?? row?.TotalContributions ?? row?.contributions;
  if (v == null) return '—';
  return String(v);
}

function pickContribUserId(row: any): string | undefined {
  const u = row?.employeeUsername ?? row?.EmployeeUsername ?? row?.userId ?? row?.UserId;
  return u == null || u === '' ? undefined : String(u);
}

function pickPlace(row: any, index: number): string {
  const p = row?.place ?? row?.Place ?? row?.srNo ?? row?.SrNo;
  if (p != null && String(p).trim() !== '') return String(p);
  return String(index + 1);
}

const PeopleSpotlightCard: React.FC<Props> = ({
  compact = false,
  contributors,
  contributorsLoading,
  contributorsEmptyHint,
  winners,
  winnersAvailable,
  contributorsAvailable,
  navigation,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin, fontFamily } = useTheme();
  const isAr = (i18n.language ?? 'en').toLowerCase().startsWith('ar');

  const tabs = useMemo<TabKey[]>(() => {
    const list: TabKey[] = [];
    if (contributorsAvailable) list.push('contributors');
    if (winnersAvailable) list.push('winners');
    return list;
  }, [contributorsAvailable, winnersAvailable]);

  const [active, setActive] = useState<TabKey>(tabs[0] ?? 'contributors');
  useEffect(() => {
    if (!tabs.includes(active) && tabs.length > 0) setActive(tabs[0]);
  }, [tabs, active]);

  if (tabs.length === 0) return null;

  // Compact user-card dimensions — header is intentionally hidden so the
  // cards themselves carry the visual weight. Each card is fully tappable
  // (Winner cards open the winner detail; Contributor cards trigger the
  // same Recognition view-all on press) so a section header is redundant.
  const cardW = compact ? 84 : 92;
  const avatarS = compact ? 36 : 40;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: skin.cardBorderWidth,
            borderRadius: skin.cardRadius,
            padding: compact ? 10 : 12,
          },
          shadows.card,
        ]}
      >
        {tabs.length > 1 ? (
          <View
            style={[
              styles.tabBar,
              { borderColor: colors.border, backgroundColor: colors.background, borderRadius: 999 },
            ]}
          >
            {tabs.map((k) => {
              const isActive = k === active;
              return (
                <Pressable
                  key={k}
                  onPress={() => setActive(k)}
                  style={({ pressed }) => [
                    styles.tabPill,
                    isActive && { backgroundColor: colors.primary },
                    pressed && !isActive && { opacity: 0.65 },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: isActive ? '#fff' : colors.text,
                      fontSize: 11.5,
                      fontWeight: '700',
                      letterSpacing: 0.1,
                    }}
                  >
                    {k === 'contributors'
                      ? t('home.spotlightTabContributors', 'Saahem leaderboard')
                      : t('home.spotlightTabWinners', 'Star award winners')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Body */}
        {active === 'contributors' ? (
          <ContributorsList
            rows={contributors}
            loading={contributorsLoading}
            emptyHint={
              contributorsEmptyHint ?? t('home.saahemNoData', 'No recent contributors yet.')
            }
            cardW={cardW}
            avatarS={avatarS}
            isAr={isAr}
            colors={colors}
            skin={skin}
            shadows={shadows}
            fontFamily={fontFamily}
            navigation={navigation}
            t={t}
          />
        ) : (
          <WinnersList
            rows={winners}
            cardW={cardW}
            avatarS={avatarS}
            colors={colors}
            skin={skin}
            shadows={shadows}
            fontFamily={fontFamily}
            navigation={navigation}
            t={t}
          />
        )}
      </View>
    </View>
  );
};

const ContributorsList: React.FC<{
  rows: any[];
  loading: boolean;
  emptyHint: string;
  cardW: number;
  avatarS: number;
  isAr: boolean;
  colors: any;
  skin: any;
  shadows: any;
  fontFamily?: string;
  navigation: Nav;
  t: any;
}> = ({ rows, loading, emptyHint, cardW, avatarS, isAr, colors, skin, fontFamily, navigation, t }) => {
  const leaders = useMemo(() => (Array.isArray(rows) ? rows.slice(0, 5) : []), [rows]);

  if (loading && leaders.length === 0) {
    return (
      <View style={[styles.statePad]}>
        <ThemedActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (leaders.length === 0) {
    return (
      <View style={[styles.statePad]}>
        <Text style={{ color: colors.textMuted, fontSize: 12.5, textAlign: 'center', fontFamily }}>{emptyHint}</Text>
      </View>
    );
  }

  const goAll = () => navigation.navigate('More', { screen: 'Recognition' });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingTop: 2, paddingBottom: 2 }}
    >
      {leaders.map((row, i) => {
        const name = pickName(row, isAr);
        const uid = pickContribUserId(row);
        const place = pickPlace(row, i);
        return (
          <TouchableOpacity
            key={`${place}-${name}-${String(uid ?? i)}`}
            activeOpacity={0.75}
            onPress={goAll}
            style={[
              styles.cell,
              {
                width: cardW,
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: skin.cardBorderWidth,
                borderRadius: skin.cardRadius,
              },
            ]}
          >
            {/* Rank ribbon is anchored at the top-right of the CARD (not the
                avatar) so it never overlaps the employee photo. Sits half-out
                of the card to read as a corner ribbon while still being fully
                visible. */}
            <View
              style={[
                styles.cardRankChip,
                { backgroundColor: colors.primary, borderColor: colors.card },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.cardRankChipText}>{place}</Text>
            </View>
            <View style={styles.avatarHolder}>
              <ProfileAvatar
                userId={uid}
                name={name}
                size={avatarS}
                borderRadius={Math.round(avatarS / 2)}
                backgroundColor={colors.primaryLight}
                fontSize={Math.round(avatarS * 0.36)}
              />
            </View>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
                marginTop: 6,
                fontFamily,
              }}
              numberOfLines={2}
            >
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const WinnersList: React.FC<{
  rows: any[];
  cardW: number;
  avatarS: number;
  colors: any;
  skin: any;
  shadows: any;
  fontFamily?: string;
  navigation: Nav;
  t: any;
}> = ({ rows, cardW, avatarS, colors, skin, fontFamily, navigation, t }) => {
  const list = useMemo(() => (Array.isArray(rows) ? rows.slice(0, 6) : []), [rows]);

  if (list.length === 0) {
    return (
      <View style={[styles.statePad]}>
        <Text style={{ color: colors.textMuted, fontSize: 12.5, textAlign: 'center', fontFamily }}>
          {t('home.scadStarEmpty', 'No winners to display yet.')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingTop: 4, paddingBottom: 2 }}
    >
      {list.map((w: any, i: number) => {
        const accent = accentChroma(colors, skin, i);
        return (
          <TouchableOpacity
            key={String(w.shortlistId ?? i)}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate('More', {
                screen: 'WinnerDetail',
                params: { shortlistId: Number(w.shortlistId) },
              })
            }
            style={[
              styles.cell,
              {
                width: cardW,
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: skin.cardBorderWidth,
                borderRadius: skin.cardRadius,
              },
            ]}
          >
            <View style={styles.avatarHolder}>
              <ProfileAvatar
                userId={w.winnerId}
                name={w.winnerName}
                size={avatarS}
                borderRadius={Math.round(avatarS / 2)}
                backgroundColor={accent}
                fontSize={Math.round(avatarS * 0.36)}
              />
              <View
                style={[
                  styles.placeChip,
                  { backgroundColor: '#F5A524', borderColor: '#fff', paddingHorizontal: 4 },
                ]}
              >
                <ThemedIcon name="qaStar" size={10} color="#fff" />
              </View>
            </View>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
                marginTop: 8,
                fontFamily,
              }}
              numberOfLines={2}
            >
              {w.winnerName}
            </Text>
            {w.departmentName || w.department ? (
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 4,
                  fontFamily,
                }}
                numberOfLines={1}
              >
                {w.departmentName ?? w.department}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  shell: {},
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  hint: { marginTop: 2, lineHeight: 15 },
  tabBar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    padding: 3,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  avatarHolder: { position: 'relative' },
  // Star/winner badge — kept at top-right of the avatar (small icon, no overlap
  // concern because it's a glyph not text and sits right on the avatar edge).
  placeChip: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeChipText: { color: '#fff', fontSize: 9.5, fontWeight: '800' },
  // Saahem rank ribbon — anchored to the inside top-right corner of the card.
  // Kept *inside* the card bounds (not negative offsets) because the cards live
  // in a horizontal ScrollView and Android clips children that overflow.
  cardRankChip: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardRankChipText: { color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  statePad: { minHeight: 90, padding: 10, alignItems: 'center', justifyContent: 'center' },
});

export default PeopleSpotlightCard;
