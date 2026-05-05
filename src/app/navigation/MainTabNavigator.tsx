import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { EventArg } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useLoadRights } from '../../shared/rights';
import { store, useAppSelector } from '../../store/store';
import ThemedIcon from '../../shared/components/ThemedIcon';
import ModernHeader from '../../shared/components/ModernHeader';
import type { SemanticIconName } from '../theme/semanticIcons';
import {
  loadAccountsExpenditureScreen,
  loadAiChatScreen,
  loadAnnouncementDetailScreen,
  loadAnnouncementsScreen,
  loadApprovalDetailScreen,
  loadApprovalsInboxScreen,
  loadAppraisalScreen,
  loadAttendanceScreen,
  loadAttendanceTeamGridScreen,
  loadCashFlowDetailScreen,
  loadCashFlowListScreen,
  loadCircularsScreen,
  loadCreateTaskScreen,
  loadDesignSettingsScreen,
  loadDirectoryScreen,
  loadEmployeeDetailScreen,
  loadEpmIssueCreateScreen,
  loadEpmMilestoneCreateScreen,
  loadEpmMilestoneDetailScreen,
  loadEpmMilestoneEditScreen,
  loadEpmRiskCreateScreen,
  loadEpmTaskCreateScreen,
  loadEpmTaskDetailScreen,
  loadEpmTaskEditScreen,
  loadEpmTaskRequestChangeScreen,
  loadEventDetailScreen,
  loadEventsScreen,
  loadExecutiveDashboardScreen,
  loadFaqsScreen,
  loadFinanceDashboardScreen,
  loadGalleryScreen,
  loadHomeScreen,
  loadIncidentReportScreen,
  loadKpisListScreen,
  loadLeaveBalanceScreen,
  loadLeaveDetailScreen,
  loadLeaveHistoryScreen,
  loadLeaveRequestScreen,
  loadMonthlyCardScreen,
  loadMoreMenuScreen,
  loadMyDashboardScreen,
  loadNewsDetailScreen,
  loadNewsScreen,
  loadNotificationsScreen,
  loadObjectivesListScreen,
  loadOfferDetailScreen,
  loadOffersScreen,
  loadOrgChartScreen,
  loadPmsActivityEditScreen,
  loadPmsDeliverableApproveScreen,
  loadPmsDeliverableEditScreen,
  loadPmsDeliverableRejectScreen,
  loadPmsHubScreen,
  loadPmsKpiApproveScreen,
  loadPmsKpiDetailScreen,
  loadPmsKpiEnterResultScreen,
  loadPmsKpiRevokeScreen,
  loadPmsObjectiveDetailApproveScreen,
  loadPmsObjectiveDetailHeaderScreen,
  loadPmsObjectiveDetailRevokeScreen,
  loadPmsObjectiveDetailScreen,
  loadPmsStrategyDetailScreen,
  loadProfileScreen,
  loadProgramsListScreen,
  loadProjectDetailScreen,
  loadProjectListScreen,
  loadRecognitionScreen,
  loadServicesListScreen,
  loadServiceCatalogScreen,
  loadSubmitTicketScreen,
  loadSurveyResponseScreen,
  loadTaskDetailScreen,
  loadTaskListScreen,
  loadTeamLeaveScreen,
  loadTicketDetailScreen,
  loadTicketListScreen,
  loadTrainingScreen,
  loadVideoDetailScreen,
  loadWinnerDetailScreen,
} from './lazyFeatureScreens';
import { useGetApprovalsInboxQuery } from '../../features/approvals/services/approvalsApi';
import { fallbackStackHeaderLeft } from './stackFallbackBack';
import { resolveDashboardRoute, shouldOmitDashboardTab } from './resolveDashboardRoute';
import { PlatformPressable } from '@react-navigation/elements';
import haptics from '../../shared/utils/haptics';

const tabBarTestId =
  (testID: string) =>
  (props: React.ComponentProps<typeof PlatformPressable>) =>
    <PlatformPressable {...props} testID={testID} />;

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const TicketStack = createNativeStackNavigator();
const ApprovalsStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

