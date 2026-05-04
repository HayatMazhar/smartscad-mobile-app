/**
 * Government — soft: hero obeys Design → hero size; donut performance; compact quick access;
 * waiting for action; most-used services; leave + Star + latest news + Saahem (Design toggles).
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import ThemedRefreshControl from '../../../../shared/components/ThemedRefreshControl';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import { resolveWaitingItemRoute } from '../../utils/taskRouting';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { serviceCategoryIcon } from '../../../../app/theme/semanticIcons';
import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { QUICK_ACTIONS } from './homeScreenConstants';
import { accentChroma, accentChromaKey } from '../../../../app/theme/accentChroma';
import type { HomeScreenModel } from './useHomeScreenModel';
import PeopleSpotlightCard from './PeopleSpotlightCard';
import MostUsedServicesRail from './MostUsedServicesRail';
import { API_BASE_URL } from '../../../../store/baseApi';

/**
 * Web parity: legacy _HomeNews.cshtml uses the first active News_Photos row as
 * the cover image, served by Pages/GetNewsFile?NewPhotoID=... The mobile SP
 * exposes that id as `coverNewsPhotoId`; the API endpoint /portal/news/photos/
 * proxies the file via Windows impersonation.
 */
function resolveHomeNewsCoverUrl(item: any): string | undefined {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const photoId = item?.coverNewsPhotoId ?? item?.CoverNewsPhotoId;
  if (photoId != null && Number.isFinite(Number(photoId))) {
    return `${base}/portal/news/photos/${encodeURIComponent(String(photoId))}`;
  }
  const newsId = item?.id ?? item?.newsId;
  const hasCoverPath = !!String(item?.coverImageUrl ?? '').trim();
  if (newsId != null && hasCoverPath) {
    return `${base}/portal/news/${encodeURIComponent(String(newsId))}/cover`;
  }
  return undefined;
}

const QUICK_ALL = QUICK_ACTIONS.slice(0, 8);

