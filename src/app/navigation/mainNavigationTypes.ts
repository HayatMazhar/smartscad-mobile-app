import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Optional param bag reused by strategic / PMS screens (many overlaps). */
export type LoosePmsParams = {
  objectiveId?: number;
  strategyId?: number;
  objectiveDetailId?: number;
  mineOnly?: boolean;
  id?: number;
  name?: string;
  kind?: string;
  kpiId?: number;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  Notifications: undefined;
};

export type TicketStackParamList = {
  TicketList: undefined;
  TicketDetail: { ticketId: number };
  ServiceCatalog: undefined;
  SubmitTicket: { serviceId?: number; serviceName?: string } | undefined;
};

export type ApprovalsStackParamList = {
  ApprovalsInbox: { taskUid?: string } | undefined;
  ApprovalDetail: { itemId: string; preview?: unknown };
  SurveyResponse: { surveyLinkId: number };
};

export type DashboardStackParamList = {
  MyDashboard: undefined;
  ExecutiveDashboard: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  DesignSettings: undefined;
  TaskList: undefined;
  TaskDetail: { taskUid: string };
  CreateTask: undefined;
  LeaveBalance: undefined;
  LeaveHistory: undefined;
  LeaveDetail: { leaveId: string | number };
  LeaveRequest: undefined;
  Attendance: undefined;
  MonthlyCard: undefined;
  AttendanceTeamGrid: undefined;
  IncidentReport: undefined;
  FinanceDashboard: undefined;
  CashFlowList: { year?: number } | undefined;
  CashFlowDetail: { id: number | string };
  AccountsExpenditure: { year?: number } | undefined;
  Profile: undefined;
  Directory: undefined;
  EmployeeDetail: {
    userId?: string | number;
    name?: string;
    jobTitle?: string;
    department?: string;
  };
  OrgChart: undefined;
  Recognition: undefined;
  ProjectList: undefined;
  ProjectDetail: { projectId: number; initialSection?: string };
  EpmTaskDetail: { projectId: number; taskId: number };
  EpmTaskCreate: { projectId: number };
  EpmTaskEdit: { projectId: number; taskId: number };
  EpmTaskRequestChange: { projectId: number; taskId: number } | undefined;
  EpmMilestoneDetail: { projectId: number; milestoneId: number };
  EpmMilestoneEdit: { projectId: number; milestoneId: number } | undefined;
  EpmMilestoneCreate: { projectId: number };
  EpmRiskCreate: { projectId: number };
  EpmRiskEdit: { projectId: number; riskId: number };
  EpmIssueCreate: { projectId: number };
  PmsHub: undefined;
  PmsObjectivesList: LoosePmsParams | undefined;
  PmsServicesList: LoosePmsParams | undefined;
  PmsProgramsList: LoosePmsParams | undefined;
  PmsKpisList: LoosePmsParams | undefined;
  PmsStrategyDetail: LoosePmsParams | undefined;
  PmsObjectiveDetail: LoosePmsParams | undefined;
  PmsObjectiveDetailHeader: LoosePmsParams | undefined;
  PmsKpiDetail: LoosePmsParams | undefined;
  PmsKpiApprove: LoosePmsParams | undefined;
  PmsKpiRevoke: LoosePmsParams | undefined;
  PmsKpiEnterResult: LoosePmsParams | undefined;
  PmsObjectiveDetailApprove: LoosePmsParams | undefined;
  PmsObjectiveDetailRevoke: LoosePmsParams | undefined;
  PmsActivityEdit: LoosePmsParams | undefined;
  PmsDeliverableEdit: LoosePmsParams | undefined;
  PmsDeliverableApprove: LoosePmsParams | undefined;
  PmsDeliverableReject: LoosePmsParams | undefined;
  Objectives: undefined;
  KPIs: undefined;
  News: undefined;
  NewsDetail: { id?: number | string } | undefined;
  Events: undefined;
  EventDetail: { eventId?: number | string } | undefined;
  Announcements: undefined;
  Circulars: undefined;
  FAQs: undefined;
  Offers: undefined;
  Gallery: undefined;
  AnnouncementDetail: { id?: number | string } | undefined;
  OfferDetail: { id?: number | string } | undefined;
  VideoDetail: { id?: number | string } | undefined;
  Appraisal: undefined;
  Training: undefined;
  TeamLeave: undefined;
  WinnerDetail: { shortlistId: string | number };
  AIChat: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Approvals: NavigatorScreenParams<ApprovalsStackParamList>;
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  /** Hidden for executives; still valid for programmatic navigation typings. */
  Sanadkom: NavigatorScreenParams<TicketStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};

/** Tab navigator + dashboard stack leaf (personal dashboard). */
export type DashboardTabNavigation<
  RouteName extends keyof DashboardStackParamList = keyof DashboardStackParamList,
> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<DashboardStackParamList, RouteName>
>;

/** Tab navigator + approvals stack leaf. */
export type ApprovalsTabNavigation<
  RouteName extends keyof ApprovalsStackParamList = keyof ApprovalsStackParamList,
> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Approvals'>,
  NativeStackNavigationProp<ApprovalsStackParamList, RouteName>
>;

/** Tab navigator + More stack leaf (tasks, HR, portal, finance, EPM/PMS …). */
export type MoreTabNavigation<RouteName extends keyof MoreStackParamList = keyof MoreStackParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'More'>,
    NativeStackNavigationProp<MoreStackParamList, RouteName>
  >;