/** Dashboard tab root — matches {@link DashboardStackNavigator} initialRouteName. */
function dashboardRootScreenName(): string {
  return resolveDashboardRoute(store.getState().auth.user);
}

/**
 * Root route name inside each tab's nested stack — for "tap same tab again → pop to root".
 * Omitting Dashboard here: resolved via persona (see dashboardRootScreenName).
 */
const TAB_ROOT_SCREEN: Record<string, string> = {
  Home: 'HomeScreen',
  Approvals: 'ApprovalsInbox',
  Sanadkom: 'TicketList',
  More: 'MoreMenu',
};

function tabRootScreenName(tabName: string): string {
  if (tabName === 'Dashboard') return dashboardRootScreenName();
  return TAB_ROOT_SCREEN[tabName] ?? '';
}

const TabIcon: React.FC<{ name: SemanticIconName; focused: boolean; color: string }> = ({ name, focused, color }) => {
  const { skin } = useTheme();
  const line = skin.iconPresentation === 'vector';
  const size = skin.tabIconSize;
  return (
    <View style={styles.tabIconWrap}>
      <ThemedIcon name={name} size={size} color={color} filled={line && focused} />
      {skin.tabBarShowDot && focused ? <View style={[styles.tabDot, { backgroundColor: color }]} /> : null}
    </View>
  );
};

/**
 * Platform-tuned stack screen defaults:
 *   iOS    → Apple-native large titles (collapse to compact on scroll), opaque
 *            surface header, brand-tinted chevron, "minimal" back display
 *            (chevron only — no parent screen label). Matches modern iOS HIG.
 *   Android → custom `ModernHeader` (compact, theme-aware, chevron-only back).
 *
 * Individual screens can still override `headerLargeTitle`, `headerTitle`,
 * `header` etc. on a per-route basis. Examples already in use:
 *   - `headerShown: false` (HomeScreen root, WinnerDetail)
 *   - `headerLargeTitle: false` for screens that should keep a compact bar.
 *
 * NOTE on translucency: we deliberately keep the iOS header opaque here
 * because `headerTransparent + headerBlurEffect` would push content under
 * the header and require every ScrollView/FlatList to set
 * `contentInsetAdjustmentBehavior="automatic"`. We can opt-in to the
 * translucent blur per-screen later if desired.
 */
const defaultScreenOptions = (colors: any) => {
  if (Platform.OS === 'ios') {
    return {
      headerLargeTitle: true,
      headerLargeTitleShadowVisible: false,
      headerShadowVisible: false,
      headerTintColor: colors.primary,
      headerStyle: { backgroundColor: colors.surface },
      headerLargeStyle: { backgroundColor: colors.background },
      headerLargeTitleStyle: {
        fontSize: 32,
        fontWeight: '800' as const,
        color: colors.text,
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '700' as const,
        color: colors.text,
      },
      headerBackButtonDisplayMode: 'minimal' as const,
      contentStyle: { backgroundColor: colors.background },
    };
  }
  return {
    header: (props: React.ComponentProps<typeof ModernHeader>) => <ModernHeader {...props} />,
  };
};

const HomeStackNavigator = () => {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={defaultScreenOptions(colors)}>
      <HomeStack.Screen name="HomeScreen" getComponent={loadHomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="Notifications"
        getComponent={loadNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </HomeStack.Navigator>
  );
};

const TicketStackNavigator = () => {
  const { colors } = useTheme();
  return (
    <TicketStack.Navigator
      screenOptions={(args) => ({
        ...defaultScreenOptions(colors),
        ...fallbackStackHeaderLeft('TicketList')(args),
      })}
    >
      <TicketStack.Screen name="TicketList" getComponent={loadTicketListScreen} options={{ title: 'Sanadkom' }} />
      <TicketStack.Screen name="TicketDetail" getComponent={loadTicketDetailScreen} options={{ title: 'Request Detail' }} />
      <TicketStack.Screen name="ServiceCatalog" getComponent={loadServiceCatalogScreen} options={{ title: 'Service Catalog' }} />
      <TicketStack.Screen name="SubmitTicket" getComponent={loadSubmitTicketScreen} options={{ title: 'Submit Request' }} />
    </TicketStack.Navigator>
  );
};

const ApprovalsStackNavigator = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <ApprovalsStack.Navigator
      screenOptions={(args) => ({
        ...defaultScreenOptions(colors),
        ...fallbackStackHeaderLeft('ApprovalsInbox')(args),
      })}
    >
      <ApprovalsStack.Screen
        name="ApprovalsInbox"
        getComponent={loadApprovalsInboxScreen}
        options={{ title: t('approvals.inbox.title', 'Approvals') }}
      />
      <ApprovalsStack.Screen
        name="ApprovalDetail"
        getComponent={loadApprovalDetailScreen}
        options={{ title: t('approvals.detail.title', 'Review') }}
      />
      <ApprovalsStack.Screen
        name="SurveyResponse"
        getComponent={loadSurveyResponseScreen}
        options={{ title: t('approvals.biSurvey.title', 'Survey') }}
      />
    </ApprovalsStack.Navigator>
  );
};

