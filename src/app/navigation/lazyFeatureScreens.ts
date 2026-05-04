import type { ComponentType } from 'react';

/** Passed to `<Stack.Screen getComponent={...} />` — Metro splits these into separate subgraphs vs one giant MainTabNavigator import. */
export type ScreenLoader = () => ComponentType<Record<string, unknown>>;

/** Core / Home stack */
export const loadHomeScreen: ScreenLoader =
  () => require('../../features/tasks/screens/HomeScreen').default;
export const loadNotificationsScreen: ScreenLoader =
  () => require('../../features/notifications/screens/NotificationsScreen').default;

/** Sanadkom (tickets) stack */
export const loadTicketListScreen: ScreenLoader =
  () => require('../../features/tickets/screens/TicketListScreen').default;
export const loadTicketDetailScreen: ScreenLoader =
  () => require('../../features/tickets/screens/TicketDetailScreen').default;
export const loadServiceCatalogScreen: ScreenLoader =
  () => require('../../features/tickets/screens/ServiceCatalogScreen').default;
export const loadSubmitTicketScreen: ScreenLoader =
  () => require('../../features/tickets/screens/SubmitTicketScreen').default;

/** Approvals stack */
export const loadApprovalsInboxScreen: ScreenLoader =
  () => require('../../features/approvals/screens/ApprovalsInboxScreen').default;
export const loadApprovalDetailScreen: ScreenLoader =
  () => require('../../features/approvals/screens/ApprovalDetailScreen').default;
export const loadSurveyResponseScreen: ScreenLoader =
  () => require('../../features/bi-surveys/screens/SurveyResponseScreen').default;

/** Dashboard stack */
export const loadExecutiveDashboardScreen: ScreenLoader =
  () => require('../../features/dashboard/screens/ExecutiveDashboardScreen').default;
export const loadMyDashboardScreen: ScreenLoader =
  () => require('../../features/dashboard/screens/MyDashboardScreen').default;

/** More — root & settings */
export const loadMoreMenuScreen: ScreenLoader =
  () => require('../../features/portal/screens/MoreScreen').default;
export const loadDesignSettingsScreen: ScreenLoader =
  () => require('../../features/settings/screens/DesignSettingsScreen').default;

/** Tasks (More stack) */
export const loadTaskListScreen: ScreenLoader =
  () => require('../../features/tasks/screens/TaskListScreen').default;
export const loadTaskDetailScreen: ScreenLoader =
  () => require('../../features/tasks/screens/TaskDetailScreen').default;
export const loadCreateTaskScreen: ScreenLoader =
  () => require('../../features/tasks/screens/CreateTaskScreen').default;

/** Leave */
export const loadLeaveBalanceScreen: ScreenLoader =
  () => require('../../features/leave/screens/LeaveBalanceScreen').default;
export const loadLeaveHistoryScreen: ScreenLoader =
  () => require('../../features/leave/screens/LeaveHistoryScreen').default;
export const loadLeaveDetailScreen: ScreenLoader =
  () => require('../../features/leave/screens/LeaveDetailScreen').default;
export const loadLeaveRequestScreen: ScreenLoader =
  () => require('../../features/leave/screens/LeaveRequestScreen').default;

/** Attendance */
export const loadAttendanceScreen: ScreenLoader =
  () => require('../../features/attendance/screens/AttendanceScreen').default;
export const loadMonthlyCardScreen: ScreenLoader =
  () => require('../../features/attendance/screens/MonthlyCardScreen').default;
export const loadAttendanceTeamGridScreen: ScreenLoader =
  () => require('../../features/attendance/screens/AttendanceTeamGridScreen').default;

/** Safety */
export const loadIncidentReportScreen: ScreenLoader =
  () => require('../../features/safety/screens/IncidentReportScreen').default;

/** Finance */
export const loadFinanceDashboardScreen: ScreenLoader =
  () => require('../../features/finance/screens/FinanceDashboardScreen').default;
export const loadCashFlowListScreen: ScreenLoader =
  () => require('../../features/finance/screens/CashFlowListScreen').default;
export const loadCashFlowDetailScreen: ScreenLoader =
  () => require('../../features/finance/screens/CashFlowDetailScreen').default;
export const loadAccountsExpenditureScreen: ScreenLoader =
  () => require('../../features/finance/screens/AccountsExpenditureScreen').default;

/** HR */
export const loadProfileScreen: ScreenLoader =
  () => require('../../features/hr/screens/ProfileScreen').default;
export const loadDirectoryScreen: ScreenLoader =
  () => require('../../features/hr/screens/DirectoryScreen').default;
export const loadEmployeeDetailScreen: ScreenLoader =
  () => require('../../features/hr/screens/EmployeeDetailScreen').default;
export const loadOrgChartScreen: ScreenLoader =
  () => require('../../features/hr/screens/OrgChartScreen').default;
export const loadRecognitionScreen: ScreenLoader =
  () => require('../../features/hr/screens/RecognitionScreen').default;

