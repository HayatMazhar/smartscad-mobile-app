import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedRefreshControl from '../../../../shared/components/ThemedRefreshControl';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import { resolveWaitingItemRoute } from '../../utils/taskRouting';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { serviceCategoryIcon } from '../../../../app/theme/semanticIcons';
import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { getInitials, QUICK_ACTIONS, PORTAL_TABS } from './homeScreenConstants';
import { accentChroma } from '../../../../app/theme/accentChroma';
import type { HomeScreenModel } from './useHomeScreenModel';
import MostUsedServicesRail from './MostUsedServicesRail';
import { API_BASE_URL } from '../../../../store/baseApi';
import { formatTimeString } from '../../../../shared/utils/dateUtils';

/**
 * Web parity (legacy News.cshtml / _HomeNews.cshtml): card cover = first
 * active News_Photos.NewsPhotoID streamed via /portal/news/photos/{id}.
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

/**
 * Original SCAD home: hero with accents, grid quick actions, donut performance, carousels.
 * Used only for the default "SCAD (vibrant)" color story.
 */
const HomeScadClassicLayout: React.FC<{ m: HomeScreenModel }> = ({ m }) => {
  const {
    navigation,
    colors,
    shadows,
    fontFamily,
    fontScale,
    skin,
    user,
    homeSections: hs,
    isLargeHero,
    heroL,
    currentYear,
    perfYear,
    setPerfYear,
    qaCardWidth,
    heroName,
    heroRole,
    unreadNotifs,
    topServices,
    waitingItems,
    news,
    announcements,
    events,
    offers,
    videos,
    winners,
    totalDaysTaken,
    pendingRequests,
    hasUpcomingLeave,
    total,
    chartData,
    completionRate,
    completionPctColor,
    refreshing,
    onRefresh,
    portalTab,
    setPortalTab,
    greeting,
    dateStr,
    timeStr,
    inTime,
    outTime,
    attStatus,
    qaC,
    perfC,
    waitC,
    raiseC,
    leaveC,
    starC,
    portC,
    smTop,
    secPad,
    secTitleStyle,
  } = m;

  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const heroPaddingTopOverride = isIOS ? { paddingTop: insets.top + 8 } : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.homeStatusBar} backgroundColor={colors.homeHeroBackground} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Hero ───────────────────────────────────── */}
        <View style={[styles.hero, heroL.hero, { backgroundColor: colors.homeHeroBackground }, heroPaddingTopOverride]}>
          <View style={[heroL.accent1, { backgroundColor: colors.homeDecor1 }]} />
          <View style={[heroL.accent2, { backgroundColor: colors.homeDecor2 }]} />
          <View style={[styles.heroTop, heroL.heroTop]}>
            <View style={styles.heroTextBlock}>
              {greeting.kind === 'emoji' ? (
                <Text style={[styles.heroGreeting, heroL.greeting, { color: colors.homeHeroTextMuted, fontFamily }]} numberOfLines={1}>
                  {greeting.emoji} {greeting.text}
                </Text>
              ) : greeting.kind === 'text' ? (
                <Text style={[styles.heroGreeting, heroL.greeting, { color: colors.homeHeroTextMuted, fontFamily }]} numberOfLines={1}>
                  {greeting.text}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <ThemedIcon name={greeting.icon} size={16} color={colors.homeHeroTextMuted} />
                  <Text style={[styles.heroGreeting, heroL.greeting, { color: colors.homeHeroTextMuted, fontFamily, flex: 1 }]} numberOfLines={1}>
                    {greeting.text}
                  </Text>
                </View>
              )}
              <Text style={[styles.heroName, heroL.name, { color: colors.homeHeroText, fontFamily }]} numberOfLines={1}>
                {heroName}
              </Text>
              <Text style={[styles.heroRole, heroL.role, { color: colors.homeHeroTextMuted, fontFamily }]} numberOfLines={1}>
                {heroRole}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <TouchableOpacity
                style={[styles.heroBell, heroL.bell, { backgroundColor: colors.homeHeroSubtle }]}
                onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}
                activeOpacity={0.7}
              >
                <ThemedIcon name="bell" size={20} color={colors.homeHeroText} />
                {unreadNotifs.length > 0 && (
                  <View style={[styles.bellBadge, heroL.bellBadge, { borderColor: colors.homeHeroBackground, backgroundColor: colors.danger }]}>
                    <Text style={[styles.bellBadgeText, heroL.bellBadgeText, { color: '#fff' }]}>{unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Profile' })} activeOpacity={0.8}>
                <ProfileAvatar userId={user?.userId} name={heroName} size={heroL.avatarSize} borderRadius={heroL.avatarRadius} backgroundColor={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {isLargeHero ? (
            <>
              <View style={styles.dateTimeRow}>
                <View style={[styles.dateChip, { backgroundColor: colors.homeHeroSubtle, borderWidth: 1, borderColor: colors.homeHeroBorder }]}>
                  <Text style={[styles.dateChipText, { color: colors.homeHeroTextMuted, fontFamily }]} numberOfLines={1}>
                    {dateStr}
                  </Text>
                </View>
                <Text style={[styles.timeText, { color: colors.primary, fontFamily }]} numberOfLines={1}>
                  {timeStr}
                </Text>
              </View>
              <View style={[styles.attCard, { backgroundColor: colors.homeHeroSubtle, borderColor: colors.homeHeroBorder }]}>
                <View style={styles.attCardInner}>
                  <View style={styles.attBlock}>
                    <Text style={[styles.attLabel, { color: colors.homeHeroTextMuted, fontFamily }]}>Check In</Text>
                    <Text
                      style={[styles.attVal, { color: inTime ? colors.success : colors.homeHeroText, fontFamily }]}
                      numberOfLines={1}
                    >
                      {inTime ?? '--:--'}
                    </Text>
                  </View>
                  <View style={[styles.attDivider, { backgroundColor: colors.homeHeroBorder }]} />
                  <View style={styles.attBlock}>
                    <Text style={[styles.attLabel, { color: colors.homeHeroTextMuted, fontFamily }]}>Check Out</Text>
                    <Text
                      style={[styles.attVal, { color: outTime ? colors.danger : colors.homeHeroText, fontFamily }]}
                      numberOfLines={1}
                    >
                      {outTime ?? '--:--'}
                    </Text>
                  </View>
                  <View style={[styles.attDivider, { backgroundColor: colors.homeHeroBorder }]} />
                  <View style={styles.attBlock}>
                    <Text style={[styles.attLabel, { color: colors.homeHeroTextMuted, fontFamily }]}>Status</Text>
                    <Text
                      style={[
                        styles.attStatusText,
                        {
                          color: attStatus.toLowerCase().includes('present') ? colors.success : colors.warning,
                          fontFamily,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {attStatus || '--'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Quick Actions ──────────────────────────── */}
        {/* All 8 actions in a single horizontal scroller — phones can't fit 8 in a grid row */}
        {hs.quickAccess.visible ? (
        <View style={{ marginTop: smTop(qaC) }}>
          <Text style={[secTitleStyle, { paddingHorizontal: 16 }]}>Quick access</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10 }}
          >
            {QUICK_ACTIONS.map((a) => {
              const prof = skin.quickAccessStyle === 'professional';
              return (
                <TouchableOpacity
                  key={a.label}
                  style={[
                    styles.actionCard,
                    shadows.card,
                    {
                      backgroundColor: colors.card,
                      width: qaC ? 76 : 86,
                      borderRadius: skin.cardRadius,
                      borderWidth: prof ? StyleSheet.hairlineWidth : 0,
                      borderColor: colors.border,
                    },
                    qaC && { paddingVertical: 8, paddingHorizontal: 4 },
                  ]}
                  onPress={() => navigation.navigate(a.screen, (a as any).params)} activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconWrap,
                      prof
                        ? {
                            backgroundColor: colors.primaryLight,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: skin.cardRadius - 2,
                          }
                        : { backgroundColor: a.bg, borderRadius: 12 },
                      qaC && { width: 36, height: 36, borderRadius: 10 },
                    ]}
                  >
                    <ThemedIcon
                      name={a.name}
                      size={qaC ? 18 : 20}
                      color={prof ? colors.primary : a.color}
                    />
                  </View>
                  <Text
                    style={[styles.actionLabel, { color: colors.text, fontSize: qaC ? 10 : 11, fontFamily }]}
                    numberOfLines={1}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        ) : null}

        {/* ── Performance Overview ────────────────────── */}
        {hs.performance.visible ? (
        <View style={[styles.section, { marginTop: smTop(perfC) }]}>
          <View style={styles.perfHeader}>
            <Text style={secTitleStyle}>Performance</Text>
            <View style={styles.yearPills}>
              {[currentYear, currentYear - 1].map((yr) => {
                const active = perfYear === yr;
                return (
                  <TouchableOpacity key={yr}
                    style={[styles.yearPill, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}
                    onPress={() => setPerfYear(yr)} activeOpacity={0.7}>
                    <Text style={[styles.yearPillText, { color: active ? '#fff' : colors.textMuted }]}>{yr}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.perfCard, shadows.card, { backgroundColor: colors.card, padding: perfC ? 12 : 16, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border }]}>
            <View style={[styles.perfRow, perfC && { gap: 12 }]}>
              {/* Donut chart */}
              <View style={styles.donutWrap}>
                <View style={[styles.donutOuter, { borderColor: colors.greyCard },
                  perfC && { width: 80, height: 80, borderRadius: 40, borderWidth: 6 },
                ]}>
                  {chartData.map((d, i) => {
                    const startAngle = chartData.slice(0, i).reduce((s, c) => s + (total > 0 ? (c.val / total) * 360 : 0), 0);
                    const sweepAngle = total > 0 ? (d.val / total) * 360 : 0;
                    return sweepAngle > 0 ? (
                      <View key={d.label} style={[styles.donutSegment, {
                        borderColor: d.color, borderTopColor: 'transparent',
                        transform: [{ rotate: `${startAngle + sweepAngle / 2}deg` }],
                        opacity: 0.9,
                      },
                      perfC && { borderWidth: 6 },
                      ]} />
                    ) : null;
                  })}
                  <View style={[styles.donutInner, { backgroundColor: colors.card },
                    perfC && { width: 58, height: 58, borderRadius: 29 },
                  ]}>
                    <Text style={[styles.donutPct, { color: completionPctColor },
                      perfC && { fontSize: 16 },
                    ]}>{completionRate}%</Text>
                    <Text style={[styles.donutLabel, { color: colors.textMuted }]}>Performance</Text>
                  </View>
                </View>
              </View>
              {/* Stats */}
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

        {/* ── Waiting For My Action ─────────────────── */}
        {hs.waitingForAction.visible && waitingItems.length > 0 && (
          <View style={[styles.section, { marginTop: smTop(waitC) }]}>
            <View style={styles.sectionHeader}>
              <Text style={secTitleStyle}>Waiting for my action</Text>
              <View style={[styles.waitCountBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.waitCountText}>{waitingItems.length}</Text>
              </View>
            </View>
            {waitingItems.slice(0, 3).map((item: any, i: number) => {
              const route = resolveWaitingItemRoute(item);
              const isTicket = route.screen === 'TicketDetail';
              const isLeave  = route.screen === 'LeaveDetail' || route.screen === 'LeaveHistory';
              const badgeBg  = isTicket ? '#29A7DE20' : isLeave ? '#428bca20' : '#E67E2220';
              const badgeIcon: SemanticIconName = isTicket ? 'waitTicket' : isLeave ? 'waitLeave' : 'waitTask';
              return (
              <TouchableOpacity key={item.id ?? i}
                style={[styles.waitCard, shadows.card, { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border }, waitC && { padding: 8, marginBottom: 4 }]}
                onPress={() => {
                  navigation.navigate(route.stack as never, { screen: route.screen, params: route.params } as never);
                }} activeOpacity={0.7}>
                <View style={[styles.waitModBadge, { backgroundColor: badgeBg }, waitC && { width: 28, height: 28 }]}>
                  <ThemedIcon name={badgeIcon} size={waitC ? 14 : 16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waitTitle, { color: colors.text, fontSize: waitC ? 12 : 13 }]} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.waitMeta}>
                    <Text style={[styles.waitModule, { color: colors.primary }]}>{item.moduleName}</Text>
                    <Text style={[styles.waitStatus, { color: item.status?.includes('Overdue') ? colors.danger : colors.textMuted }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>›</Text>
              </TouchableOpacity>
              );
            })}
            {waitingItems.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('Approvals' as never)} activeOpacity={0.7}
                style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={[{ color: colors.primary, fontSize: 13, fontWeight: '600' }]}>View all {waitingItems.length} items →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Raise a Request (Top Services) ─────────── */}
        {hs.raiseRequest.visible ? (
          topServices.length > 0 ? (
            <View style={{ marginTop: smTop(raiseC) }}>
              <MostUsedServicesRail
                services={topServices}
                limit={10}
                navigation={navigation as any}
                colors={colors}
                skin={skin}
                fontFamily={fontFamily}
                title="Raise a request"
                allLabel="All Services →"
              />
            </View>
          ) : (
            <View style={[styles.section, { marginTop: smTop(raiseC) }]}>
              <TouchableOpacity style={[styles.browseAllCard, shadows.card, { backgroundColor: colors.primary, borderRadius: skin.cardRadius }, raiseC && { padding: 12 }]}
                onPress={() => navigation.navigate('Sanadkom', { screen: 'ServiceCatalog' })} activeOpacity={0.7}>
                <ThemedIcon name="document" size={raiseC ? 24 : 28} color="#fff" />
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.browseAllTitle}>Browse Service Catalog</Text>
                  <Text style={styles.browseAllSub}>Submit IT, HR, Finance, GS requests and more</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 18 }}>→</Text>
              </TouchableOpacity>
            </View>
          )
        ) : null}

        {/* ── Leave Summary ──────────────────────────── */}
        {hs.leaveSummary.visible ? (
        <View style={[styles.section, { marginTop: smTop(leaveC) }]}>
          <Text style={secTitleStyle}>Leave summary</Text>
          <View style={[styles.leaveCard, shadows.card, { backgroundColor: colors.card, padding: secPad(leaveC), borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border }]}>
            <View style={styles.leaveRow}>
              {(
                [
                  { name: 'calendar' as const, val: totalDaysTaken, label: 'Days Taken', color: colors.text },
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
            <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: colors.primarySoft }, leaveC && { paddingVertical: 10, marginTop: 8 }]}
              onPress={() => navigation.navigate('More', { screen: 'LeaveRequest' })} activeOpacity={0.7}>
              <Text style={[styles.leaveBtnText, { color: colors.primary, fontSize: leaveC ? 13 : 14 }]}>+ Request Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : null}

        {/* ── SCAD Star Winners ──────────────────────── */}
        {hs.scadStar.visible && winners.length > 0 && (
          <View style={[styles.section, { marginTop: smTop(starC) }]}>
            <View style={styles.sectionHeader}>
              <Text style={secTitleStyle}>SCAD Star winners</Text>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Recognition' })} activeOpacity={0.7}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: starC ? 8 : 10 }}>
              {winners.slice(0, 6).map((w: any, wi: number) => {
                return (
                  <TouchableOpacity key={String(w.shortlistId ?? wi)}
                    style={[styles.winnerCard, shadows.card, { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border }, starC && { width: 116, padding: 10 }]}
                    onPress={() => navigation.navigate('More', { screen: 'WinnerDetail', params: { shortlistId: w.shortlistId } })} activeOpacity={0.7}>
                    <View style={[styles.winnerAvatar, { backgroundColor: accentChroma(colors, skin, wi) }, starC && { width: 42, height: 42, borderRadius: 12 }]}>
                      <Text style={[styles.winnerAvatarText, starC && { fontSize: 14 }]}>{getInitials(w.winnerName)}</Text>
                    </View>
                    <Text style={[styles.winnerName, { color: colors.text, fontSize: starC ? 11 : 12 }]} numberOfLines={1}>{w.winnerName}</Text>
                    <Text style={[styles.winnerDept, { color: colors.textMuted }]} numberOfLines={1}>{w.department}</Text>
                    <View style={styles.winnerSocial}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedIcon name="like" size={starC ? 11 : 12} color={colors.danger} />
                        <Text style={{ fontSize: starC ? 10 : 11, color: colors.text }}>{w.likesCount ?? 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedIcon name="comment" size={starC ? 11 : 12} color={colors.primary} />
                        <Text style={{ fontSize: starC ? 10 : 11, color: colors.text }}>{w.commentsCount ?? 0}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Portal: News / Announcements / Offers / Videos ── */}
        {hs.portal.visible ? (
        <View style={[styles.section, { marginTop: smTop(portC) }]}>
          <View style={styles.sectionHeader}>
            <Text style={secTitleStyle}>Portal</Text>
            <TouchableOpacity onPress={() => {
              const map: Record<string, string> = { news: 'News', announcements: 'Announcements', events: 'Events', offers: 'Offers', videos: 'Gallery' };
              navigation.navigate('More', { screen: map[portalTab] ?? 'News' });
            }} activeOpacity={0.7}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Tab row: filled pills (SCAD) vs underline (government themes) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: portC ? 4 : 6,
              marginBottom: portC ? 10 : 14,
              borderBottomWidth: skin.portalTabStyle === 'underline' ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: skin.portalTabStyle === 'underline' ? colors.divider : 'transparent',
              paddingBottom: skin.portalTabStyle === 'underline' ? 0 : 0,
            }}
          >
            {PORTAL_TABS.map((pt) => {
              const active = portalTab === pt.key;
              if (skin.portalTabStyle === 'underline') {
                return (
                  <TouchableOpacity
                    key={pt.key}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingBottom: 10,
                        marginRight: 16,
                        borderBottomWidth: active ? 2 : 0,
                        borderBottomColor: active ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setPortalTab(pt.key)}
                    activeOpacity={0.7}
                  >
                    <ThemedIcon
                      name={pt.icon}
                      size={portC ? 15 : 16}
                      color={active ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={{
                        color: active ? colors.primary : colors.textMuted,
                        fontSize: portC ? 12 : 13,
                        fontWeight: active ? '700' : '500',
                        fontFamily,
                      }}
                    >
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={pt.key}
                  style={[
                    styles.portalPill,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    portC && { paddingHorizontal: 10, paddingVertical: 6 },
                  ]}
                  onPress={() => setPortalTab(pt.key)}
                  activeOpacity={0.7}
                >
                  <ThemedIcon
                    name={pt.icon}
                    size={portC ? 12 : 14}
                    color={active ? '#fff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.portalPillText,
                      { color: active ? '#fff' : colors.text, fontSize: portC ? 11 : 12, fontFamily },
                    ]}
                  >
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tab content — horizontal carousel */}
          {portalTab === 'news' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {news.slice(0, 3).map((n: any, ni: number) => {
                const cover = resolveHomeNewsCoverUrl(n);
                const fallback = accentChroma(colors, skin, ni);
                return (
                  <TouchableOpacity key={String(n.id ?? ni)} style={[styles.newsCard, { backgroundColor: fallback }]}
                    onPress={() => navigation.navigate('More', { screen: 'NewsDetail', params: { newsId: n.id } })} activeOpacity={0.8}>
                    {cover ? (
                      <>
                        <Image
                          source={{ uri: cover }}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                        />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
                      </>
                    ) : (
                      <View style={styles.newsEmoji}>
                        <ThemedIcon name="tabNews" size={22} color="rgba(255,255,255,0.25)" />
                      </View>
                    )}
                    <View style={styles.newsContent}>
                      {n.category ? <View style={styles.newsCatBadge}><Text style={styles.newsCatText}>{n.category}</Text></View> : null}
                      <Text style={styles.newsTitle} numberOfLines={3}>{n.title}</Text>
                      <View style={styles.newsMeta}>
                        <Text style={styles.newsDate}>{n.publishedDate ?? n.date}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ThemedIcon name="like" size={12} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.newsSocial}>{n.likesCount ?? 0}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ThemedIcon name="comment" size={12} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.newsSocial}>{n.commentsCount ?? 0}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {portalTab === 'announcements' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {announcements.slice(0, 6).map((a: any, ai: number) => {
                return (
                  <TouchableOpacity key={String(a.announcementId ?? a.id ?? ai)} style={[styles.annCard, { backgroundColor: accentChroma(colors, skin, ai) }]}
                    onPress={() => navigation.navigate('More', { screen: 'AnnouncementDetail', params: { announcementId: a.announcementId ?? a.id } })} activeOpacity={0.8}>
                    <View style={styles.annCatBadge}><Text style={styles.annCatText}>{a.category ?? 'General'}</Text></View>
                    <Text style={styles.annTitle} numberOfLines={3}>{a.title}</Text>
                    <Text style={styles.annDate}>{a.publishedDate}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {portalTab === 'events' && (
            events.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No upcoming events</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {events.slice(0, 8).map((ev: any, ei: number) => {
                  const month = ev.startDate ? new Date(ev.startDate).toLocaleString('en', { month: 'short' }).toUpperCase() : '---';
                  const day = ev.startDate ? new Date(ev.startDate).getDate() : '--';
                  return (
                    <TouchableOpacity
                      key={String(ev.id ?? ei)}
                      style={[styles.eventCard, shadows.card, { backgroundColor: colors.card }]}
                      onPress={() => navigation.navigate('More', { screen: 'EventDetail', params: { eventId: ev.id } })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.eventCardDate, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.eventCardMonth, { color: colors.primary }]}>{month}</Text>
                        <Text style={[styles.eventCardDay, { color: colors.primary }]}>{day}</Text>
                      </View>
                      <Text style={[styles.eventCardTitle, { color: colors.text }]} numberOfLines={2}>{ev.title}</Text>
                      <Text style={[styles.eventCardMeta, { color: colors.textMuted }]} numberOfLines={1}>📍 {ev.location ?? '—'}</Text>
                      {formatTimeString(ev.startTime) ? (
                        <Text style={[styles.eventCardMeta, { color: colors.textMuted }]} numberOfLines={1}>🕐 {formatTimeString(ev.startTime)}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          )}

          {portalTab === 'offers' && (
            offers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No offers available</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {offers.map((o: any, oi: number) => (
                  <TouchableOpacity key={String(o.id ?? oi)} style={[styles.offerCard, shadows.card, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('More', { screen: 'OfferDetail', params: { offerId: o.id } })} activeOpacity={0.8}>
                    <View style={styles.offerBanner}><Text style={{ fontSize: 32 }}>🏷️</Text></View>
                    <View style={styles.offerBody}>
                      <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={2}>{o.title}</Text>
                      <Text style={[styles.offerDate, { color: colors.textMuted }]}>{o.offerDate}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}

          {portalTab === 'videos' && (
            videos.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No videos available</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {videos.map((v: any, vi: number) => (
                  <TouchableOpacity key={String(v.id ?? vi)} style={[styles.videoCard, { backgroundColor: '#1B1B2F' }]}
                    onPress={() => navigation.navigate('More', { screen: 'VideoDetail', params: { videoId: v.id } })} activeOpacity={0.8}>
                    <View style={styles.videoPlay}>
                      <ThemedIcon name="playCircle" size={28} color="#fff" />
                    </View>
                    <Text style={styles.videoTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={styles.videoDate}>{v.createdDate}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}
        </View>
        ) : null}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { overflow: 'hidden', position: 'relative' },
  heroTop: { flexDirection: 'row' as const, justifyContent: 'space-between' },
  heroTextBlock: { flex: 1, marginRight: 8, minWidth: 0 },
  heroGreeting: {},
  heroName: {},
  heroRole: {},
  heroRight: { flexDirection: 'row' as const, alignItems: 'center', gap: 8 },
  heroBell: { justifyContent: 'center' as const, alignItems: 'center' as const, position: 'relative' as const, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroBellIcon: {},
  bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  bellBadgeText: { color: '#fff', fontWeight: '900' as const },
  dateTimeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12, marginTop: 0, flexWrap: 'wrap' as const },
  dateChip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flex: 1, minWidth: 0 },
  dateChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' as const },
  timeText: { color: '#4DA3FF', fontSize: 14, fontWeight: '800' as const },
  attCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' },
  attCardInner: { flexDirection: 'row' as const, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' as const },
  attBlock: { flex: 1, alignItems: 'center' as const, minWidth: 0 },
  attLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '600' as const, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  attVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const },
  attDivider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  attStatusText: { fontSize: 11, fontWeight: '700' as const },
  heroAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  heroAvatarImg: { width: 52, height: 52, borderRadius: 16, position: 'absolute' },
  heroAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '700', marginBottom: 12 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { minWidth: 72, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6 },
  actionIconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  yearPills: { flexDirection: 'row', gap: 6 },
  yearPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  yearPillText: { fontSize: 11, fontWeight: '700' },
  perfCard: { borderRadius: 14, padding: 16 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutWrap: { alignItems: 'center' },
  donutOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  donutSegment: { position: 'absolute', width: '100%', height: '100%', borderRadius: 50, borderWidth: 8 },
  donutInner: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  donutPct: { fontSize: 20, fontWeight: '900' },
  donutLabel: { fontSize: 10, fontWeight: '600' },
  perfStats: { flex: 1 },
  perfStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  perfDot: { width: 10, height: 10, borderRadius: 5 },
  perfStatLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  perfStatVal: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  perfTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4 },
  perfTotalLabel: { fontSize: 14, fontWeight: '700' },
  perfTotalVal: { fontSize: 18, fontWeight: '900' },

  svcCard: { width: 130, borderRadius: 14, padding: 12, alignItems: 'center' },
  svcIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  svcName: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16, marginBottom: 4 },
  svcGroup: { fontSize: 10, textAlign: 'center' },

  browseAllCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16 },
  browseAllTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  browseAllSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  waitCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  waitCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  waitCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
  waitModBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  waitTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  waitMeta: { flexDirection: 'row', gap: 8 },
  waitModule: { fontSize: 11, fontWeight: '600' },
  waitStatus: { fontSize: 11 },

  leaveCard: { borderRadius: 16, padding: 16 },
  leaveRow: { flexDirection: 'row', alignItems: 'center' },
  leaveStat: { flex: 1, alignItems: 'center', gap: 4 },
  leaveNum: { fontSize: 24, fontWeight: '900' },
  leaveLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  leaveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  leaveBtnText: { fontSize: 14, fontWeight: '700' },

  winnerCard: { width: 130, borderRadius: 14, padding: 12, alignItems: 'center' },
  winnerAvatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  winnerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  winnerName: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  winnerDept: { fontSize: 10, textAlign: 'center', marginBottom: 6 },
  winnerSocial: { flexDirection: 'row', gap: 8 },

  portalPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  portalPillText: { fontSize: 12, fontWeight: '700' },

  newsCard: { width: 240, height: 150, borderRadius: 12, padding: 12, justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' },
  newsEmoji: { fontSize: 18, opacity: 0.2, position: 'absolute', top: 8, right: 8 },
  newsContent: { flex: 1, justifyContent: 'flex-end' },
  newsCatBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 6 },
  newsCatText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  newsTitle: { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  newsDate: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  newsSocial: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },

  annCard: { width: 165, borderRadius: 10, padding: 12, minHeight: 85, justifyContent: 'space-between' },
  annCatBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 10 },
  annCatText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  annTitle: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 15 },
  annDate: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8 },

  offerCard: { width: 160, borderRadius: 10, flexDirection: 'row', overflow: 'hidden' },
  offerBanner: { width: 48, backgroundColor: '#E67E22', justifyContent: 'center', alignItems: 'center' },
  offerBody: { flex: 1, padding: 12 },
  offerTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 6 },
  offerDate: { fontSize: 11 },

  videoCard: { width: 150, borderRadius: 10, padding: 12, minHeight: 85, justifyContent: 'space-between' },
  videoPlay: { alignSelf: 'center', marginBottom: 8 },
  videoTitle: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17 },
  videoDate: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 },

  eventCard: { width: 180, borderRadius: 14, padding: 12, gap: 6 },
  eventCardDate: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: 'center', minWidth: 52, marginBottom: 6 },
  eventCardMonth: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  eventCardDay: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  eventCardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  eventCardMeta: { fontSize: 11 },
});

export default HomeScadClassicLayout;
