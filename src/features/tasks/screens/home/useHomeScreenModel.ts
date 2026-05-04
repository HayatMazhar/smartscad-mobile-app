import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../app/theme/ThemeContext';
import { useAppSelector } from '../../../../store/store';
import { useGetTaskDashboardQuery, useGetWaitingForMyActionQuery } from '../../services/taskApi';
import { useGetApprovalsInboxQuery } from '../../../approvals/services/approvalsApi';
import { useGetLeaveSummaryQuery } from '../../../leave/services/leaveApi';
import { useGetNotificationsQuery } from '../../../notifications/services/notificationApi';
import { useGetTopServicesQuery } from '../../../tickets/services/ticketApi';
import {
  useGetNewsQuery,
  useGetAnnouncementsQuery,
  useGetEventsQuery,
  useGetOffersQuery,
  useGetVideoGalleriesQuery,
  useGetSaahemLeaderboardRecentQuery,
} from '../../../portal/services/portalApi';
import { useGetScadStarWinnersQuery, useGetProfileQuery } from '../../../hr/services/hrApi';
import { asArray, asObject, parseSaahemLeaderboardPayload } from '../../../../shared/utils/apiNormalize';
import { getHeroLayout } from '../../utils/homeHeroDynamic';
import { useGetTodayAttendanceQuery } from '../../../attendance/services/attendanceApi';
import type { GreetingState, HomeScreenModel } from './homeModelTypes';

export type { HomeScreenModel, GreetingState } from './homeModelTypes';

function defaultSaahemQuarter(): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

