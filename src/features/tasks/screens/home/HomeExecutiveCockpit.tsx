import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Platform } from 'react-native';
import AuthedImage from '../../../../shared/components/AuthedImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedRefreshControl from '../../../../shared/components/ThemedRefreshControl';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../../../store/store';
import {
  useGetExecCockpitQuery,
  useTrackCockpitEventMutation,
  type KpiScope,
  type ApprovalModule,
  type BriefingItem,
  type BriefingSeverity,
  type AgendaItem,
  type RankingItem,
  type AnnualGoal,
  type AgendaKind,
} from '../../../executive/services/executiveApi';
import Sparkline from '../../../executive/components/Sparkline';
import PerformanceDonut from '../../../executive/components/PerformanceDonut';
import CockpitSkeleton from '../../../executive/components/CockpitSkeleton';
import EmptyState from '../../../executive/components/EmptyState';
import QueryStates from '../../../../shared/components/QueryStates';
import TrendIndicator from '../../../executive/components/TrendIndicator';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import type { HomeScreenModel } from './homeModelTypes';
import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { API_BASE_URL } from '../../../../store/baseApi';
import { accentChromaKey } from '../../../../app/theme/accentChroma';
import { isMidnightDate, formatTimeString } from '../../../../shared/utils/dateUtils';

