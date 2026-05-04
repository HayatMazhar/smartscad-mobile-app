import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { DashboardTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../app/theme/ThemeContext';
import type { AppColors } from '../../../app/theme/colors';
import { useMyDashboardScreen } from '../hooks/useMyDashboardScreen';
import Donut from '../components/Donut';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';
import QueryStates from '../../../shared/components/QueryStates';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import { styles } from './myDashboardScreen.styles';
import {
  Card,
  SectionHeader,
  HeroSplitStat,
  Pill,
  MetricCard,
  LegendDot,
  LeaveRow,
} from './MyDashboardPrimitives';
import type { ManagerTeamMemberTile } from '../services/dashboardApi';
import MyDashboardSkeleton from '../components/MyDashboardSkeleton';

function chipAvatarBg(colors: AppColors, level: number): string {
  return (level ?? 1) <= 1 ? colors.primary : colors.info ?? colors.secondary;
}

/** Personal / manager SPA dashboard (`/dashboard/personal`) — WORKER + MANAGER. Composition only; data in `useMyDashboardScreen`. */
const MyDashboardScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const nav = useNavigation<DashboardTabNavigation<'MyDashboard'>>();
  const {
    t,
    year,
    setYear,
    yearChoices,
    greeting,
    firstName,
    linePoints,
    barGroups,
    teamLinePoints,
    teamBarGroups,
    teamData,
    isManager,
    i18n,
    data,
    isLoading,
    isFetching,
    error,
    onRefresh,
  } = useMyDashboardScreen();

  const ts = teamData?.teamSummary;
  const teamMembers = teamData?.teamMembers ?? [];
  const perf = !isManager ? data?.performance : undefined;
  const tix = !isManager ? data?.tickets : undefined;
  const leaves = !isManager ? data?.leaveBalance ?? [] : [];
  const heroGradient: [string, string, ...string[]] = [colors.secondary, colors.primary];

  const arUi = Boolean(i18n.language?.startsWith('ar'));

  const teamMemberDisplayName = (m: { name: string; nameAr: string; userId: string }) =>
    (arUi && m.nameAr ? m.nameAr : m.name) || m.userId;

  const teamMemberJobTitle = (m: { title: string; titleAr: string }) =>
    arUi && m.titleAr ? m.titleAr : m.title || '';

  const topTeamPerformers = useMemo((): ManagerTeamMemberTile[] => {
    if (!teamMembers.length) return [];
    return [...teamMembers]
      .sort((a, b) => {
        const dc = (b.completed ?? 0) - (a.completed ?? 0);
        if (dc !== 0) return dc;
        const dp = (b.performance ?? 0) - (a.performance ?? 0);
        if (dp !== 0) return dp;
        return (b.assigned ?? 0) - (a.assigned ?? 0);
      })
      .slice(0, 3);
  }, [teamMembers]);

  return (
    <QueryStates
      loading={isLoading}
      error={error}
      isRefreshing={isFetching}
      onRetry={onRefresh}
      errorTitle={t('myDashboard.error.title', 'Could not load your dashboard')}
      loadingTestID="screen.my_dashboard_loading"
      loadingFallback={<MyDashboardSkeleton isManager={isManager} />}
    >
      <ScrollView
        testID="screen.my_dashboard"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefresh} />}
      >
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={isManager ? styles.heroTeam : styles.heroWorker}
      >
        {isManager ? (
          <View>
            <Text style={styles.heroTeamTitle}>
              {t('myDashboard.teamHeaderTitle', 'Team dashboard')}
            </Text>
            <Text style={styles.heroTeamSub}>
              {t('myDashboard.teamHeaderSubtitle', 'Reporting line — workload and performance')}
            </Text>
          </View>
        ) : (
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>{greeting.toUpperCase()}</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {firstName} 👋
              </Text>
              <Text style={styles.heroSubtitle}>{t('myDashboard.subtitle', 'Your year at a glance.')}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.yearBadgeRow}>
        {yearChoices.map((y, idx) => {
          const selected = year === y;
          return (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.yearBadge,
                {
                  borderColor: selected ? colors.primary : colors.borderLight,
                  backgroundColor: selected ? colors.primaryLight : colors.card,
                  marginEnd: idx === yearChoices.length - 1 ? 0 : 8,
                },
              ]}
            >
              <Text style={[styles.yearBadgeText, { color: selected ? colors.primary : colors.text }]}>{y}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isManager && (
        <>
          <Card style={{ marginTop: 10 }}>
            <SectionHeader
              icon="👥"
              accent={colors.info ?? colors.primary}
              title={t('myDashboard.sections.teamRollup', 'My team')}
              subtitle={t(
                'myDashboard.sections.teamRollupSubShort',
                'Direct and indirect reports — task performance rolled up',
              )}
            />
            <View style={styles.heroCardRow}>
              <Donut
                value={ts?.performance ?? 0}
                size={108}
                thickness={12}
                color={colors.info ?? colors.primary}
                trackColor={colors.greyCard}
                bg={colors.card}
                textColor={colors.text}
              />
              <View style={styles.heroCardSide}>
                <Text style={[styles.heroCardLabel, { color: colors.textMuted }]}>
                  {t('myDashboard.team.headcount', 'Team size')} · {(ts?.headcount ?? teamMembers.length) || 0}
                </Text>
                <Text style={[styles.heroCardValue, { color: colors.text }]}>
                  {(ts?.performance ?? 0).toFixed(0)}
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>%</Text>
                </Text>
                <View style={styles.heroCardSplit}>
                  <HeroSplitStat
                    label={t('myDashboard.tiles.assigned', 'Assigned')}
                    value={ts?.assigned ?? 0}
                    tint={colors.primary}
                  />
                  <View style={[styles.heroCardSplitDivider, { backgroundColor: colors.divider }]} />
                  <HeroSplitStat
                    label={t('myDashboard.tiles.completed', 'Completed')}
                    value={ts?.completed ?? 0}
                    tint={colors.success}
                  />
                </View>
              </View>
            </View>
            <View style={[styles.pillStrip, { borderTopColor: colors.divider }]}>
              <Pill
                label={t('myDashboard.tiles.inProgress', 'In Progress')}
                value={ts?.inprogress ?? 0}
                tint={colors.warning}
              />
              <Pill
                label={t('myDashboard.tiles.overdue', 'Overdue')}
                value={ts?.overdue ?? 0}
                tint={colors.danger}
              />
              <Pill
                label={t('myDashboard.tiles.delayed', 'Delayed')}
                value={ts?.delayed ?? 0}
                tint={colors.info ?? colors.primary}
              />
              <Pill
                label={t('myDashboard.tiles.rejected', 'Rejected')}
                value={ts?.rejected ?? 0}
                tint={colors.danger}
              />
            </View>
          </Card>

          {topTeamPerformers.length > 0 && (
            <Card>
              <SectionHeader
                icon="🏅"
                accent={colors.success}
                title={t('myDashboard.team.topPerformersTitle', 'Top performers')}
                subtitle={t(
                  'myDashboard.team.topPerformersSub',
                  'Ranked by total completed (closed) tasks for the selected year',
                )}
              />
              {topTeamPerformers.map((m, index) => {
                const displayName = teamMemberDisplayName(m);
                const jobTitle = teamMemberJobTitle(m);
                const rank = index + 1;
                const rankTint =
                  rank === 1 ? colors.warning : rank === 2 ? (colors.info ?? colors.primary) : colors.textMuted;
                return (
                  <View
                    key={m.userId}
                    style={[
                      styles.topPerfRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                    ]}
                  >
                    <View style={[styles.topPerfRankBadge, { backgroundColor: `${rankTint}22`, borderColor: `${rankTint}44` }]}>
                      <Text style={[styles.topPerfRankText, { color: rankTint }]}>{rank}</Text>
                    </View>
                    <ProfileAvatar
                      userId={m.userId}
                      name={displayName}
                      size={42}
                      borderRadius={21}
                      backgroundColor={chipAvatarBg(colors, m.level ?? 1)}
                      fontSize={15}
                    />
                    <View style={styles.topPerfMiddle}>
                      <Text style={[styles.topPerfName, { color: colors.text }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      {jobTitle ? (
                        <Text style={[styles.topPerfTitle, { color: colors.textMuted }]} numberOfLines={1}>
                          {jobTitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.topPerfRight}>
                      <Text style={[styles.topPerfClosed, { color: colors.text }]}>{m.completed ?? 0}</Text>
                      <Text style={[styles.topPerfClosedLabel, { color: colors.textMuted }]}>
                        {t('myDashboard.team.topPerformersClosedLabel', 'closed')}
                      </Text>
                      <Text style={[styles.topPerfPctSmall, { color: colors.textMuted }]}>
                        {m.performance.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          <Card>
            <SectionHeader
              icon="📈"
              accent={colors.info ?? colors.primary}
              title={t('myDashboard.sections.teamWorkload', 'Team task activity')}
              subtitle={t(
                'myDashboard.sections.teamWorkloadSub',
                'Tasks linked to team members via primary assignee or task resources',
              )}
            />
            <LineChart points={teamLinePoints} color={colors.info ?? colors.primary} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.textMuted,
                marginBottom: 8,
                marginTop: 18,
                alignSelf: 'flex-start',
              }}
            >
              {t('myDashboard.sections.teamVolumeSub', 'Volume by month')}
            </Text>
            <BarChart groups={teamBarGroups} colorA={colors.primary} colorB={colors.success} />
            <View style={styles.legendRow}>
              <LegendDot color={colors.primary} label={t('myDashboard.tiles.assigned', 'Assigned')} />
              <LegendDot color={colors.success} label={t('myDashboard.tiles.completed', 'Completed')} />
            </View>
          </Card>

          <Card>
            <SectionHeader
              icon="📋"
              accent={colors.primary}
              title={t('myDashboard.sections.teamMembers', 'Reporting line')}
              subtitle={t('myDashboard.sections.teamMembersSub', 'Everyone under you in the directory')}
            />
            {teamMembers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('myDashboard.team.emptyReports', 'No employees are linked as reporting to you in the directory yet.')}
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  contentContainerStyle={styles.teamStripScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {teamMembers.map((m) => {
                    const displayName = teamMemberDisplayName(m);
                    const bg = chipAvatarBg(colors, m.level ?? 1);
                    return (
                      <View key={m.userId} style={styles.teamStripChip}>
                        <ProfileAvatar
                          userId={m.userId}
                          name={displayName}
                          size={52}
                          borderRadius={26}
                          backgroundColor={bg}
                          fontSize={18}
                        />
                        <Text style={[styles.teamStripName, { color: colors.text }]} numberOfLines={2}>
                          {displayName}
                        </Text>
                        <Text style={[styles.teamStripPct, { color: colors.textMuted }]}>
                          {m.performance.toFixed(0)}%
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <Text style={[styles.teamStripHint, { color: colors.textMuted }]}>
                  {t('myDashboard.team.reportingStripHint', 'Swipe sideways to see everyone · {{n}} people', {
                    n: teamMembers.length,
                  })}
                </Text>
              </>
            )}
          </Card>
        </>
      )}

      {!isManager && (
        <>
      <View
        style={[
          styles.heroCard,
          { marginTop: 12 },
          shadows.card,
          { backgroundColor: colors.card, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.heroCardRow}>
          <Donut
            value={perf?.performance ?? 0}
            size={120}
            thickness={13}
            color={colors.primary}
            trackColor={colors.greyCard}
            bg={colors.card}
            textColor={colors.text}
          />
          <View style={styles.heroCardSide}>
            <Text style={[styles.heroCardLabel, { color: colors.textMuted }]}>
              {t('myDashboard.tiles.performance', 'Performance')}
            </Text>
            <Text style={[styles.heroCardValue, { color: colors.text }]}>
              {(perf?.performance ?? 0).toFixed(0)}
              <Text style={{ fontSize: 18, color: colors.textMuted }}>%</Text>
            </Text>
            <View style={styles.heroCardSplit}>
              <HeroSplitStat
                label={t('myDashboard.tiles.assigned', 'Assigned')}
                value={perf?.assigned ?? 0}
                tint={colors.primary}
              />
              <View style={[styles.heroCardSplitDivider, { backgroundColor: colors.divider }]} />
              <HeroSplitStat
                label={t('myDashboard.tiles.completed', 'Completed')}
                value={perf?.completed ?? 0}
                tint={colors.success}
              />
            </View>
          </View>
        </View>

        <View style={[styles.pillStrip, { borderTopColor: colors.divider }]}>
          <Pill
            label={t('myDashboard.tiles.inProgress', 'In Progress')}
            value={perf?.inprogress ?? 0}
            tint={colors.warning}
          />
          <Pill
            label={t('myDashboard.tiles.overdue', 'Overdue')}
            value={perf?.overdue ?? 0}
            tint={colors.danger}
          />
          <Pill
            label={t('myDashboard.tiles.delayed', 'Delayed')}
            value={perf?.delayed ?? 0}
            tint={colors.info ?? colors.primary}
          />
          <Pill
            label={t('myDashboard.tiles.rejected', 'Rejected')}
            value={perf?.rejected ?? 0}
            tint={colors.danger}
          />
        </View>
      </View>

      <Card>
        <SectionHeader
          icon="📈"
          accent={colors.primary}
          title={t('myDashboard.sections.trend', 'Monthly performance')}
          subtitle={t('myDashboard.sections.trendSub', 'Performance % across the year')}
        />
        <LineChart points={linePoints} color={colors.primary} />
      </Card>

      <Card>
        <SectionHeader
          icon="📊"
          accent={colors.success}
          title={t('myDashboard.sections.assignedVsCompleted', 'Assigned vs Completed')}
          subtitle={t('myDashboard.sections.assignedVsCompletedSub', 'How much you finish each month')}
        />
        <BarChart groups={barGroups} colorA={colors.primary} colorB={colors.success} />
        <View style={styles.legendRow}>
          <LegendDot color={colors.primary} label={t('myDashboard.tiles.assigned', 'Assigned')} />
          <LegendDot color={colors.success} label={t('myDashboard.tiles.completed', 'Completed')} />
        </View>
      </Card>

      <Card>
        <SectionHeader
          icon="🎫"
          accent={colors.info ?? colors.primary}
          title={t('myDashboard.sections.myTickets', 'My Tickets')}
        />
        <View style={styles.metricGrid}>
          <MetricCard
            label={t('myDashboard.tiles.open', 'Open')}
            value={tix?.open ?? 0}
            tint={colors.primary}
            onPress={() => nav.navigate('Sanadkom', { screen: 'TicketList' })}
          />
          <MetricCard
            label={t('myDashboard.tiles.closed', 'Closed')}
            value={tix?.closed ?? 0}
            tint={colors.success}
            onPress={() => nav.navigate('Sanadkom', { screen: 'TicketList' })}
          />
          <MetricCard
            label={t('myDashboard.tiles.overdue', 'Overdue')}
            value={tix?.overdue ?? 0}
            tint={colors.danger}
            onPress={() => nav.navigate('Sanadkom', { screen: 'TicketList' })}
          />
          <MetricCard
            label={t('myDashboard.tiles.total', 'Total')}
            value={tix?.total ?? 0}
            tint={colors.textMuted}
            onPress={() => nav.navigate('Sanadkom', { screen: 'TicketList' })}
          />
        </View>
      </Card>

      {leaves.length > 0 && (
        <Card>
          <SectionHeader
            icon="🌴"
            accent={colors.warning}
            title={t('myDashboard.sections.leave', 'Leave Balance')}
            actionLabel={t('myDashboard.cta.requestLeave', 'Request leave')}
            onAction={() => nav.navigate('More', { screen: 'LeaveRequest' })}
          />
          {leaves.map((lv) => (
            <LeaveRow key={lv.leaveTypeId} leave={lv} />
          ))}
        </Card>
      )}
        </>
      )}

      </ScrollView>
    </QueryStates>
  );
};

export default MyDashboardScreen;