export function useHomeScreenModel(navigation: HomeScreenModel['navigation']): HomeScreenModel {
  const { t } = useTranslation();
  const { colors, shadows, fontFamily, fontScale, skin } = useTheme();
  const { homeHeroSize, homeSections: hs } = useAppSelector((s) => s.uiPreferences);
  const isLargeHero = homeHeroSize === 'large';
  const heroL = useMemo(() => getHeroLayout(homeHeroSize), [homeHeroSize]);
  const user = useAppSelector((s) => s.auth.user);
  const currentYear = new Date().getFullYear();
  const [perfYear, setPerfYear] = useState(currentYear);
  const { width: WW } = useWindowDimensions();
  const qaColumns = WW >= 900 ? 6 : WW >= 600 ? 5 : 4;
  const qaGap = 10;
  const qaHPadding = 16;
  const qaCardWidth = Math.max(72, Math.floor((Math.min(WW, 720) - qaHPadding * 2 - qaGap * (qaColumns - 1)) / qaColumns));

  const { data: attendance, refetch: rAtt, isFetching: fAtt, isLoading: lAtt } = useGetTodayAttendanceQuery();
  const { data: taskDash, refetch: rTasks, isFetching: fDash, isLoading: lDash } = useGetTaskDashboardQuery(perfYear);
  const { data: leaveSummary, refetch: rLeaveSum, isFetching: fLeaveSum, isLoading: lLeaveSum } =
    useGetLeaveSummaryQuery();
  const { data: rawNotifs, refetch: rNotifs, isFetching: fNotifs, isLoading: lNotifs } = useGetNotificationsQuery();
  const { data: rawTopSvcs, refetch: rTopSvcs, isFetching: fTopSvcs, isLoading: lTopSvcs } = useGetTopServicesQuery();
  const { data: rawWaiting, refetch: rWaiting } = useGetWaitingForMyActionQuery();
  const { refetch: rAppr } = useGetApprovalsInboxQuery({ take: 1 });
  const { data: rawNews, refetch: rNews, isFetching: fNews, isLoading: lNews } = useGetNewsQuery();
  const { data: rawAnnouncements, refetch: rAnn } = useGetAnnouncementsQuery();
  const { data: rawEvents, refetch: rEvents } = useGetEventsQuery();
  const { data: rawOffers, refetch: rOffers } = useGetOffersQuery();
  const { data: rawVideos, refetch: rVideos } = useGetVideoGalleriesQuery();
  const { data: rawWinners, refetch: rWinners } = useGetScadStarWinnersQuery(undefined);
  const { data: rawSaahem, refetch: rSaahem, isFetching: fSaahem, isLoading: lSaahem } =
    useGetSaahemLeaderboardRecentQuery(undefined, {
      skip: !hs.saahemLeaderboard.visible,
    });
  const { data: rawProfile } = useGetProfileQuery();
  const profile = asObject<any>(rawProfile) ?? (rawProfile as any);
  const heroName = profile?.displayName || profile?.name || user?.displayName || 'Employee';
  const heroRole = profile?.jobTitle || profile?.designation || profile?.department || user?.jobTitle || user?.department || 'SCAD Employee';

  const dash = asObject<Record<string, number>>(taskDash) ?? (taskDash as Record<string, number> | undefined);
  const notifs = asArray<any>(rawNotifs);
  const unreadNotifs = notifs.filter((n: any) => !(n.isRead ?? n.isSeen));
  const topServices = asArray<any>(rawTopSvcs);
  const waitingItems = asArray<any>(rawWaiting);
  const news = asArray<any>(rawNews);
  const announcements = asArray<any>(rawAnnouncements);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const events = asArray<any>(rawEvents).filter((e: any) => {
    if (e?.isPast === true) return false;
    const sd = e?.startDate ?? e?.StartDate;
    if (!sd) return true;
    const time = new Date(sd).getTime();
    return Number.isFinite(time) ? time >= todayMs : true;
  });
  const offers = asArray<any>(rawOffers);
  const videos = asArray<any>(rawVideos);
  const winners = asArray<any>(rawWinners);
  const { saahemRows, saahemPeriodLabel, saahemSubtitle } = useMemo(() => {
    const parsed = parseSaahemLeaderboardPayload(rawSaahem);
    const rows = (parsed.leaders as any[]) ?? [];
    const m = parsed.meta;
    const y = m?.resolvedYear ?? m?.ResolvedYear;
    const q = m?.resolvedQuarter ?? m?.ResolvedQuarter;
    const lastIso = m?.lastContribution ?? m?.LastContribution;
    const lastDate = lastIso ? new Date(String(lastIso)) : null;
    const lastValid = lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate : null;

    const fallbackQ = defaultSaahemQuarter();
    const fallbackY = new Date().getFullYear();

    let label: string;
    if (y != null && q != null && String(q).trim() !== '') {
      label = t('home.saahemPeriodLabel', '{{q}} {{y}}', { q: String(q), y: Number(y) });
    } else if (lastValid) {
      label = lastValid.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } else {
      label = t('home.saahemPeriodLabel', '{{q}} {{y}}', { q: fallbackQ, y: fallbackY });
    }

    const subtitle =
      y != null && q != null && String(q).trim() !== ''
        ? t('home.saahemPeriodContributors', '{{period}} · top contributors', { period: label })
        : t('home.saahemRecentContributors', 'Top recent contributors');
    return { saahemRows: rows, saahemPeriodLabel: label, saahemSubtitle: subtitle };
  }, [rawSaahem, t]);

  const leaveSummaryArr = asArray<any>(leaveSummary);
  const leaveSummaryObj = asObject<any>(leaveSummary) ?? (leaveSummary as any);
  const totalDaysTaken =
    leaveSummaryObj?.totalDaysTaken ??
    leaveSummaryArr.reduce((s, r) => s + (Number(r?.daysCount ?? r?.DaysCount ?? r?.taken ?? 0) || 0), 0);
  const pendingRequests =
    leaveSummaryObj?.pendingRequests ??
    leaveSummaryArr.reduce((s, r) => s + (Number(r?.pendingCount ?? r?.PendingCount ?? 0) || 0), 0);
  const hasUpcomingLeave =
    !!leaveSummaryObj?.upcomingLeave?.type ||
    !!leaveSummaryObj?.upcomingLeaveType ||
    !!leaveSummaryObj?.upcomingStartDate ||
    leaveSummaryArr.some((r: any) => r?.hasUpcoming === true || r?.HasUpcoming === true);

  const anyHomeFetching =
    fAtt || fDash || fLeaveSum || fNotifs || fTopSvcs || fNews || (hs.saahemLeaderboard.visible && fSaahem);
  const anyHomeInitialLoading =
    lAtt || lDash || lLeaveSum || lNotifs || lTopSvcs || lNews || (hs.saahemLeaderboard.visible && lSaahem);
  const refreshing = anyHomeFetching && !anyHomeInitialLoading;
  const [portalTab, setPortalTab] = useState<'news' | 'announcements' | 'events' | 'offers' | 'videos'>('news');
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (!isLargeHero) return undefined;
    const id = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(id);
  }, [isLargeHero]);

  const greeting: GreetingState = useMemo(() => {
    const h = new Date().getHours();
    const text = h < 12 ? t('common.goodMorning') : h < 17 ? t('common.goodAfternoon') : t('common.goodEvening');
    if (skin.heroGreeting === 'emoji') {
      const emoji = h < 12 ? '☀️' : h < 17 ? '🌤️' : '🌙';
      return { kind: 'emoji', text, emoji };
    }
    if (skin.heroGreeting === 'text') {
      return { kind: 'text', text };
    }
    const icon = h < 12 ? 'greetingSun' : h < 17 ? 'greetingDay' : 'greetingMoon';
    return { kind: 'icon', text, icon };
  }, [t, skin.heroGreeting]);

  const dateStr = isLargeHero
    ? clock.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const timeStr = isLargeHero ? clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  const inTime = attendance?.inTime ?? null;
  const outTime = attendance?.outTime ?? null;
  const attStatus = attendance?.status ?? '';

  const onRefresh = () => {
    void rAtt();
    void rTasks();
    void rLeaveSum();
    void rNotifs();
    void rTopSvcs();
    void rNews();
    void rAnn();
    void rEvents();
    void rOffers();
    void rVideos();
    void rWinners();
    void rWaiting();
    void rAppr();
    if (hs.saahemLeaderboard.visible) void rSaahem();
  };

  const total = dash?.total ?? 0;
  const completed = dash?.completed ?? 0;
  const delayed = dash?.delayed ?? 0;
  const overdue = dash?.overdue ?? 0;
  const inProgress = dash?.inProgress ?? 0;

  const chartData = useMemo(
    () => [
      { label: 'Completed', val: completed, color: skin.performanceDonut === 'tonal' ? colors.success : '#00C800' },
      { label: 'In Progress', val: inProgress, color: colors.primary },
      { label: 'Overdue', val: overdue, color: skin.performanceDonut === 'tonal' ? colors.danger : '#F76161' },
      { label: 'Delayed', val: delayed, color: skin.performanceDonut === 'tonal' ? colors.warning : '#F9BA53' },
    ],
    [completed, inProgress, overdue, delayed, skin.performanceDonut, colors],
  );

  const denom = total - (inProgress - overdue);
  const completionRate = denom > 0 ? Math.min(100, Math.max(0, Math.round(((completed - delayed) / denom) * 100))) : 0;
  const completionPctColor = useMemo(() => {
    if (skin.performanceDonut === 'tonal') {
      if (completionRate >= 80) return colors.success;
      if (completionRate >= 60) return colors.warning;
      return colors.danger;
    }
    if (completionRate >= 80) return '#00C800';
    if (completionRate >= 60) return '#F5C500';
    return '#F00000';
  }, [skin.performanceDonut, colors, completionRate]);

  const qaC = hs.quickAccess.variant === 'compact';
  const perfC = hs.performance.variant === 'compact';
  const waitC = hs.waitingForAction.variant === 'compact';
  const raiseC = hs.raiseRequest.variant === 'compact';
  const leaveC = hs.leaveSummary.variant === 'compact';
  const starC = hs.scadStar.variant === 'compact';
  const portC = hs.portal.variant === 'compact';
  const saahemC = hs.saahemLeaderboard.variant === 'compact';

  const smTop = (compact: boolean) => (compact ? 14 : 20);
  const secPad = (compact: boolean) => (compact ? 12 : 16);

  const secTitleStyle = useMemo(
    () => [
      {
        fontSize: 12 * fontScale,
        fontWeight: '800' as const,
        letterSpacing: skin.sectionTitleUppercase ? 1 : 0.3,
        textTransform: (skin.sectionTitleUppercase ? 'uppercase' : 'none') as 'uppercase' | 'none',
        color: colors.textSecondary,
        fontFamily,
        marginBottom: 12,
      },
    ],
    [colors.textSecondary, fontFamily, fontScale, skin.sectionTitleUppercase],
  );

  return {
    navigation,
    t,
    colors,
    shadows,
    fontFamily,
    fontScale,
    skin,
    user,
    homeSections: hs,
    isLargeHero,
    homeHeroSize,
    heroL,
    currentYear,
    perfYear,
    setPerfYear,
    qaCardWidth,
    heroName,
    heroRole,
    profile,
    attendance,
    taskDash: dash,
    leaveSummary,
    notifs,
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
    completed,
    delayed,
    overdue,
    inProgress,
    chartData,
    completionRate,
    completionPctColor,
    refreshing,
    onRefresh,
    portalTab,
    setPortalTab,
    clock,
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
    saahemC,
    smTop,
    secPad,
    secTitleStyle,
    rAtt,
    rTasks,
    rLeaveSum,
    rNotifs,
    rTopSvcs,
    rNews,
    rAnn,
    rEvents,
    rOffers,
    rVideos,
    rWinners,
    rWaiting,
    saahemRows,
    saahemLoading: fSaahem,
    saahemPeriodLabel,
    saahemSubtitle,
    rSaahem,
  };
}