const DashboardStackNavigator = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const initialDashboard = resolveDashboardRoute(user);

  return (
    <DashboardStack.Navigator
      initialRouteName={initialDashboard}
      screenOptions={(args) => ({
        ...defaultScreenOptions(colors),
        ...fallbackStackHeaderLeft(initialDashboard)(args),
      })}
    >
      <DashboardStack.Screen
        name="MyDashboard"
        getComponent={loadMyDashboardScreen}
        options={{ title: t('myDashboard.title', 'My Dashboard') }}
      />
      <DashboardStack.Screen
        name="ExecutiveDashboard"
        getComponent={loadExecutiveDashboardScreen}
        options={{ title: t('dashboard.title', 'Executive Dashboard') }}
      />
    </DashboardStack.Navigator>
  );
};

function popTabToRootOnReselect(
  navigation: { getState: () => unknown; navigate: (name: string, params?: { screen: string }) => void },
  tabName: string,
  e: EventArg<'tabPress', true>,
) {
  // Light selection tap on every tab press (iOS-only via util).
  haptics.selectionTap();
  const rootScreen = tabRootScreenName(tabName);
  if (!rootScreen) return;
  const st = navigation.getState() as {
    index: number;
    routes: Array<{ name: string; state?: { index?: number; routes?: { name?: string }[] } }>;
  };
  const active = st.routes[st.index];
  if (active?.name !== tabName) return;
  const nested = active.state;
  if (!nested?.routes?.length) return;
  const idx = nested.index ?? 0;
  const currentName = nested.routes[idx]?.name;
  const atRoot = idx === 0 && currentName === rootScreen;
  if (atRoot) return;
  e.preventDefault();
  navigation.navigate(tabName, { screen: rootScreen });
}