/** EPM */
export const loadProjectListScreen: ScreenLoader =
  () => require('../../features/epm/screens/ProjectListScreen').default;
export const loadProjectDetailScreen: ScreenLoader =
  () => require('../../features/epm/screens/ProjectDetailScreen').default;
export const loadEpmTaskDetailScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmTaskDetailScreen').default;
export const loadEpmTaskCreateScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmTaskCreateScreen').default;
export const loadEpmTaskEditScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmTaskEditScreen').default;
export const loadEpmTaskRequestChangeScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmTaskRequestChangeScreen').default;
export const loadEpmMilestoneDetailScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmMilestoneDetailScreen').default;
export const loadEpmMilestoneEditScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmMilestoneEditScreen').default;
export const loadEpmMilestoneCreateScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmMilestoneCreateScreen').default;
export const loadEpmRiskCreateScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmRiskCreateScreen').default;
export const loadEpmIssueCreateScreen: ScreenLoader =
  () => require('../../features/epm/screens/EpmIssueCreateScreen').default;

/** PMS */
export const loadPmsHubScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsHubScreen').default;
export const loadObjectivesListScreen: ScreenLoader =
  () => require('../../features/pms/screens/ObjectivesListScreen').default;
export const loadServicesListScreen: ScreenLoader =
  () => require('../../features/pms/screens/ObjectiveDetailListScreen').ServicesListScreen;
export const loadProgramsListScreen: ScreenLoader =
  () => require('../../features/pms/screens/ObjectiveDetailListScreen').ProgramsListScreen;
export const loadKpisListScreen: ScreenLoader =
  () => require('../../features/pms/screens/KpisListScreen').default;
export const loadPmsStrategyDetailScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsStrategyDetailScreen').default;
export const loadPmsObjectiveDetailScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsObjectiveDetailScreen').default;
export const loadPmsObjectiveDetailHeaderScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsObjectiveDetailHeaderScreen').default;
export const loadPmsKpiDetailScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsKpiDetailScreen').default;
export const loadPmsKpiApproveScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsKpiApproveScreen').default;
export const loadPmsKpiRevokeScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsKpiRevokeScreen').default;
export const loadPmsKpiEnterResultScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsKpiEnterResultScreen').default;
export const loadPmsObjectiveDetailApproveScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsObjectiveDetailApproveScreen').default;
export const loadPmsObjectiveDetailRevokeScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsObjectiveDetailRevokeScreen').default;
export const loadPmsActivityEditScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsActivityEditScreen').default;
export const loadPmsDeliverableEditScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsDeliverableEditScreen').default;
export const loadPmsDeliverableApproveScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsDeliverableApproveScreen').default;
export const loadPmsDeliverableRejectScreen: ScreenLoader =
  () => require('../../features/pms/screens/PmsDeliverableRejectScreen').default;

/** Portal */
export const loadNewsScreen: ScreenLoader =
  () => require('../../features/portal/screens/NewsScreen').default;
export const loadNewsDetailScreen: ScreenLoader =
  () => require('../../features/portal/screens/NewsDetailScreen').default;
export const loadEventsScreen: ScreenLoader =
  () => require('../../features/portal/screens/EventsScreen').default;
export const loadEventDetailScreen: ScreenLoader =
  () => require('../../features/portal/screens/EventDetailScreen').default;
export const loadAnnouncementsScreen: ScreenLoader =
  () => require('../../features/portal/screens/AnnouncementsScreen').default;
export const loadCircularsScreen: ScreenLoader =
  () => require('../../features/portal/screens/CircularsScreen').default;
export const loadFaqsScreen: ScreenLoader =
  () => require('../../features/portal/screens/FAQsScreen').default;
export const loadOffersScreen: ScreenLoader =
  () => require('../../features/portal/screens/OffersScreen').default;
export const loadGalleryScreen: ScreenLoader =
  () => require('../../features/portal/screens/GalleryScreen').default;
export const loadAnnouncementDetailScreen: ScreenLoader =
  () => require('../../features/portal/screens/AnnouncementDetailScreen').default;
export const loadOfferDetailScreen: ScreenLoader =
  () => require('../../features/portal/screens/OfferDetailScreen').default;
export const loadVideoDetailScreen: ScreenLoader =
  () => require('../../features/portal/screens/VideoDetailScreen').default;

/** Appraisal & training */
export const loadAppraisalScreen: ScreenLoader =
  () => require('../../features/appraisal/screens/AppraisalScreen').default;
export const loadTrainingScreen: ScreenLoader =
  () => require('../../features/appraisal/screens/TrainingScreen').default;

/** Leave team */
export const loadTeamLeaveScreen: ScreenLoader =
  () => require('../../features/leave/screens/TeamLeaveScreen').default;

/** HR winner */
export const loadWinnerDetailScreen: ScreenLoader =
  () => require('../../features/hr/screens/WinnerDetailScreen').default;

/** AI */
export const loadAiChatScreen: ScreenLoader =
  () => require('../../features/ai/screens/AIChatScreen').default;
