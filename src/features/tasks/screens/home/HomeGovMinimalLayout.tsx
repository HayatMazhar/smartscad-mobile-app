/**
 * Government — minimal: eServices-style list home (no hero accents, list shortcuts, stat row, flat portal list).
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedRefreshControl from '../../../../shared/components/ThemedRefreshControl';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import { resolveWaitingItemRoute } from '../../utils/taskRouting';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { serviceCategoryIcon } from '../../../../app/theme/semanticIcons';
import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { QUICK_ACTIONS, PORTAL_TABS, getInitials } from './homeScreenConstants';
import { accentChroma } from '../../../../app/theme/accentChroma';
import type { HomeScreenModel } from './useHomeScreenModel';

const HomeGovMinimalLayout: React.FC<{ m: HomeScreenModel }> = ({ m }) => {
  const {
    navigation, colors, shadows, fontFamily, fontScale, skin, user, homeSections: hs,
    isLargeHero, currentYear, perfYear, setPerfYear, heroName, heroRole,
    unreadNotifs, topServices, waitingItems, news, totalDaysTaken, pendingRequests, hasUpcomingLeave,
    total, chartData, completionRate, completionPctColor, refreshing, onRefresh,
    portalTab, setPortalTab, greeting, dateStr, timeStr, inTime, outTime, attStatus,
    qaC, perfC, waitC, raiseC, leaveC, starC, portC, smTop, secPad, secTitleStyle, winners, videos, events, offers, announcements,
  } = m;

  const label = (s: string) => <Text style={[styles.h2, { color: colors.text, fontFamily }]}>{s}</Text>;

  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.homeStatusBar} backgroundColor={colors.surface} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View
          style={[
            styles.topBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.divider },
            isIOS ? { paddingTop: insets.top + 8 } : null,
          ]}
        >
          <View style={styles.topRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {greeting.kind === 'text' ? (
                <Text style={[styles.caption, { color: colors.textMuted, fontFamily }]} numberOfLines={1}>{greeting.text}</Text>
              ) : greeting.kind === 'icon' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ThemedIcon name={greeting.icon} size={14} color={colors.textMuted} />
                  <Text style={[styles.caption, { color: colors.textMuted, fontFamily }]} numberOfLines={1}>{greeting.text}</Text>
                </View>
              ) : (
                <Text style={[styles.caption, { color: colors.textMuted, fontFamily }]} numberOfLines={1}>
                  {greeting.emoji} {greeting.text}
                </Text>
              )}
              <Text style={[styles.name, { color: colors.text, fontFamily, fontSize: 20 * fontScale }]} numberOfLines={1}>
                {heroName}
              </Text>
              <Text style={[styles.caption, { color: colors.textSecondary, fontFamily }]} numberOfLines={1}>{heroRole}</Text>
            </View>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}>
              <ThemedIcon name="bell" size={22} color={colors.primary} />
              {unreadNotifs.length > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeTxt}>{unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Profile' })}>
              <ProfileAvatar userId={user?.userId} name={heroName} size={44} borderRadius={12} backgroundColor={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {isLargeHero ? (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, marginHorizontal: 16, marginTop: 12, borderRadius: skin.cardRadius, padding: 12 }]}>
            <View style={styles.dateRow}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily }}>{dateStr}</Text>
              <Text style={{ color: colors.primary, fontWeight: '800', fontFamily }}>{timeStr}</Text>
            </View>
            <View style={[styles.attRow, { borderTopColor: colors.divider }]}>
              <View style={styles.attCell}>
                <Text style={styles.tinyLabel}>In</Text>
                <Text style={{ color: inTime ? colors.success : colors.text, fontWeight: '700' }}>{inTime ?? '—'}</Text>
              </View>
              <View style={styles.attCell}>
                <Text style={styles.tinyLabel}>Out</Text>
                <Text style={{ color: outTime ? colors.danger : colors.text, fontWeight: '700' }}>{outTime ?? '—'}</Text>
              </View>
              <View style={styles.attCell}>
                <Text style={styles.tinyLabel}>Status</Text>
                <Text style={{ color: attStatus.toLowerCase().includes('present') ? colors.success : colors.warning, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
                  {attStatus || '—'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {hs.quickAccess.visible ? (
          <View style={[styles.block, { marginTop: smTop(qaC) }]}>
            <Text style={secTitleStyle}>Shortcuts</Text>
            <View style={[styles.listCard, { borderColor: colors.border, borderRadius: skin.cardRadius, backgroundColor: colors.card }]}>
              {QUICK_ACTIONS.map((a, i) => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.listRow, i < QUICK_ACTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
                  onPress={() => navigation.navigate(a.screen, (a as any).params)}
                >
                  <ThemedIcon name={a.name} size={22} color={colors.primary} />
                  <Text style={[styles.listLabel, { color: colors.text, fontFamily, flex: 1 }]}>{a.label}</Text>
                  <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {hs.performance.visible ? (
          <View style={[styles.block, { marginTop: smTop(perfC) }]}>
            <View style={styles.rowBetween}>
              {label('Performance')}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[currentYear, currentYear - 1].map((yr) => {
                  const active = perfYear === yr;
                  return (
                    <TouchableOpacity key={yr} onPress={() => setPerfYear(yr)} style={[styles.pill, { borderColor: colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? colors.primary : colors.textMuted }}>{yr}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.statGrid, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: skin.cardRadius, padding: 12 }]}>
              {chartData.map((d) => (
                <View key={d.label} style={styles.statCell}>
                  <Text style={[styles.statNum, { color: d.color, fontSize: perfC ? 20 : 22 }]}>{d.val}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted, fontSize: 10, fontFamily }]} numberOfLines={2}>{d.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalsRow}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Completion</Text>
              <Text style={{ color: completionPctColor, fontWeight: '900', fontSize: 20 }}>{completionRate}%</Text>
              <Text style={{ color: colors.textMuted }}> · </Text>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Total {total}</Text>
            </View>
          </View>
        ) : null}

        {hs.waitingForAction.visible && waitingItems.length > 0 ? (
          <View style={[styles.block, { marginTop: smTop(waitC) }]}>
            <Text style={secTitleStyle}>Action required</Text>
            {waitingItems.slice(0, 5).map((item: any, i: number) => {
              const route = resolveWaitingItemRoute(item);
              const isTicket = route.screen === 'TicketDetail';
              const isLeave = route.screen === 'LeaveDetail' || route.screen === 'LeaveHistory';
              const ico: SemanticIconName = isTicket ? 'waitTicket' : isLeave ? 'waitLeave' : 'waitTask';
              return (
                <TouchableOpacity
                  key={String(item.id ?? i)}
                  style={[styles.waitRow, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1, borderLeftWidth: 3 }]}
                  onPress={() => navigation.navigate(route.stack as never, { screen: route.screen, params: route.params } as never)}
                >
                  <ThemedIcon name={ico} size={20} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{item.moduleName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {hs.raiseRequest.visible ? (
          <View style={[styles.block, { marginTop: smTop(raiseC) }]}>
            <View style={styles.rowBetween}>
              {label('Services')}
              <TouchableOpacity onPress={() => navigation.navigate('Sanadkom', { screen: 'ServiceCatalog' })}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Catalog</Text>
              </TouchableOpacity>
            </View>
            {topServices.length === 0 ? (
              <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary, borderRadius: skin.cardRadius }]} onPress={() => navigation.navigate('Sanadkom', { screen: 'ServiceCatalog' })}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Browse service catalog</Text>
              </TouchableOpacity>
            ) : (
              topServices.slice(0, 4).map((svc: any, si: number) => {
                const c = accentChroma(colors, skin, si);
                return (
                  <TouchableOpacity
                    key={String(svc.id ?? si)}
                    style={[styles.svcList, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: skin.cardRadius, marginBottom: 8, padding: 12 }]}
                    onPress={() => navigation.navigate('Sanadkom', { screen: 'SubmitTicket', params: { serviceId: svc.id, serviceName: svc.name } })}
                  >
                    <ThemedIcon name={serviceCategoryIcon(svc.groupName ?? svc.categoryName ?? '')} size={22} color={c} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={2}>{svc.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{svc.categoryName}</Text>
                    </View>
                    <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

        {hs.leaveSummary.visible ? (
          <View style={[styles.block, { marginTop: smTop(leaveC) }]}>
            <Text style={secTitleStyle}>Leave</Text>
            <View style={[styles.leave3, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: skin.cardRadius, padding: secPad(leaveC) }]}>
              <View style={styles.lv}><ThemedIcon name="calendar" size={20} color={colors.text} /><Text style={styles.ln}>{totalDaysTaken}</Text><Text style={styles.ll}>Days taken</Text></View>
              <View style={styles.lv}><ThemedIcon name="hourglass" size={20} color={colors.warning} /><Text style={styles.ln}>{pendingRequests}</Text><Text style={styles.ll}>Pending</Text></View>
              <View style={styles.lv}><ThemedIcon name="airplane" size={20} color={colors.primary} /><Text style={styles.ln}>{hasUpcomingLeave ? 'Yes' : 'No'}</Text><Text style={styles.ll}>Upcoming</Text></View>
            </View>
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => navigation.navigate('More', { screen: 'LeaveRequest' })}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Request leave</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hs.scadStar.visible && winners.length > 0 ? (
          <View style={[styles.block, { marginTop: smTop(starC) }]}>
            <Text style={secTitleStyle}>SCAD Star</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
              {winners.slice(0, 5).map((w: any, wi: number) => (
                <TouchableOpacity
                  key={String(w.shortlistId ?? wi)}
                  style={{ width: 120, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: skin.cardRadius }}
                  onPress={() => navigation.navigate('More', { screen: 'WinnerDetail', params: { shortlistId: w.shortlistId } })}
                >
                  <Text style={{ fontWeight: '800', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{getInitials(w.winnerName)}</Text>
                  <Text style={{ fontSize: 11, color: colors.text, textAlign: 'center', marginTop: 4 }} numberOfLines={2}>{w.winnerName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {hs.portal.visible ? (
          <View style={[styles.block, { marginTop: smTop(portC) }]}>
            <View style={styles.rowBetween}><Text style={secTitleStyle}>Portal</Text>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'News' })}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Open</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {PORTAL_TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setPortalTab(t.key)}
                  style={{ paddingBottom: 6, borderBottomWidth: portalTab === t.key ? 2 : 0, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <ThemedIcon name={t.icon} size={15} color={portalTab === t.key ? colors.primary : colors.textMuted} />
                  <Text style={{ color: portalTab === t.key ? colors.primary : colors.textMuted, fontSize: 12, fontWeight: portalTab === t.key ? '700' : '500' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {portalTab === 'news' && news.slice(0, 4).map((n: any, ni: number) => (
              <TouchableOpacity
                key={String(n.id ?? ni)}
                style={{ padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: skin.cardRadius, marginBottom: 8 }}
                onPress={() => navigation.navigate('More', { screen: 'NewsDetail', params: { newsId: n.id } })}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>{n.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{n.publishedDate ?? n.date}</Text>
              </TouchableOpacity>
            ))}
            {portalTab === 'announcements' && announcements.slice(0, 3).map((a: any, i: number) => (
              <TouchableOpacity key={String(a.announcementId ?? i)} style={{ padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: skin.cardRadius, marginBottom: 8 }} onPress={() => navigation.navigate('More', { screen: 'AnnouncementDetail', params: { announcementId: a.announcementId ?? a.id } })}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>{a.title}</Text>
              </TouchableOpacity>
            ))}
            {portalTab === 'events' && events.length === 0 ? <Text style={{ color: colors.textMuted }}>No events</Text> : null}
            {portalTab === 'events' && events.slice(0, 4).map((ev: any, i: number) => (
              <TouchableOpacity
                key={String(ev.id ?? i)}
                style={{ marginBottom: 8, padding: 8, backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: 1, borderColor: colors.border }}
                onPress={() => navigation.navigate('More', { screen: 'EventDetail', params: { eventId: ev.id } })}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>{ev.title}</Text>
              </TouchableOpacity>
            ))}
            {portalTab === 'offers' && offers.length === 0 ? <Text style={{ color: colors.textMuted }}>No offers</Text> : null}
            {portalTab === 'offers' && offers.slice(0, 3).map((o: any, i: number) => (
              <TouchableOpacity key={String(o.id ?? i)} onPress={() => navigation.navigate('More', { screen: 'OfferDetail', params: { offerId: o.id } })} style={{ marginBottom: 6 }}>
                <Text style={{ color: colors.primary }} numberOfLines={1}>{o.title}</Text>
              </TouchableOpacity>
            ))}
            {portalTab === 'videos' && videos.length === 0 ? <Text style={{ color: colors.textMuted }}>No videos</Text> : null}
            {portalTab === 'videos' && videos.slice(0, 3).map((v: any, i: number) => (
              <TouchableOpacity key={String(v.id ?? i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }} onPress={() => navigation.navigate('More', { screen: 'VideoDetail', params: { videoId: v.id } })}>
                <ThemedIcon name="playCircle" size={20} color={colors.primary} />
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>{v.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  caption: { fontSize: 12, marginBottom: 2 },
  name: { fontWeight: '800' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  block: { paddingHorizontal: 16 },
  card: { overflow: 'hidden' },
  listCard: { borderWidth: 1, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 10 },
  listLabel: { fontSize: 15, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statGrid: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', minWidth: 0 },
  statNum: { fontWeight: '900' },
  statLbl: { textAlign: 'center' },
  totalsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 8, gap: 4 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  attRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, justifyContent: 'space-between' },
  attCell: { flex: 1, alignItems: 'center' },
  tinyLabel: { fontSize: 9, color: '#888', marginBottom: 2, textTransform: 'uppercase' },
  waitRow: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6 },
  cta: { padding: 16, alignItems: 'center' },
  svcList: { flexDirection: 'row', alignItems: 'center' },
  leave3: { flexDirection: 'row', justifyContent: 'space-between' },
  lv: { flex: 1, alignItems: 'center' },
  ln: { fontSize: 20, fontWeight: '900', color: '#333' },
  ll: { fontSize: 9, textTransform: 'uppercase', color: '#888', marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
});

export default HomeGovMinimalLayout;