const MoreStackNavigator = () => {
  const { colors } = useTheme();
  return (
    <MoreStack.Navigator
      screenOptions={(args) => ({
        ...defaultScreenOptions(colors),
        ...fallbackStackHeaderLeft('MoreMenu')(args),
      })}
    >
      <MoreStack.Screen name="MoreMenu" getComponent={loadMoreMenuScreen} options={{ title: 'More' }} />
      <MoreStack.Screen
        name="DesignSettings"
        getComponent={loadDesignSettingsScreen}
        options={{ title: 'Design & appearance' }}
      />
      <MoreStack.Screen name="TaskList" getComponent={loadTaskListScreen} options={{ title: 'My Tasks' }} />
      <MoreStack.Screen name="TaskDetail" getComponent={loadTaskDetailScreen} options={{ title: 'Task Detail' }} />
      <MoreStack.Screen name="CreateTask" getComponent={loadCreateTaskScreen} options={{ title: 'Create Task' }} />
      <MoreStack.Screen name="LeaveBalance" getComponent={loadLeaveBalanceScreen} options={{ title: 'Leave Balance' }} />
      <MoreStack.Screen name="LeaveHistory" getComponent={loadLeaveHistoryScreen} options={{ title: 'Leave History' }} />
      <MoreStack.Screen name="LeaveDetail" getComponent={loadLeaveDetailScreen} options={{ title: 'Leave Detail' }} />
      <MoreStack.Screen name="LeaveRequest" getComponent={loadLeaveRequestScreen} options={{ title: 'Request Leave' }} />
      <MoreStack.Screen name="Attendance" getComponent={loadAttendanceScreen} options={{ title: 'Attendance' }} />
      <MoreStack.Screen name="MonthlyCard" getComponent={loadMonthlyCardScreen} options={{ title: 'Monthly Card' }} />
      <MoreStack.Screen
        name="AttendanceTeamGrid"
        getComponent={loadAttendanceTeamGridScreen}
        options={{ title: 'Team Attendance' }}
      />
      <MoreStack.Screen name="IncidentReport" getComponent={loadIncidentReportScreen} options={{ title: 'Report Incident' }} />
      <MoreStack.Screen name="FinanceDashboard" getComponent={loadFinanceDashboardScreen} options={{ title: 'Finance' }} />
      <MoreStack.Screen name="CashFlowList" getComponent={loadCashFlowListScreen} options={{ title: 'Cash Flows' }} />
      <MoreStack.Screen name="CashFlowDetail" getComponent={loadCashFlowDetailScreen} options={{ title: 'Cash Flow' }} />
      <MoreStack.Screen
        name="AccountsExpenditure"
        getComponent={loadAccountsExpenditureScreen}
        options={{ title: 'Accounts Expenditure' }}
      />
      <MoreStack.Screen name="Profile" getComponent={loadProfileScreen} options={{ title: 'My Profile' }} />
      <MoreStack.Screen name="Directory" getComponent={loadDirectoryScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="EmployeeDetail" getComponent={loadEmployeeDetailScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="OrgChart" getComponent={loadOrgChartScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Recognition" getComponent={loadRecognitionScreen} options={{ title: 'SCAD Star Awards' }} />
      <MoreStack.Screen name="ProjectList" getComponent={loadProjectListScreen} options={{ title: 'Projects' }} />
      <MoreStack.Screen name="ProjectDetail" getComponent={loadProjectDetailScreen} options={{ title: 'Project' }} />
      <MoreStack.Screen name="EpmTaskDetail" getComponent={loadEpmTaskDetailScreen} options={{ title: 'Task Detail' }} />
      <MoreStack.Screen name="EpmTaskCreate" getComponent={loadEpmTaskCreateScreen} options={{ title: 'New Task' }} />
      <MoreStack.Screen name="EpmTaskEdit" getComponent={loadEpmTaskEditScreen} options={{ title: 'Edit Task' }} />
      <MoreStack.Screen
        name="EpmTaskRequestChange"
        getComponent={loadEpmTaskRequestChangeScreen}
        options={{ title: 'Request Change' }}
      />
      <MoreStack.Screen
        name="EpmMilestoneDetail"
        getComponent={loadEpmMilestoneDetailScreen}
        options={{ title: 'Milestone Detail' }}
      />
      <MoreStack.Screen
        name="EpmMilestoneEdit"
        getComponent={loadEpmMilestoneEditScreen}
        options={{ title: 'Edit Milestone' }}
      />
      <MoreStack.Screen
        name="EpmMilestoneCreate"
        getComponent={loadEpmMilestoneCreateScreen}
        options={{ title: 'New Milestone' }}
      />
      <MoreStack.Screen name="EpmRiskCreate" getComponent={loadEpmRiskCreateScreen} options={{ title: 'Add Risk' }} />
      <MoreStack.Screen name="EpmIssueCreate" getComponent={loadEpmIssueCreateScreen} options={{ title: 'Log Issue' }} />
      <MoreStack.Screen
        name="PmsHub"
        getComponent={loadPmsHubScreen}
        options={{ title: 'Strategic Performance Management' }}
      />
      <MoreStack.Screen name="PmsObjectivesList" getComponent={loadObjectivesListScreen} options={{ title: 'Objectives' }} />
      <MoreStack.Screen name="PmsServicesList" getComponent={loadServicesListScreen} options={{ title: 'Main Services' }} />
      <MoreStack.Screen name="PmsProgramsList" getComponent={loadProgramsListScreen} options={{ title: 'Programs' }} />
      <MoreStack.Screen name="PmsKpisList" getComponent={loadKpisListScreen} options={{ title: 'KPIs' }} />
      <MoreStack.Screen
        name="PmsStrategyDetail"
        getComponent={loadPmsStrategyDetailScreen}
        options={({ route }: any) => ({ title: route?.params?.name ? String(route.params.name) : 'Strategy' })}
      />
      <MoreStack.Screen
        name="PmsObjectiveDetail"
        getComponent={loadPmsObjectiveDetailScreen}
        options={({ route }: any) => ({ title: route?.params?.name ? String(route.params.name) : 'Objective' })}
      />
      <MoreStack.Screen
        name="PmsObjectiveDetailHeader"
        getComponent={loadPmsObjectiveDetailHeaderScreen}
        options={({ route }: any) => ({
          title: route?.params?.name
            ? String(route.params.name)
            : route?.params?.kind === 'programs'
              ? 'Program'
              : 'Service',
        })}
      />
      <MoreStack.Screen
        name="PmsKpiDetail"
        getComponent={loadPmsKpiDetailScreen}
        options={({ route }: any) => ({ title: route?.params?.name ? String(route.params.name) : 'KPI' })}
      />
      <MoreStack.Screen name="PmsKpiApprove" getComponent={loadPmsKpiApproveScreen} options={{ title: 'Approve KPI' }} />
      <MoreStack.Screen name="PmsKpiRevoke" getComponent={loadPmsKpiRevokeScreen} options={{ title: 'Revoke Approval' }} />
      <MoreStack.Screen
        name="PmsKpiEnterResult"
        getComponent={loadPmsKpiEnterResultScreen}
        options={{ title: 'Enter KPI Result' }}
      />
      <MoreStack.Screen
        name="PmsObjectiveDetailApprove"
        getComponent={loadPmsObjectiveDetailApproveScreen}
        options={{ title: 'Approve Service / Program' }}
      />
      <MoreStack.Screen
        name="PmsObjectiveDetailRevoke"
        getComponent={loadPmsObjectiveDetailRevokeScreen}
        options={{ title: 'Revoke Approval' }}
      />
      <MoreStack.Screen name="PmsActivityEdit" getComponent={loadPmsActivityEditScreen} options={{ title: 'Activity' }} />
      <MoreStack.Screen
        name="PmsDeliverableEdit"
        getComponent={loadPmsDeliverableEditScreen}
        options={{ title: 'Deliverable' }}
      />
      <MoreStack.Screen
        name="PmsDeliverableApprove"
        getComponent={loadPmsDeliverableApproveScreen}
        options={{ title: 'Approve Deliverable' }}
      />
      <MoreStack.Screen
        name="PmsDeliverableReject"
        getComponent={loadPmsDeliverableRejectScreen}
        options={{ title: 'Reject Deliverable' }}
      />
      <MoreStack.Screen name="Objectives" getComponent={loadPmsHubScreen} options={{ title: 'Strategic Performance Management' }} />
      <MoreStack.Screen name="KPIs" getComponent={loadKpisListScreen} options={{ title: 'KPIs' }} />
      <MoreStack.Screen name="News" getComponent={loadNewsScreen} options={{ title: 'News' }} />
      <MoreStack.Screen name="NewsDetail" getComponent={loadNewsDetailScreen} options={{ title: 'Article' }} />
      <MoreStack.Screen name="Events" getComponent={loadEventsScreen} options={{ title: 'Calendar events' }} />
      <MoreStack.Screen name="EventDetail" getComponent={loadEventDetailScreen} options={{ title: 'Event' }} />
      <MoreStack.Screen name="Announcements" getComponent={loadAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <MoreStack.Screen name="Circulars" getComponent={loadCircularsScreen} options={{ title: 'Circulars' }} />
      <MoreStack.Screen name="FAQs" getComponent={loadFaqsScreen} options={{ title: 'FAQs' }} />
      <MoreStack.Screen name="Offers" getComponent={loadOffersScreen} options={{ title: 'Offers' }} />
      <MoreStack.Screen name="Gallery" getComponent={loadGalleryScreen} options={{ title: 'Videos' }} />
      <MoreStack.Screen
        name="AnnouncementDetail"
        getComponent={loadAnnouncementDetailScreen}
        options={{ title: 'Announcement' }}
      />
      <MoreStack.Screen name="OfferDetail" getComponent={loadOfferDetailScreen} options={{ title: 'Offer' }} />
      <MoreStack.Screen name="VideoDetail" getComponent={loadVideoDetailScreen} options={{ title: 'Video' }} />
      <MoreStack.Screen name="Appraisal" getComponent={loadAppraisalScreen} options={{ title: 'Performance Appraisal' }} />
      <MoreStack.Screen name="Training" getComponent={loadTrainingScreen} options={{ title: 'Training' }} />
      <MoreStack.Screen name="TeamLeave" getComponent={loadTeamLeaveScreen} options={{ title: 'Team Leave' }} />
      <MoreStack.Screen name="WinnerDetail" getComponent={loadWinnerDetailScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="AIChat" getComponent={loadAiChatScreen} options={{ title: 'AI Assistant' }} />
      <MoreStack.Screen name="Notifications" getComponent={loadNotificationsScreen} options={{ title: 'Notifications' }} />
    </MoreStack.Navigator>
  );
};

const MainTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors, fontFamily, fontScale } = useTheme();
  const { data: apprInbox } = useGetApprovalsInboxQuery({ take: 1 });
  const inboxTotal = ((apprInbox as { summary?: { total?: number } } | undefined)?.summary?.total as number | undefined) ?? 0;
  const badge = inboxTotal > 0 ? (inboxTotal > 99 ? '99+' : String(inboxTotal)) : undefined;

  const isExecutive = useAppSelector((s) => s.auth.user?.isExecutive ?? false);
  const user = useAppSelector((s) => s.auth.user);
  const omitDashboardTab = shouldOmitDashboardTab(user);

  useLoadRights();

  return (
    <Tab.Navigator
      initialRouteName={isExecutive ? 'Approvals' : 'Home'}
      screenOptions={{
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: StyleSheet.flatten([
          styles.tabLabel,
          { fontSize: 11 * fontScale, lineHeight: 14 * fontScale, fontFamily },
        ]),
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.divider }],
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarButton: tabBarTestId('tab_bar_home'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) =>
            popTabToRootOnReselect(navigation, route.name, e),
        })}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsStackNavigator}
        options={{
          tabBarLabel: t('tabs.approvals', 'Approvals'),
          tabBarButton: tabBarTestId('tab_bar_approvals'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="hourglass" focused={focused} color={color} />,
          tabBarBadge: badge,
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) =>
            popTabToRootOnReselect(navigation, route.name, e),
        })}
      />
      {!omitDashboardTab && (
        <Tab.Screen
          name="Dashboard"
          component={DashboardStackNavigator}
          options={{
            tabBarLabel: t('tabs.dashboard', 'Dashboard'),
            tabBarButton: tabBarTestId('tab_bar_dashboard'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="chart" focused={focused} color={color} />,
          }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) =>
              popTabToRootOnReselect(navigation, route.name, e),
          })}
        />
      )}
      {!isExecutive && (
        <Tab.Screen
          name="Sanadkom"
          component={TicketStackNavigator}
          options={{
            tabBarLabel: t('tabs.services'),
            tabBarButton: tabBarTestId('tab_bar_sanadkom'),
            tabBarIcon: ({ focused, color }) => <TabIcon name="services" focused={focused} color={color} />,
          }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) =>
              popTabToRootOnReselect(navigation, route.name, e),
          })}
        />
      )}
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          tabBarLabel: t('tabs.more'),
          tabBarButton: tabBarTestId('tab_bar_more'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="tabMore" focused={focused} color={color} />,
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) =>
            popTabToRootOnReselect(navigation, route.name, e),
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 92 : 74,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 14,
    includeFontPadding: false,
  },
  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 20, lineHeight: 24 },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});

export default MainTabNavigator;
