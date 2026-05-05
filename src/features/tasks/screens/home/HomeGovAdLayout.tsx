/**
 * Government — Abu Dhabi: blue executive band, KPI strip, left-accent cards, wide layout.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedRefreshControl from '../../../../shared/components/ThemedRefreshControl';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import { resolveWaitingItemRoute } from '../../utils/taskRouting';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { serviceCategoryIcon } from '../../../../app/theme/semanticIcons';
import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { QUICK_ACTIONS, getInitials, PORTAL_TABS } from './homeScreenConstants';
import { accentChroma } from '../../../../app/theme/accentChroma';
import type { HomeScreenModel } from './useHomeScreenModel';

const HomeGovAdLayout: React.FC<{ m: HomeScreenModel }> = ({ m }) => {
  const {
    navigation, colors, shadows, fontScale, skin, user, homeSections: hs,
    isLargeHero, currentYear, perfYear, setPerfYear, heroName, heroRole, unreadNotifs, waitingItems,
    topServices, news, totalDaysTaken, total, chartData, completionRate, completionPctColor, refreshing, onRefresh,
    portalTab, setPortalTab, greeting, dateStr, timeStr, inTime, outTime, attStatus, winners, events, announcements, offers, videos, pendingRequests, hasUpcomingLeave,
    qaC, perfC, waitC, raiseC, leaveC, starC, portC, smTop, secPad, fontFamily,
  } = m;
  const { width: W } = useWindowDimensions();
  const kpiW = (W - 16 * 2 - 12) / 4;
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View
          style={[
            styles.band,
            { backgroundColor: colors.primary },
            isIOS ? { paddingTop: insets.top + 12 } : null,
          ]}
        >
          <View style={styles.bandRow}>
            <View style={{ flex: 1 }}>
              {greeting.kind === 'text' || greeting.kind === 'icon' ? (
                <Text style={styles.bandG}>{greeting.text}</Text>
              ) : (
                <Text style={styles.bandG}>{greeting.emoji} {greeting.text}</Text>
              )}
              <Text style={styles.bandN} numberOfLines={1}>{heroName}</Text>
              <Text style={styles.bandR} numberOfLines={1}>{heroRole}</Text>
            </View>
            <View style={styles.bandRgt}>
              <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'Notifications' })} style={styles.bIco}>
                <ThemedIcon name="bell" size={22} color="#fff" />
                {unreadNotifs.length > 0 ? <View style={styles.bDot}><Text style={styles.bdt}>{unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}</Text></View> : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Profile' })}>
                <ProfileAvatar userId={user?.userId} name={heroName} size={44} borderRadius={10} backgroundColor="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.kpiRow}>
            {[
              { ico: 'waitTask' as const, l: 'Actions', v: String(waitingItems.length), onPress: () => navigation.navigate('Approvals' as never) },
              { ico: 'leave' as const, l: 'Leave', v: String(totalDaysTaken), onPress: () => navigation.navigate('More', { screen: 'LeaveBalance' }) },
              { ico: 'bell' as const, l: 'Inbox', v: String(unreadNotifs.length), onPress: () => navigation.navigate('Home', { screen: 'Notifications' }) },
              { ico: 'chart' as const, l: 'Score', v: `${completionRate}%`, onPress: null as (() => void) | null },
            ].map((k, i) => (
              <TouchableOpacity
                key={i}
                disabled={!k.onPress}
                onPress={k.onPress || undefined}
                style={[{ width: kpiW, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, alignItems: 'center' }]}
              >
                <ThemedIcon name={k.ico} size={16} color="#E8F0F8" />
                <Text style={styles.kpiV} numberOfLines={1}>{k.v}</Text>
                <Text style={styles.kpiL} numberOfLines={1}>{k.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.stripe }]}>
          {isLargeHero ? (
            <View style={[styles.accentCard, { borderLeftColor: colors.primary, backgroundColor: colors.card, borderColor: colors.border, borderRadius: skin.cardRadius, ...shadows.card }]}>
              <View style={styles.hStrip}><Text style={{ color: colors.textMuted, fontSize: 12 }}>{dateStr}</Text><Text style={{ color: colors.primary, fontWeight: '800' }}>{timeStr}</Text></View>
              <View style={styles.att3}>
                <View style={styles.a3}><Text style={styles.a3l}>In</Text><Text style={{ fontWeight: '800' }}>{inTime ?? '—'}</Text></View>
                <View style={styles.a3}><Text style={styles.a3l}>Out</Text><Text style={{ fontWeight: '800' }}>{outTime ?? '—'}</Text></View>
                <View style={styles.a3}><Text style={styles.a3l}>Status</Text><Text style={{ fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{attStatus || '—'}</Text></View>
              </View>
            </View>
          ) : null}

          {hs.quickAccess.visible ? (
            <View style={{ marginTop: smTop(qaC) }}>
              <Text style={[styles.hSec, { color: colors.textSecondary, fontFamily }]}>eServices</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {QUICK_ACTIONS.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={() => navigation.navigate(a.screen, (a as any).params)}
                    style={[{ width: (W - 32 - 10) / 2, marginBottom: 10, padding: 12, backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <ThemedIcon name={a.name} size={22} color={colors.primary} />
                    <Text style={{ marginLeft: 8, fontWeight: '700', color: colors.text, flex: 1, fontSize: 12 * fontScale }} numberOfLines={2}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {hs.performance.visible ? (
            <View style={{ marginTop: smTop(perfC) }}>
              <View style={styles.rowB}>
                <Text style={styles.hSec}>Performance</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[currentYear, currentYear - 1].map((yr) => (
                    <TouchableOpacity key={yr} onPress={() => setPerfYear(yr)} style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: perfYear === yr ? colors.primary : colors.stripe, borderRadius: 6 }}>
                      <Text style={{ color: perfYear === yr ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '800' }}>{yr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.accentCard, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1, borderLeftWidth: 3, borderRadius: skin.cardRadius, padding: 16 }]}>
                <Text style={{ color: completionPctColor, fontSize: 40, fontWeight: '900', textAlign: 'center' }}>{completionRate}%</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                  {chartData.map((d) => (
                    <View key={d.label} style={{ width: '48%', maxWidth: '48%', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{d.label}</Text>
                      <Text style={{ fontWeight: '800', color: d.color, fontSize: 18 }}>{d.val}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ borderTopWidth: 1, borderColor: colors.divider, marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Total</Text>
                  <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>{total}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {hs.waitingForAction.visible && waitingItems.length > 0 ? (
            <View style={{ marginTop: smTop(waitC) }}>
              <Text style={styles.hSec}>Pending</Text>
              {waitingItems.slice(0, 3).map((item: any, i: number) => {
                const r = resolveWaitingItemRoute(item);
                const ico: SemanticIconName = r.screen === 'TicketDetail' ? 'waitTicket' : (r.screen === 'LeaveDetail' || r.screen === 'LeaveHistory') ? 'waitLeave' : 'waitTask';
                return (
                  <TouchableOpacity key={String(item.id ?? i)} onPress={() => navigation.navigate(r.stack as never, { screen: r.screen, params: r.params } as never)} style={[styles.accentCard, { backgroundColor: colors.card, borderLeftColor: colors.primary, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderRadius: skin.cardRadius, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }]}>
                    <ThemedIcon name={ico} size={22} color={colors.primary} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontWeight: '700' }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{item.moduleName}</Text>
                    </View>
                    <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {hs.raiseRequest.visible && topServices.length > 0 ? (
            <View style={{ marginTop: smTop(raiseC) }}>
              <View style={styles.rowB}><Text style={styles.hSec}>Popular services</Text><TouchableOpacity onPress={() => navigation.navigate('Sanadkom', { screen: 'ServiceCatalog' })}><Text style={{ color: colors.primary, fontWeight: '700' }}>All</Text></TouchableOpacity></View>
              {topServices.slice(0, 3).map((svc: any, si: number) => (
                <TouchableOpacity key={String(svc.id ?? si)} onPress={() => navigation.navigate('Sanadkom', { screen: 'SubmitTicket', params: { serviceId: svc.id, serviceName: svc.name } })} style={{ flexDirection: 'row', padding: 12, backgroundColor: colors.card, marginBottom: 6, borderRadius: skin.cardRadius, borderWidth: 1, borderColor: colors.border, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: accentChroma(colors, skin, si) }}>
                  <ThemedIcon name={serviceCategoryIcon(svc.groupName ?? '')} size={20} color={accentChroma(colors, skin, si)} />
                  <View style={{ marginLeft: 10, flex: 1 }}><Text style={{ fontWeight: '600' }} numberOfLines={2}>{svc.name}</Text></View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {hs.leaveSummary.visible ? (
            <View style={{ marginTop: smTop(leaveC) }}>
              <View style={{ flexDirection: 'row' }}>
                <View style={[{ flex: 1, padding: secPad(leaveC), backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.primary, borderColor: colors.border, borderWidth: 1, borderRadius: skin.cardRadius, marginRight: 4 }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Days taken</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{totalDaysTaken}</Text>
                </View>
                <View style={[{ flex: 1, padding: secPad(leaveC), backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.warning, borderColor: colors.border, borderWidth: 1, borderRadius: skin.cardRadius, marginLeft: 4 }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Pending</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900' }}>{pendingRequests}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {hs.scadStar.visible && winners.length > 0 ? (
            <View style={{ marginTop: smTop(starC) }}><Text style={styles.hSec}>Recognition</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {winners.slice(0, 5).map((w: any) => (
                  <View key={String(w.shortlistId)} style={{ width: 100, backgroundColor: colors.card, borderRadius: skin.cardRadius, padding: 8, borderLeftWidth: 3, borderLeftColor: colors.danger, borderColor: colors.border, borderWidth: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900' }}>{getInitials(w.winnerName)}</Text>
                    <Text style={{ fontSize: 10, textAlign: 'center' }} numberOfLines={2}>{w.winnerName}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {hs.portal.visible ? (
            <View style={{ marginTop: smTop(portC) }}>
              <View style={styles.rowB}><Text style={styles.hSec}>News and more</Text></View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {PORTAL_TABS.map((t) => (
                  <TouchableOpacity key={t.key} onPress={() => setPortalTab(t.key)} style={{ marginRight: 8, marginBottom: 8, borderBottomWidth: portalTab === t.key ? 2 : 0, borderColor: colors.primary, paddingBottom: 4 }}>
                    <ThemedIcon name={t.icon} size={16} color={portalTab === t.key ? colors.primary : colors.textMuted} />
                    <Text style={{ color: portalTab === t.key ? colors.primary : colors.textMuted, fontSize: 12 }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {portalTab === 'news' && news.slice(0, 3).map((n: any, ni: number) => (
                <TouchableOpacity key={String(n.id)} onPress={() => navigation.navigate('More', { screen: 'NewsDetail', params: { newsId: n.id } })} style={{ backgroundColor: colors.card, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.info, borderWidth: 1, borderColor: colors.border, marginBottom: 6 }}>
                  <Text style={{ fontWeight: '600' }} numberOfLines={2}>{n.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f4' },
  band: { paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bandG: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  bandN: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bandR: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  bandRgt: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bIco: { position: 'relative' },
  bDot: { position: 'absolute', right: -4, top: -2, minWidth: 16, backgroundColor: '#B84040', borderRadius: 8, paddingHorizontal: 3 },
  bdt: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, justifyContent: 'space-between' },
  kpiV: { color: '#fff', fontSize: 16, fontWeight: '900' },
  kpiL: { color: 'rgba(255,255,255,0.75)', fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -8, paddingHorizontal: 16, paddingTop: 20 },
  accentCard: { marginBottom: 4, padding: 12, borderWidth: 1, borderLeftWidth: 3 },
  hSec: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, color: '#4a667a' },
  hStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  att3: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' },
  a3: { flex: 1, alignItems: 'center' },
  a3l: { fontSize: 9, color: '#94a3b8' },
  rowB: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});

export default HomeGovAdLayout;