const HomeGovSoftLayout: React.FC<{ m: HomeScreenModel }> = ({ m }) => {
  const {
    navigation, colors, shadows, fontFamily, fontScale, skin, user, homeSections: hs,
    homeHeroSize, isLargeHero, currentYear, perfYear, setPerfYear, heroName, heroRole,
    unreadNotifs, topServices, waitingItems,     news, totalDaysTaken, pendingRequests, hasUpcomingLeave,
    total, chartData, completionRate, completionPctColor, refreshing, onRefresh,
    winners, secTitleStyle,
    qaC, perfC, waitC, raiseC, leaveC, starC, portC, saahemC, smTop, secPad, saahemRows, saahemLoading, saahemPeriodLabel, saahemSubtitle,
    dateStr, timeStr, inTime, outTime, attStatus, greeting,
  } = m;

  const heroPad = homeHeroSize === 'large' ? 18 : homeHeroSize === 'medium' ? 15 : 12;
  const heroRadius = homeHeroSize === 'large' ? 20 : homeHeroSize === 'medium' ? 18 : 14;
  const nameSize = (homeHeroSize === 'large' ? 25 : homeHeroSize === 'medium' ? 21 : 18) * fontScale;
  const greetSize = homeHeroSize === 'large' ? 13 : homeHeroSize === 'medium' ? 12 : 11;
  const roleSize = homeHeroSize === 'large' ? 14 : homeHeroSize === 'medium' ? 13 : 12;
  const avatarSize = homeHeroSize === 'large' ? 52 : homeHeroSize === 'medium' ? 46 : 40;
  const bellSize = homeHeroSize === 'large' ? 22 : homeHeroSize === 'medium' ? 20 : 18;
  const bellFrame = homeHeroSize === 'large' ? 46 : homeHeroSize === 'medium' ? 42 : 38;
  const showHeroMeta = isLargeHero; /* date, time, attendance */

  const newsPreview = useMemo(() => news.slice(0, 3), [news]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ padding: 16, paddingTop: homeHeroSize === 'compact' ? 10 : 18 }}>
          <View
            style={[
              {
                backgroundColor: colors.card,
                borderRadius: heroRadius,
                padding: heroPad,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.borderLight,
                ...shadows.card,
              },
              { shadowOpacity: 0.06, elevation: 2 },
            ]}
          >
            {/** Top row: copy left, bell + avatar right — same vertical band for all sizes */}
            <View style={styles.heroMainRow}>
              <View style={styles.heroTextCol}>
                {greeting.kind === 'text' || greeting.kind === 'icon' ? (
                  <Text
                    style={[
                      styles.heroGreet,
                      {
                        color: colors.textSecondary,
                        fontSize: greetSize,
                        fontWeight: '500',
                        fontFamily,
                        marginBottom: homeHeroSize === 'compact' ? 2 : 4,
                        letterSpacing: 0.2,
                      },
                    ]}
                  >
                    {greeting.text}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.heroGreet,
                      {
                        color: colors.textSecondary,
                        fontSize: greetSize,
                        fontWeight: '500',
                        fontFamily,
                        marginBottom: homeHeroSize === 'compact' ? 2 : 4,
                      },
                    ]}
                  >
                    {greeting.emoji} {greeting.text}
                  </Text>
                )}
                <Text
                  style={[
                    styles.heroName,
                    {
                      color: colors.text,
                      fontSize: nameSize,
                      fontFamily,
                      lineHeight: nameSize * 1.15,
                      marginBottom: homeHeroSize === 'compact' ? 2 : 4,
                    },
                  ]}
                  numberOfLines={homeHeroSize === 'compact' ? 1 : 2}
                >
                  {heroName}
                </Text>
                <Text
                  style={[
                    styles.heroRole,
                    {
                      color: colors.textSecondary,
                      fontSize: roleSize,
                      fontFamily,
                      fontWeight: '600',
                      lineHeight: roleSize * 1.25,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {heroRole}
                </Text>
              </View>
              <View
                style={[
                  styles.heroActions,
                  { gap: homeHeroSize === 'compact' ? 8 : 10 },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.heroBell,
                    {
                      width: bellFrame,
                      height: bellFrame,
                      borderRadius: bellFrame / 2,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}
                  activeOpacity={0.75}
                  accessibilityLabel="Notifications"
                >
                  <ThemedIcon name="bell" size={bellSize} color={colors.primary} />
                  {unreadNotifs.length > 0 ? (
                    <View style={[styles.dot, { backgroundColor: colors.danger, borderColor: colors.card, borderWidth: 2 }]} />
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('More', { screen: 'Profile' })}
                  activeOpacity={0.75}
                  accessibilityLabel="Profile"
                >
                  <ProfileAvatar
                    userId={user?.userId}
                    name={heroName}
                    size={avatarSize}
                    borderRadius={homeHeroSize === 'compact' ? 12 : homeHeroSize === 'medium' ? 14 : 16}
                    backgroundColor={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {showHeroMeta ? (
              <View style={[styles.heroMeta, { borderTopColor: colors.divider }]}>
                <View style={styles.hDate}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>{dateStr}</Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15 }}>{timeStr}</Text>
                </View>
                <View style={styles.hAtt}>
                  <View style={styles.ac}>
                    <Text style={[styles.al, { color: colors.textSecondary }]}>In</Text>
                    <Text style={{ color: inTime ? colors.success : colors.text, fontWeight: '800', fontSize: 13 }}>{inTime ?? '—'}</Text>
                  </View>
                  <View style={styles.ac}>
                    <Text style={[styles.al, { color: colors.textSecondary }]}>Out</Text>
                    <Text style={{ color: outTime ? colors.danger : colors.text, fontWeight: '800', fontSize: 13 }}>{outTime ?? '—'}</Text>
                  </View>
                  <View style={styles.ac}>
                    <Text style={[styles.al, { color: colors.textSecondary }]}>St</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {attStatus || '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {hs.quickAccess.visible ? (
          <View style={{ marginTop: smTop(qaC) }}>
            <Text style={[secTitleStyle, { paddingHorizontal: 16 }]}>Quick access</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}
            >
              {QUICK_ALL.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={[
                    styles.qaItem,
                    {
                      width: qaC ? 64 : 72,
                      paddingVertical: qaC ? 6 : 8,
                      paddingHorizontal: 4,
                      backgroundColor: colors.card,
                      borderRadius: skin.cardRadius,
                      borderWidth: skin.cardBorderWidth,
                      borderColor: colors.border,
                      ...shadows.card,
                    },
                  ]}
                  onPress={() => navigation.navigate(a.screen, (a as any).params)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.qaIconWrap,
                      { backgroundColor: colors.primaryLight, borderRadius: qaC ? 8 : 10 },
                    ]}
                  >
                    <ThemedIcon name={a.name} size={qaC ? 16 : 18} color={colors.primary} />
                  </View>
                  <Text
                    style={{
                      marginTop: 4,
                      textAlign: 'center',
                      color: colors.text,
                      fontWeight: '600',
                      fontSize: qaC ? 9 : 10,
                    }}
                    numberOfLines={1}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {hs.performance.visible ? (
          <View style={{ paddingHorizontal: 16, marginTop: smTop(perfC) }}>
            <View style={styles.perfHeader}>
              <Text style={secTitleStyle}>Performance</Text>
              <View style={styles.yearPills}>
                {[currentYear, currentYear - 1].map((yr) => {
                  const active = perfYear === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.yearPill,
                        { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border },
                      ]}
                      onPress={() => setPerfYear(yr)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.yearPillText, { color: active ? '#fff' : colors.textMuted }]}>{yr}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View
              style={[
                { backgroundColor: colors.card, borderRadius: skin.cardRadius, padding: perfC ? 12 : 16, marginTop: 8, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
                shadows.card,
              ]}
            >
              <View style={[styles.perfRow, perfC && { gap: 12 }]}>
                <View style={styles.donutWrap}>
                  <View
                    style={[
                      styles.donutOuter,
                      { borderColor: colors.greyCard },
                      perfC && { width: 80, height: 80, borderRadius: 40, borderWidth: 6 },
                    ]}
                  >
                    {chartData.map((d, i) => {
                      const startAngle = chartData.slice(0, i).reduce((s, c) => s + (total > 0 ? (c.val / total) * 360 : 0), 0);
                      const sweepAngle = total > 0 ? (d.val / total) * 360 : 0;
                      return sweepAngle > 0 ? (
                        <View
                          key={d.label}
                          style={[
                            styles.donutSegment,
                            {
                              borderColor: d.color,
                              borderTopColor: 'transparent',
                              transform: [{ rotate: `${startAngle + sweepAngle / 2}deg` }],
                              opacity: 0.9,
                            },
                            perfC && { borderWidth: 6 },
                          ]}
                        />
                      ) : null;
                    })}
                    <View
                      style={[
                        styles.donutInner,
                        { backgroundColor: colors.card },
                        perfC && { width: 60, height: 60, borderRadius: 30 },
                      ]}
                    >
                      {/*
                        Single line only — section title already says "Performance"; two lines overlapped in 72px inner ring.
                      */}
                      <Text
                        style={[
                          styles.donutPct,
                          { color: completionPctColor },
                          perfC ? { fontSize: 16, lineHeight: 20 } : { fontSize: 18, lineHeight: 22 },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {completionRate}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.perfStats}>
                  {chartData.map((d) => (
                    <View key={d.label} style={[styles.perfStatRow, perfC && { marginBottom: 4 }]}>
                      <View style={[styles.perfDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.perfStatLabel, { color: colors.textSecondary, fontSize: perfC ? 12 : 13 }]}>{d.label}</Text>
                      <Text style={[styles.perfStatVal, { color: colors.text, fontSize: perfC ? 14 : 16 }]}>{d.val}</Text>
                    </View>
                  ))}
                  <View style={[styles.perfTotalRow, { borderTopColor: colors.divider }]}>
                    <Text style={[styles.perfTotalLabel, { color: colors.text, fontSize: perfC ? 12 : 14 }]}>Total</Text>
                    <Text style={[styles.perfTotalVal, { color: colors.primary, fontSize: perfC ? 16 : 18 }]}>{total}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {hs.waitingForAction.visible && waitingItems.length > 0 ? (
          <View style={{ paddingHorizontal: 16, marginTop: smTop(waitC) }}>
            <View style={styles.sectionHeader}>
              <Text style={secTitleStyle}>Waiting for my action</Text>
              <View style={[styles.waitCountBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.waitCountText}>{waitingItems.length}</Text>
              </View>
            </View>
            {waitingItems.slice(0, 3).map((item: any, i: number) => {
              const route = resolveWaitingItemRoute(item);
              const isT = route.screen === 'TicketDetail';
              const isL = route.screen === 'LeaveDetail' || route.screen === 'LeaveHistory';
              const ico: SemanticIconName = isT ? 'waitTicket' : isL ? 'waitLeave' : 'waitTask';
              const badgeBg = isT ? `${colors.primary}18` : isL ? `${colors.info}18` : `${colors.warning}18`;
              return (
                <TouchableOpacity
                  key={String(item.id ?? i)}
                  onPress={() => navigation.navigate(route.stack as never, { screen: route.screen, params: route.params } as never)}
                  style={[
                    { backgroundColor: colors.card, borderRadius: skin.cardRadius, padding: waitC ? 10 : 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: skin.cardBorderWidth, borderColor: colors.border },
                    shadows.card,
                  ]}
                >
                  <View style={[styles.waitModBadge, { backgroundColor: badgeBg }, waitC && { width: 28, height: 28 }]}>
                    <ThemedIcon name={ico} size={waitC ? 14 : 18} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: waitC ? 12 : 13 }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>{item.moduleName}</Text>
                      {item.status ? (
                        <Text style={{ color: String(item.status).includes('Overdue') ? colors.danger : colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                          {item.status}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              );
            })}
            {waitingItems.length > 3 ? (
              <TouchableOpacity onPress={() => navigation.navigate('Approvals' as never)} style={{ alignItems: 'center', paddingVertical: 8 }} activeOpacity={0.7}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View all {waitingItems.length} items →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {hs.raiseRequest.visible && topServices.length > 0 ? (
          <View style={{ marginTop: smTop(raiseC) }}>
            <MostUsedServicesRail
              services={topServices}
              limit={8}
              navigation={navigation as any}
              colors={colors}
              skin={skin}
              fontFamily={fontFamily}
              title="Most used services"
              allLabel="All services →"
            />
          </View>
        ) : null}

        {hs.leaveSummary.visible ? (
          <View style={{ marginTop: smTop(leaveC), marginHorizontal: 16 }}>
            <Text style={secTitleStyle}>Leave summary</Text>
            <View
              style={[
                { backgroundColor: colors.card, borderRadius: skin.cardRadius, padding: secPad(leaveC), borderWidth: skin.cardBorderWidth, borderColor: colors.border },
                shadows.card,
              ]}
            >
              <View style={styles.leaveRow}>
                {(
                  [
                    { name: 'calendar' as const, val: totalDaysTaken, label: 'Days taken', color: colors.text },
                    { name: 'hourglass' as const, val: pendingRequests, label: 'Pending', color: colors.warning },
                    { name: 'airplane' as const, val: hasUpcomingLeave ? 'Yes' : 'None', label: 'Upcoming', color: colors.primary },
                  ] as const
                ).map((s) => (
                  <View key={s.label} style={styles.leaveStat}>
                    <ThemedIcon name={s.name} size={leaveC ? 18 : 22} color={s.color} />
                    <Text style={[styles.leaveNum, { color: s.color, fontSize: leaveC ? 20 : 24 }]}>{s.val}</Text>
                    <Text style={[styles.leaveLabel, { color: colors.textMuted, fontSize: leaveC ? 9 : 10 }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.leaveBtn, { backgroundColor: colors.primarySoft }, leaveC && { paddingVertical: 10, marginTop: 8 }]}
                onPress={() => navigation.navigate('More', { screen: 'LeaveRequest' })}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: leaveC ? 13 : 14 }}>+ Request leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {hs.scadStar.visible || hs.saahemLeaderboard.visible ? (
          <View style={{ marginTop: smTop(saahemC || starC) }}>
            <PeopleSpotlightCard
              compact={saahemC || starC}
              contributors={saahemRows}
              contributorsLoading={saahemLoading}
              contributorsSubtitle={saahemSubtitle}
              contributorsEmptyHint={saahemPeriodLabel ? `No leaders for ${saahemPeriodLabel} yet.` : undefined}
              winners={winners}
              winnersAvailable={hs.scadStar.visible}
              contributorsAvailable={hs.saahemLeaderboard.visible}
              navigation={navigation as any}
              secTitleStyle={secTitleStyle}
            />
          </View>
        ) : null}

        {hs.portal.visible && news.length > 0 ? (
          <View style={{ marginTop: smTop(portC), paddingHorizontal: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={secTitleStyle}>Latest news</Text>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'News' })} activeOpacity={0.7}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View all →</Text>
              </TouchableOpacity>
            </View>
            {newsPreview.map((n: any, ni: number) => {
              const cat = n.category ?? 'News';
              const strip = accentChromaKey(colors, skin, String(cat));
              const coverUrl = resolveHomeNewsCoverUrl(n);
              const bannerH = portC ? 130 : 150;
              return (
                <TouchableOpacity
                  key={String(n.id ?? n.newsId ?? ni)}
                  onPress={() => navigation.navigate('More', { screen: 'NewsDetail', params: { newsId: n.id ?? n.newsId } })}
                  style={[
                    { marginBottom: 12, backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: skin.cardBorderWidth, borderColor: colors.border },
                    shadows.card,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={{ height: bannerH, backgroundColor: strip, position: 'relative' }}>
                    {coverUrl ? (
                      <Image
                        source={{ uri: coverUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedIcon name="tabNews" size={36} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>{cat}</Text>
                    </View>
                  </View>
                  <View style={{ padding: portC ? 12 : 14 }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: portC ? 14 : 15, lineHeight: 20 }} numberOfLines={2}>
                      {n.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>{n.publishedDate ?? n.date}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  heroMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTextCol: { flex: 1, minWidth: 0, paddingRight: 8 },
  heroGreet: {},
  heroName: { fontWeight: '800' },
  heroRole: {},
  heroActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  heroBell: { alignItems: 'center', justifyContent: 'center' },
  heroMeta: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  qaItem: { alignItems: 'center', elevation: 1 },
  qaIconWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 5 },
  hDate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hAtt: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' },
  ac: { flex: 1, alignItems: 'center' },
  al: { fontSize: 10, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  yearPills: { flexDirection: 'row', gap: 6 },
  yearPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  yearPillText: { fontSize: 11, fontWeight: '700' },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutWrap: { alignItems: 'center' },
  donutOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  donutSegment: { position: 'absolute', width: '100%', height: '100%', borderRadius: 50, borderWidth: 8 },
  donutInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  donutPct: { fontWeight: '900', textAlign: 'center' },
  perfStats: { flex: 1 },
  perfStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  perfDot: { width: 10, height: 10, borderRadius: 5 },
  perfStatLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  perfStatVal: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  perfTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4 },
  perfTotalLabel: { fontSize: 14, fontWeight: '700' },
  perfTotalVal: { fontSize: 18, fontWeight: '900' },
  waitCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  waitCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  waitModBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  leaveRow: { flexDirection: 'row', alignItems: 'center' },
  leaveStat: { flex: 1, alignItems: 'center', gap: 4 },
  leaveNum: { fontSize: 24, fontWeight: '900' },
  leaveLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  leaveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
});

export default HomeGovSoftLayout;