/**
 * Cover-image resolver mirroring HomeGovSoftLayout. The mobile SP exposes the
 * first active News_Photos row id as `coverNewsPhotoId`, served by
 * `/portal/news/photos/{id}` which proxies the file via Windows impersonation.
 * Falling back to `/portal/news/{newsId}/cover` covers the legacy shape.
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

interface Props {
  m: HomeScreenModel;
}

// ─── Hero color schemes per persona ─────────────────────────────────────
const HERO_GRADIENTS: Record<string, [string, string, string]> = {
  DG: ['#1B4D3E', '#2C7A5C', '#3DA67D'],          // Deep emerald — leadership
  ED: ['#0B3D5A', '#1A5C82', '#2A7AAD'],          // Royal blue — executive
  DIRECTOR: ['#5C2D6B', '#7E3F8F', '#A052B4'],    // Purple — strategic
  DEFAULT: ['#1A237E', '#3949AB', '#5C6BC0'],     // Indigo fallback
};

const SEVERITY_ICON: Record<BriefingSeverity, SemanticIconName> = {
  critical: 'hourglass',
  warning: 'announcements',
  info: 'sparkles',
  success: 'sparkles',
};

const HomeExecutiveCockpit: React.FC<Props> = ({ m }) => {
  const { colors, shadows, fontFamily, fontScale, skin, navigation } = m;
  const persona = useAppSelector((s) => s.auth.user?.persona) ?? 'DEFAULT';
  const { data: cockpit, refetch, isFetching, isLoading, isError, error } = useGetExecCockpitQuery();
  const [trackEvent] = useTrackCockpitEventMutation();

  // ── Auto-refresh on app foreground ─────────────────────────────────────
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (cockpit) setLastUpdated(new Date());
  }, [cockpit]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        // Came back from background — refresh if last refresh > 60s ago
        const ageMs = Date.now() - lastUpdated.getTime();
        if (ageMs > 60_000) {
          void refetch();
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [refetch, lastUpdated]);

  // ── Track cockpit_loaded event (fire-and-forget) ──────────────────────
  const trackedRef = useRef(false);
  useEffect(() => {
    if (cockpit && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent({ eventName: 'cockpit_loaded', metadata: persona }).catch(() => {});
    }
  }, [cockpit, trackEvent, persona]);

  // ── Extract data from multi-result-set response ───────────────────────
  const approvals = cockpit?.approvals?.[0] ?? { total: 0, oldestWaiting: null, trendDelta: 0 };
  const approvalsByModule = (cockpit?.approvalsByModule ?? []) as ApprovalModule[];
  const kpis = (cockpit?.kpis ?? []) as KpiScope[];
  const teamPulse = cockpit?.teamPulse?.[0] ?? { onLeaveToday: 0, onLeaveUpcoming: 0, attendanceFlagged: 0 };
  const briefing = (cockpit?.briefing ?? []) as BriefingItem[];
  const trends = cockpit?.trends?.[0];
  const todaysAgenda = (cockpit?.todaysAgenda ?? []) as AgendaItem[];
  const ranking = (cockpit?.ranking ?? []) as RankingItem[];
  const annualGoal = (cockpit?.annualGoal?.[0] ?? null) as AnnualGoal | null;
  const sparklineData = useMemo(() => {
    if (!trends) return [];
    return [trends.day0, trends.day1, trends.day2, trends.day3, trends.day4, trends.day5, trends.day6];
  }, [trends]);

  // ── Greeting ──────────────────────────────────────────────────────────
  const h = new Date().getHours();
  const greetingText = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  // ── Persona-specific hero gradient ────────────────────────────────────
  const heroGradient = HERO_GRADIENTS[persona] ?? HERO_GRADIENTS.DEFAULT;
  const personaLabel: Record<string, string> = {
    DG: 'Director General',
    ED: 'Executive Director',
    DIRECTOR: 'Director',
  };

  // ── Card style ────────────────────────────────────────────────────────
  const cardStyle = useMemo(
    () => [
      styles.card,
      shadows.card,
      {
        backgroundColor: colors.card,
        borderRadius: skin.cardRadius,
        borderWidth: skin.cardBorderWidth,
        borderColor: colors.border,
      },
    ],
    [colors, shadows, skin],
  );

  // ── Last-updated label ────────────────────────────────────────────────
  const lastUpdatedLabel = useMemo(() => {
    const ageMs = Date.now() - lastUpdated.getTime();
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 30) return 'Updated just now';
    if (ageSec < 60) return `Updated ${ageSec}s ago`;
    const ageMin = Math.floor(ageSec / 60);
    if (ageMin < 60) return `Updated ${ageMin}m ago`;
    return `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastUpdated]);

  // ── Days since oldest approval (for badge) ────────────────────────────
  const oldestDays = useMemo(() => {
    if (!approvals.oldestWaiting) return 0;
    const ms = Date.now() - new Date(approvals.oldestWaiting).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }, [approvals.oldestWaiting]);

  const onCardTap = (section: string) => {
    trackEvent({ eventName: 'cockpit_section_tapped', section }).catch(() => {});
  };

  // ── Quick Actions strip ───────────────────────────────────────────────
  // Tap targets that route the executive straight to the most-used screens
  // without forcing them through the More menu. These mirror the four
  // primary quick-action tiles we'd put on a desktop cockpit.
  const quickActions: { id: string; label: string; icon: SemanticIconName; onPress: () => void }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'chart',
      onPress: () => {
        onCardTap('quick_dashboard');
        navigation.navigate('Dashboard', { screen: 'ExecutiveDashboard' });
      },
    },
    {
      id: 'org',
      label: 'Org Chart',
      icon: 'orgchart',
      onPress: () => {
        onCardTap('quick_org');
        navigation.navigate('More', { screen: 'OrgChart' });
      },
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: 'events',
      onPress: () => {
        onCardTap('quick_calendar');
        navigation.navigate('More', { screen: 'Events' });
      },
    },
    {
      id: 'directory',
      label: 'Directory',
      icon: 'directory',
      onPress: () => {
        onCardTap('quick_directory');
        navigation.navigate('More', { screen: 'Directory' });
      },
    },
  ];

  // Agenda times: many Task.EndDate values are date-only (stored as midnight).
  // Showing "00:00" reads like a broken calendar — show "Due" or "All day" instead.
  const formatAgendaTime = (iso: string | null, kind: AgendaKind) => {
    // iso is either a full ISO datetime or a standalone HH:MM(:SS) time string.
    if (!iso) return kind === 'task_due' ? 'Due' : 'All day';

    // Try parsing as a full datetime first
    const asDate = new Date(iso);
    if (!isNaN(asDate.getTime())) {
      if (isMidnightDate(asDate)) return kind === 'task_due' ? 'Due' : 'All day';
      return asDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Standalone time string (e.g. "09:30", "09:30:00")
    const fmt = formatTimeString(iso);
    if (!fmt) return kind === 'task_due' ? 'Due' : 'All day';
    return fmt;
  };

  // Compute a colour for the goal-tracking status pill / progress bar
  const goalStatusColor = (status: AnnualGoal['status']) =>
    status === 'ahead' ? colors.success : status === 'ontrack' ? colors.info : colors.warning;
  const goalStatusLabel = (status: AnnualGoal['status']) =>
    status === 'ahead' ? 'Ahead of plan' : status === 'ontrack' ? 'On track' : status === 'behind' ? 'Behind plan' : '';

  // Quartile colour for the ranking pill
  const quartileColor = (q: RankingItem['quartile']) =>
    q === 'top' ? colors.success : q === 'upper' ? colors.info : q === 'lower' ? colors.warning : colors.danger;
  const quartileLabel = (q: RankingItem['quartile']) =>
    q === 'top' ? 'Top quartile' : q === 'upper' ? 'Upper half' : q === 'lower' ? 'Lower half' : q === 'bottom' ? 'Bottom quartile' : '';

  // ── Render helpers ────────────────────────────────────────────────────
  const renderBriefingIcon = (severity: BriefingSeverity) => {
    const color =
      severity === 'critical'
        ? colors.danger
        : severity === 'warning'
        ? colors.warning
        : severity === 'success'
        ? colors.success
        : colors.info;
    return <ThemedIcon name={SEVERITY_ICON[severity]} size={16} color={color} />;
  };

  const briefingBg = (severity: BriefingSeverity) =>
    severity === 'critical'
      ? colors.danger + '15'
      : severity === 'warning'
      ? colors.warning + '15'
      : severity === 'success'
      ? colors.success + '15'
      : colors.info + '10';

  const briefingBorderLeft = (severity: BriefingSeverity) =>
    severity === 'critical'
      ? colors.danger
      : severity === 'warning'
      ? colors.warning
      : severity === 'success'
      ? colors.success
      : colors.info;

  // ── Empty state when no approvals AND no KPIs ─────────────────────────
  const isFullyEmpty = approvals.total === 0 && kpis.length === 0 && teamPulse.onLeaveToday === 0;

  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <ThemedRefreshControl
          isFetching={isFetching}
          isLoading={isLoading}
          onRefresh={() => {
            trackEvent({ eventName: 'cockpit_refresh_pulled' }).catch(() => {});
            void refetch();
          }}
        />
      }
    >
      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, isIOS ? { paddingTop: insets.top + 12 } : null]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.greeting, { fontFamily, fontSize: 12 * fontScale }]}>
              {greetingText}
            </Text>
            {personaLabel[persona] && (
              <View style={styles.personaBadge}>
                <Text style={[styles.personaBadgeText, { fontFamily, fontSize: 9 * fontScale }]}>
                  {personaLabel[persona]}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroName, { fontFamily, fontSize: 22 * fontScale }]}>{m.heroName}</Text>
          <Text style={[styles.heroRole, { fontFamily, fontSize: 12 * fontScale }]}>
            {m.heroRole}
          </Text>
          <Text style={[styles.lastUpdated, { fontFamily, fontSize: 10 * fontScale }]}>
            {lastUpdatedLabel}
          </Text>
        </View>
      </LinearGradient>

      {/* ─── Quick Actions strip ─────────────────────────────────────────
         * Sits flush under the hero so executives can jump to the most
         * common destinations in one tap. Equal-width tiles, themed
         * background, accessible 44pt+ tap targets.
         */}
      <View style={styles.quickActionsStrip}>
        {quickActions.map((qa) => (
          <TouchableOpacity
            key={qa.id}
            style={[
              styles.quickActionTile,
              {
                backgroundColor: colors.card,
                borderRadius: skin.cardRadius,
                borderWidth: skin.cardBorderWidth,
                borderColor: colors.border,
              },
              shadows.card,
            ]}
            onPress={qa.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primaryLight }]}>
              <ThemedIcon name={qa.icon} size={18} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.text, fontFamily, fontSize: 10 * fontScale },
              ]}
              numberOfLines={1}
            >
              {qa.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && (
        <CockpitSkeleton
          cardBg={colors.card}
          borderRadius={skin.cardRadius}
          borderWidth={skin.cardBorderWidth}
          borderColor={colors.border}
        />
      )}

      {/* ─── Body: error gate + empty/main (hero / quick strip stay mounted) ─── */}
      {!isLoading && (
        <QueryStates
          errorGateOnly
          loading={false}
          apiError={isError}
          error={error}
          isRefreshing={isFetching}
          onRetry={() => void refetch()}
          errorMessage={(error as { data?: { message?: string } })?.data?.message}
          errorContainerStyle={styles.content}
        >
          {isFullyEmpty ? (
            <View style={styles.content}>
              <EmptyState
                icon="sparkles"
                title="All caught up!"
                message="You have no pending approvals and your team is fully covered today. Enjoy your day."
                variant="success"
                cardBg={colors.card}
                borderRadius={skin.cardRadius}
                borderWidth={skin.cardBorderWidth}
                borderColor={colors.border}
              />
            </View>
          ) : (
        <View style={styles.content}>
          {/* ── Approvals at a Glance ─────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale }]}>
                APPROVALS AT A GLANCE
              </Text>
              {sparklineData.length > 0 && sparklineData.some((v) => v > 0) && (
                <Sparkline
                  data={sparklineData}
                  width={70}
                  height={20}
                  color={colors.primary}
                  strokeWidth={1.5}
                />
              )}
            </View>

            {approvals.total === 0 ? (
              <EmptyState
                icon="sparkles"
                title="Inbox zero!"
                message="No approvals waiting on you."
                variant="success"
                cardBg={colors.card}
                borderRadius={skin.cardRadius}
                borderWidth={skin.cardBorderWidth}
                borderColor={colors.border}
              />
            ) : (
              <TouchableOpacity
                style={cardStyle}
                activeOpacity={0.7}
                onPress={() => {
                  onCardTap('approvals');
                  navigation.navigate('Approvals');
                }}
              >
                <View style={styles.approvalsHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.approvalCountRow}>
                      <Text
                        style={[
                          styles.approvalCount,
                          { color: colors.primary, fontFamily, fontSize: 38 * fontScale },
                        ]}
                      >
                        {approvals.total}
                      </Text>
                      {approvals.trendDelta !== 0 && (
                        <View style={{ marginLeft: 10 }}>
                          <TrendIndicator delta={approvals.trendDelta} positiveIsGood={false} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.approvalLabel,
                        { color: colors.textSecondary, fontFamily, fontSize: 13 * fontScale },
                      ]}
                    >
                      Pending approvals
                    </Text>
                    {oldestDays > 7 && (
                      <View style={[styles.oldestBadge, { backgroundColor: colors.danger + '15' }]}>
                        <ThemedIcon name="hourglass" size={12} color={colors.danger} />
                        <Text
                          style={[
                            styles.oldestText,
                            { color: colors.danger, fontFamily, fontSize: 11 * fontScale },
                          ]}
                        >
                          Oldest: {oldestDays} days
                        </Text>
                      </View>
                    )}
                  </View>
                  <ThemedIcon name="chevronForward" size={24} color={colors.primary} />
                </View>

                {approvalsByModule.length > 0 && (
                  <View style={styles.moduleChips}>
                    {approvalsByModule.map((mod, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.primaryLight, borderRadius: skin.cardRadius / 2 },
                        ]}
                      >
                        <ThemedIcon name={(mod.icon as SemanticIconName) ?? 'tasks'} size={12} color={colors.primary} />
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.primary, fontFamily, fontSize: 12 * fontScale },
                          ]}
                        >
                          {mod.module}: {mod.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Briefing ──────────────────────────────────────────── */}
          {briefing.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale, marginBottom: 12 }]}>
                TODAY'S BRIEFING
              </Text>
              {briefing.map((b, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.briefingCard,
                    {
                      backgroundColor: briefingBg(b.severity),
                      borderLeftColor: briefingBorderLeft(b.severity),
                      borderRadius: skin.cardRadius,
                    },
                  ]}
                >
                  <View style={styles.briefingIconWrap}>{renderBriefingIcon(b.severity)}</View>
                  <Text
                    style={[
                      styles.briefingText,
                      { color: colors.text, fontFamily, fontSize: 14 * fontScale },
                    ]}
                  >
                    {b.bullet}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Sector / Department Performance ───────────────────── */}
          {kpis.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale, marginBottom: 12 },
                ]}
              >
                {persona === 'DIRECTOR' ? 'DEPARTMENT PERFORMANCE' : 'SECTOR PERFORMANCE'}
              </Text>
              {kpis.map((kpi, idx) => {
                const perfColor =
                  kpi.performance >= 80
                    ? colors.success
                    : kpi.performance >= 60
                    ? colors.warning
                    : colors.danger;
                const perfTrack =
                  kpi.performance >= 80
                    ? colors.success + '20'
                    : kpi.performance >= 60
                    ? colors.warning + '20'
                    : colors.danger + '20';

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[cardStyle, styles.kpiCard]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onCardTap(`kpi_${kpi.scopeId}`);
                      // Navigate to filtered task list for this scope
                      navigation.navigate('Approvals', {
                        screen: 'ApprovalsInbox',
                        params: { scopeId: kpi.scopeId, scopeName: kpi.scopeName },
                      });
                    }}
                  >
                    <View style={styles.kpiHeader}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text
                          style={[
                            styles.kpiName,
                            { color: colors.text, fontFamily, fontSize: 15 * fontScale },
                          ]}
                          numberOfLines={2}
                        >
                          {kpi.scopeName?.trim()}
                        </Text>
                        {kpi.performanceTrend !== 0 && (
                          <View style={{ marginTop: 6 }}>
                            <TrendIndicator
                              delta={kpi.performanceTrend}
                              positiveIsGood={true}
                              suffix="% YoY"
                            />
                          </View>
                        )}
                      </View>
                      <PerformanceDonut
                        performance={kpi.performance}
                        size={64}
                        strokeWidth={6}
                        trackColor={perfTrack}
                        progressColor={perfColor}
                        textColor={perfColor}
                        fontFamily={fontFamily}
                      />
                    </View>

                    <View style={[styles.kpiStats, { borderTopColor: colors.divider }]}>
                      <View style={styles.kpiStat}>
                        <Text style={[styles.statValue, { color: colors.success, fontFamily, fontSize: 17 * fontScale }]}>
                          {kpi.completed}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily, fontSize: 10 * fontScale }]}>
                          Completed
                        </Text>
                      </View>
                      <View style={styles.kpiStat}>
                        <Text style={[styles.statValue, { color: colors.primary, fontFamily, fontSize: 17 * fontScale }]}>
                          {kpi.inProgress}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily, fontSize: 10 * fontScale }]}>
                          In Progress
                        </Text>
                      </View>
                      <View style={styles.kpiStat}>
                        <Text style={[styles.statValue, { color: colors.warning, fontFamily, fontSize: 17 * fontScale }]}>
                          {kpi.delayed}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily, fontSize: 10 * fontScale }]}>
                          Delayed
                        </Text>
                      </View>
                      <View style={styles.kpiStat}>
                        <Text style={[styles.statValue, { color: colors.danger, fontFamily, fontSize: 17 * fontScale }]}>
                          {kpi.overdue}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily, fontSize: 10 * fontScale }]}>
                          Overdue
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Performance Ranking ──────────────────────────────────
             * RANK() OVER all sectors (DG/ED) or all departments in the
             * parent sector (DIRECTOR) so the executive sees how their
             * scope compares. Quartile pill encodes performance.
             */}
          {ranking.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale, marginBottom: 12 },
                ]}
              >
                {persona === 'DIRECTOR' ? 'DEPARTMENT RANKING' : 'SECTOR RANKING'}
              </Text>
              {ranking.map((r, idx) => {
                const qColor = quartileColor(r.quartile);
                return (
                  <View key={`${r.scopeId}_${idx}`} style={[cardStyle, { marginBottom: 10 }]}>
                    <View style={styles.rankRow}>
                      <View style={[styles.rankBadge, { backgroundColor: qColor + '15' }]}>
                        <Text
                          style={[
                            styles.rankNumber,
                            { color: qColor, fontFamily, fontSize: 22 * fontScale },
                          ]}
                        >
                          #{r.rank}
                        </Text>
                        <Text
                          style={[
                            styles.rankOf,
                            { color: qColor, fontFamily, fontSize: 11 * fontScale },
                          ]}
                        >
                          of {r.totalScopes}
                        </Text>
                      </View>
                      <View style={styles.rankBody}>
                        <Text
                          style={[
                            styles.rankScope,
                            { color: colors.text, fontFamily, fontSize: 14 * fontScale },
                          ]}
                          numberOfLines={2}
                        >
                          {r.scopeName?.trim()}
                        </Text>
                        <View style={styles.rankMetaRow}>
                          <View
                            style={[
                              styles.quartilePill,
                              { backgroundColor: qColor + '15', borderColor: qColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.quartileText,
                                { color: qColor, fontFamily, fontSize: 10 * fontScale },
                              ]}
                            >
                              {quartileLabel(r.quartile)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.rankPerf,
                              { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale },
                            ]}
                          >
                            {r.performance.toFixed(0)}% performance
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Annual Goal Tracking ────────────────────────────────
             * Compares year-elapsed % to current performance %, with a
             * single horizontal progress bar and a status pill driven by
             * the SP (ahead / ontrack / behind).
             */}
          {annualGoal && annualGoal.targetPerformance > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale, marginBottom: 12 },
                ]}
              >
                ANNUAL GOAL TRACKING
              </Text>
              <View style={cardStyle}>
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.goalTitle,
                        { color: colors.text, fontFamily, fontSize: 15 * fontScale },
                      ]}
                    >
                      {new Date().getFullYear()} Performance
                    </Text>
                    <Text
                      style={[
                        styles.goalSubtitle,
                        { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale },
                      ]}
                    >
                      {annualGoal.daysRemaining} days remaining
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.goalStatusPill,
                      {
                        backgroundColor: goalStatusColor(annualGoal.status) + '15',
                        borderColor: goalStatusColor(annualGoal.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.goalStatusText,
                        {
                          color: goalStatusColor(annualGoal.status),
                          fontFamily,
                          fontSize: 11 * fontScale,
                        },
                      ]}
                    >
                      {goalStatusLabel(annualGoal.status)}
                    </Text>
                  </View>
                </View>

                {/* Performance bar */}
                <View style={styles.goalRow}>
                  <Text
                    style={[
                      styles.goalRowLabel,
                      { color: colors.textSecondary, fontFamily, fontSize: 11 * fontScale },
                    ]}
                  >
                    Current performance
                  </Text>
                  <Text
                    style={[
                      styles.goalRowValue,
                      {
                        color: goalStatusColor(annualGoal.status),
                        fontFamily,
                        fontSize: 14 * fontScale,
                      },
                    ]}
                  >
                    {annualGoal.currentPerformance.toFixed(0)}% / {annualGoal.targetPerformance.toFixed(0)}%
                  </Text>
                </View>
                <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, (annualGoal.currentPerformance / annualGoal.targetPerformance) * 100))}%`,
                        backgroundColor: goalStatusColor(annualGoal.status),
                      },
                    ]}
                  />
                </View>

                {/* Year progress bar */}
                <View style={[styles.goalRow, { marginTop: 14 }]}>
                  <Text
                    style={[
                      styles.goalRowLabel,
                      { color: colors.textSecondary, fontFamily, fontSize: 11 * fontScale },
                    ]}
                  >
                    Year elapsed
                  </Text>
                  <Text
                    style={[
                      styles.goalRowValue,
                      { color: colors.textSecondary, fontFamily, fontSize: 14 * fontScale },
                    ]}
                  >
                    {annualGoal.yearProgress}%
                  </Text>
                </View>
                <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, annualGoal.yearProgress))}%`,
                        backgroundColor: colors.textMuted,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Today's Agenda (before Team Pulse) ────────────────── */}
          {todaysAgenda.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale },
                  ]}
                >
                  TODAY'S AGENDA
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onCardTap('agenda_view_all');
                    navigation.navigate('More', { screen: 'Events' });
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 13 * fontScale,
                      fontWeight: '700',
                      fontFamily,
                    }}
                  >
                    Open calendar
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={cardStyle}>
                {todaysAgenda.slice(0, 5).map((item, idx) => {
                  const isMeeting = item.kind === 'meeting';
                  const tone = isMeeting ? colors.info : colors.warning;
                  return (
                    <View
                      key={`${item.title}_${idx}`}
                      style={[
                        styles.agendaRow,
                        {
                          borderBottomWidth:
                            idx < Math.min(4, todaysAgenda.length - 1) ? StyleSheet.hairlineWidth : 0,
                          borderBottomColor: colors.divider,
                        },
                      ]}
                    >
                      <View style={[styles.agendaTimeCol, { borderRightColor: colors.divider }]}>
                        <Text
                          style={[
                            styles.agendaTimeText,
                            { color: tone, fontFamily, fontSize: 13 * fontScale },
                          ]}
                          numberOfLines={1}
                        >
                          {formatAgendaTime(item.startTime, item.kind)}
                        </Text>
                        <View style={[styles.agendaTypeDot, { backgroundColor: tone }]} />
                      </View>
                      <View style={styles.agendaBody}>
                        <Text
                          style={[
                            styles.agendaTitle,
                            { color: colors.text, fontFamily, fontSize: 14 * fontScale },
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <View style={styles.agendaMetaRow}>
                          <ThemedIcon
                            name={isMeeting ? 'calendar' : 'tasks'}
                            size={11}
                            color={colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.agendaMetaText,
                              { color: colors.textMuted, fontFamily, fontSize: 11 * fontScale },
                            ]}
                            numberOfLines={1}
                          >
                            {isMeeting ? 'Meeting' : 'Deliverable due'}
                            {item.location ? ` - ${item.location}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Team Pulse ──────────────────────────────────────────
               Compact modern strip: three equal tiles (leave / upcoming /
               attendance). Always visible when cockpit content loads; zeros
               render muted so the row stays stable day-to-day.
             */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale, marginBottom: 12 },
              ]}
            >
              TEAM PULSE
            </Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => {
                onCardTap('team_pulse');
                navigation.navigate('More', { screen: 'TeamLeave' });
              }}
              style={[
                styles.pulseCompactOuter,
                shadows.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: skin.cardRadius,
                  borderWidth: skin.cardBorderWidth,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.pulseCompactRow}>
                <View
                  style={[
                    styles.pulseMiniCell,
                    {
                      backgroundColor: colors.info + '12',
                      borderColor: colors.info + '28',
                    },
                  ]}
                >
                  <ThemedIcon name="leave" size={15} color={colors.info} />
                  <Text
                    style={[
                      styles.pulseMiniValue,
                      {
                        color: teamPulse.onLeaveToday > 0 ? colors.info : colors.textMuted,
                        fontFamily,
                        fontSize: 22 * fontScale,
                      },
                    ]}
                  >
                    {teamPulse.onLeaveToday}
                  </Text>
                  <Text
                    style={[styles.pulseMiniCaption, { color: colors.textSecondary, fontFamily, fontSize: 10 * fontScale }]}
                    numberOfLines={2}
                  >
                    On leave{'\n'}today
                  </Text>
                </View>
                <View
                  style={[
                    styles.pulseMiniCell,
                    {
                      backgroundColor: colors.warning + '12',
                      borderColor: colors.warning + '28',
                    },
                  ]}
                >
                  <ThemedIcon name="calendar" size={15} color={colors.warning} />
                  <Text
                    style={[
                      styles.pulseMiniValue,
                      {
                        color: teamPulse.onLeaveUpcoming > 0 ? colors.warning : colors.textMuted,
                        fontFamily,
                        fontSize: 22 * fontScale,
                      },
                    ]}
                  >
                    {teamPulse.onLeaveUpcoming}
                  </Text>
                  <Text
                    style={[styles.pulseMiniCaption, { color: colors.textSecondary, fontFamily, fontSize: 10 * fontScale }]}
                    numberOfLines={2}
                  >
                    Upcoming{'\n'}7 days
                  </Text>
                </View>
                <View
                  style={[
                    styles.pulseMiniCell,
                    {
                      backgroundColor: colors.danger + '12',
                      borderColor: colors.danger + '28',
                    },
                  ]}
                >
                  <ThemedIcon name="attendance" size={15} color={colors.danger} />
                  <Text
                    style={[
                      styles.pulseMiniValue,
                      {
                        color: teamPulse.attendanceFlagged > 0 ? colors.danger : colors.textMuted,
                        fontFamily,
                        fontSize: 22 * fontScale,
                      },
                    ]}
                  >
                    {teamPulse.attendanceFlagged}
                  </Text>
                  <Text
                    style={[styles.pulseMiniCaption, { color: colors.textSecondary, fontFamily, fontSize: 10 * fontScale }]}
                    numberOfLines={2}
                  >
                    Attendance{'\n'}flagged
                  </Text>
                </View>
              </View>
              {teamPulse.onLeaveToday === 0 &&
                teamPulse.onLeaveUpcoming === 0 &&
                teamPulse.attendanceFlagged === 0 && (
                  <Text
                    style={[
                      styles.pulseAllClear,
                      { color: colors.success, fontFamily, fontSize: 11 * fontScale },
                    ]}
                  >
                    Full coverage — no leave or attendance alerts
                  </Text>
                )}
            </TouchableOpacity>
          </View>

          {/* ── Latest News ───────────────────────────────────────────
             * Mirrors HomeGovSoftLayout for consistency. The earlier card
             * here passed `params: { id: ... }` to NewsDetail and rendered
             * no image - both bugs caused the user-reported "no data
             * available" detail page and "missing images". The detail
             * screen expects `params: { newsId: ... }`.
             */}
          {m.news.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.textSecondary, fontFamily, fontSize: 12 * fontScale },
                  ]}
                >
                  LATEST NEWS
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('More', { screen: 'News' })}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primary, fontSize: 13 * fontScale, fontWeight: '700', fontFamily }}>
                    View all
                  </Text>
                </TouchableOpacity>
              </View>
              {m.news.slice(0, 3).map((n: any, idx: number) => {
                const cat = n.category ?? 'News';
                const strip = accentChromaKey(colors, skin, String(cat));
                const coverUrl = resolveHomeNewsCoverUrl(n);
                const newsId = n.id ?? n.newsId ?? n.ID;
                return (
                  <TouchableOpacity
                    key={String(newsId ?? idx)}
                    style={[
                      {
                        marginBottom: 12,
                        backgroundColor: colors.card,
                        borderRadius: skin.cardRadius,
                        overflow: 'hidden',
                        borderWidth: skin.cardBorderWidth,
                        borderColor: colors.border,
                      },
                      shadows.card,
                    ]}
                    onPress={() => {
                      onCardTap('news');
                      navigation.navigate('More', {
                        screen: 'NewsDetail',
                        params: { newsId },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ height: 140, backgroundColor: strip, position: 'relative' }}>
                      {coverUrl ? (
                        <AuthedImage
                          source={{ uri: coverUrl }}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <ThemedIcon name="tabNews" size={36} color="rgba(255,255,255,0.6)" />
                        </View>
                      )}
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: '800',
                            letterSpacing: 0.6,
                            textTransform: 'uppercase',
                            fontFamily,
                          }}
                        >
                          {cat}
                        </Text>
                      </View>
                    </View>
                    <View style={{ padding: 14 }}>
                      <Text
                        style={[styles.newsTitle, { color: colors.text, fontFamily, fontSize: 15 * fontScale }]}
                        numberOfLines={2}
                      >
                        {n.title ?? n.Title}
                      </Text>
                      <Text style={[styles.newsDate, { color: colors.textMuted, fontFamily, fontSize: 12 * fontScale }]}>
                        {n.publishedDate ?? n.publishDate ?? n.date ?? ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
          )}
        </QueryStates>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 40,
    paddingBottom: 22,
  },
  heroContent: { gap: 2 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  personaBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  personaBadgeText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.4 },
  heroName: { fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  heroRole: { color: 'rgba(255,255,255,0.85)' },
  lastUpdated: { color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  section: { marginTop: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginLeft: 4 },
  card: { padding: 16, marginBottom: 12 },
  approvalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  approvalCountRow: { flexDirection: 'row', alignItems: 'center' },
  approvalCount: { fontWeight: '800' },
  approvalLabel: { fontWeight: '500', marginTop: 2 },
  oldestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  oldestText: { fontWeight: '600' },
  moduleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontWeight: '600' },
  kpiCard: { marginBottom: 12 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  kpiName: { fontWeight: '700', lineHeight: 20 },
  kpiStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  kpiStat: { alignItems: 'center' },
  statValue: { fontWeight: '800' },
  statLabel: { fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  pulseCompactOuter: { padding: 12 },
  pulseCompactRow: { flexDirection: 'row', gap: 8 },
  pulseMiniCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  pulseMiniValue: { fontWeight: '800', lineHeight: 26 },
  pulseMiniCaption: { fontWeight: '700', textAlign: 'center', lineHeight: 13, letterSpacing: 0.2 },
  pulseAllClear: { marginTop: 10, textAlign: 'center', fontWeight: '600' },
  briefingCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 10,
    alignItems: 'flex-start',
  },
  briefingIconWrap: { paddingTop: 2 },
  briefingText: { flex: 1, lineHeight: 20, fontWeight: '500' },
  newsTitle: { fontWeight: '600', marginBottom: 6 },
  newsDate: { fontWeight: '400' },
  errorMsg: { marginTop: 8, lineHeight: 18 },

  // ── Quick Actions strip ─────────────────────────────────────────────
  quickActionsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 6,
  },
  quickActionTile: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // ── Today's Agenda card ──────────────────────────────────────────────
  agendaRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  agendaTimeCol: {
    width: 64,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  agendaTimeText: { fontWeight: '700' },
  agendaTypeDot: { width: 6, height: 6, borderRadius: 3 },
  agendaBody: { flex: 1, justifyContent: 'center', gap: 4 },
  agendaTitle: { fontWeight: '600', lineHeight: 19 },
  agendaMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agendaMetaText: { fontWeight: '500' },

  // ── Ranking card ─────────────────────────────────────────────────────
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankBadge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: { fontWeight: '900', lineHeight: 24 },
  rankOf: { fontWeight: '600', marginTop: 2 },
  rankBody: { flex: 1, gap: 6 },
  rankScope: { fontWeight: '700', lineHeight: 19 },
  rankMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  quartilePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  quartileText: { fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  rankPerf: { fontWeight: '600' },

  // ── Annual Goal Tracking ─────────────────────────────────────────────
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  goalTitle: { fontWeight: '800' },
  goalSubtitle: { fontWeight: '500', marginTop: 2 },
  goalStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  goalStatusText: { fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  goalRowLabel: { fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  goalRowValue: { fontWeight: '800' },
  goalBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 4 },
});

export default HomeExecutiveCockpit;
