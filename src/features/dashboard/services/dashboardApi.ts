import { baseApi } from '../../../store/baseApi';

// ── DTOs (mirror EnterpriseReadServiceV2.Dashboard.cs payload) ──────────

export interface DashboardUserFlags {
  isDirectorGeneral: boolean;
  isExecutiveDirector: boolean;
  isDirector: boolean;
  hasExplicitAccess: boolean;
}

export interface DashboardStrategicPerformance {
  strategicProjectsPerformance: number | null;
  strategicKpiPerformance: number | null;
  commonKpiPerformance: number | null;
  operationalKpiPerformance: number | null;
  budgetReadingYear?: number | null;
  budgetReadingMonth?: number | null;
  strategicBudget?: number;
  strategicPlannedBudget: number;
  strategicConsumedBudget: number;
  strategicVariance: number;
  operationalBudget?: number;
  operationalPlannedBudget: number;
  operationalConsumedBudget: number;
  operationalVariance: number;
  approvedBudget?: number;
  plannedBudget: number;
  consumedBudget: number;
  budgetPercentage: number;
}

export interface DashboardProject {
  id: number;
  name: string;
  sector: string;
  /** Present when the executive dashboard SP returns SectorID (used for scope filtering). */
  sectorId?: number | null;
  manager: string;
  startDate: string | null;
  endDate: string | null;
  performance: number | null;
  completion: number;
  relativeCompletion: number;
}

export interface DashboardKpiObjective {
  id: number;
  order: number;
  name: string;
  kpiCount: number;
  averagePerformance: number | null;
}

export interface DashboardStatisticalProduction {
  completedOnTime: number;
  inProgressOnTime: number;
  completedDelayed: number;
  inProgressDelayed: number;
  upcoming: number;
  overdue: number;
  totalCount: number;
  delayedCount: number;
  performance: number;
}

export interface DashboardSVProduction {
  statisticalVarsTotal: number;
  statisticalVarsPerformance: number;
  oposTotal: number;
  oposPerformance: number;
}

export interface DashboardOperationalSector {
  sectorId: number;
  sectorName: string;
  initiativesCount: number | null;
  initiativesInProgressCount: number | null;
  initiativesOverdueCount: number | null;
  initiativesPerformance: number | null;
  mainServicesCount: number | null;
  subServicesCount: number | null;
  subServicesInProgressCount: number | null;
  subServicesOverdueCount: number | null;
  subServicesPerformance: number | null;
  strategicPerformance: number;
  projectPerformance: number;
  overallPerformance: number;
}

export interface DashboardCRMService {
  id: number;
  name: string;
  openOnTime: number;
  openDelayed: number;
  closedOnTime: number;
  closedDelayed: number;
  inProgressCount: number;
  closedCount: number;
  delayedCount: number;
  totalCount: number;
  onTimePercentage: number;
}

export interface DashboardAuditByType {
  auditTypeID: number;
  auditTypeName: string;
  auditsCount: number;
}

export interface DashboardObservationCounts {
  implemented: number;
  inProgress: number;
  notImplemented: number;
  notApplicable: number;
  noStatus?: number;
  implementedToDate: number;
  totalToDate: number;
}

export interface DashboardActionPlanCounts {
  implemented: number;
  inProgress: number;
  notImplemented: number;
  notApplicable: number;
  implementedToDate: number;
  totalToDate: number;
}

export interface DashboardGovernance {
  auditsByType: DashboardAuditByType[];
  totalAudits: number;
  observationsTotal: number;
  observations: DashboardObservationCounts;
  actionPlansTotal: number;
  actionPlans: DashboardActionPlanCounts;
  risks: {
    count: number;
    noMajor: number;
    periodicMonitoring: number;
    continousReview: number;
    activeManagement: number;
  };
}

export interface DashboardFinanceChapter {
  chapterId: number;
  name: string;
  approvedBudget: number;
  plannedBudget: number;
  actualExpenditure: number;
  variancePct: number;
}

// Set 15: Cash flow / strategic budget projects (split by ProjectType on backend).
export interface DashboardFinanceProject {
  cashFlowId: number;
  projectId: number | null;
  accountId: number;
  accountName: string;
  chapterId: number;
  chapterName: string;
  manager: string;
  managerName: string;
  projectName: string;
  projectType: number;
  approveBudget: number;
  paidBudget: number;
  performance: number;
  variance: number | null;
}

// Set 17: Operational Plan project deliverables.
export interface DashboardDeliverable {
  id: number;
  projectId: number;
  deliverableName: string;
  projectName: string;
  description: string;
  deliverableStartDate: string | null;
  deliverableEndDate: string | null;
  manager: string;
  sectorId: number | null;
  sectorName: string;
  deliverablePerformance: number | null;
  deliverableCompletion: number;
  projectPerformance: number | null;
  projectCompletion: number;
  projectRelativeCompletion: number | null;
  isApproved: boolean;
}

export interface DashboardScope {
  sectorName?: string | null;
  departmentName?: string | null;
}

export interface ExecutiveDashboard {
  /** Present when the API returned a failure envelope (`success: false`) after HTTP 200. */
  success?: boolean;
  message?: string;
  year?: number;
  hasAccess?: boolean;
  /** Persona resolved server-side from spMobile_Auth_GetUserPersona. */
  persona?: string | null;
  /** Scope label resolved from the same persona row (used by the hero subtitle). */
  scope?: DashboardScope;
  /**
   * True for ED/DIRECTOR — org-wide modules (CRM, governance, enterprise finance rollups, publications)
   * are stripped so charts reflect only sector/department scope.
   */
  hideOrgWideModules?: boolean;
  /** True when any sector/department filter was applied (API or SP). */
  narrowScope?: boolean;
  scopeFilterActive?: boolean;
  /** Short human-readable scope line for the hero (e.g. department + sector count). */
  scopeSummary?: string | null;
  /** Set when the resolved persona is WORKER — client should navigate to MyDashboard. */
  redirectTo?: 'personal' | string;
  userFlags?: DashboardUserFlags;
  strategicPerformance?: DashboardStrategicPerformance;
  strategicProjects?: DashboardProject[];
  nonStrategicProjects?: DashboardProject[];
  kpiObjectives?: DashboardKpiObjective[];
  statisticalProduction?: DashboardStatisticalProduction;
  svProduction?: DashboardSVProduction;
  operationalSectors?: DashboardOperationalSector[];
  crmServices?: DashboardCRMService[];
  governance?: DashboardGovernance;
  finance?: DashboardFinanceChapter[];
  cashFlowProjects?: DashboardFinanceProject[];
  strategicBudgetProjects?: DashboardFinanceProject[];
  deliverables?: DashboardDeliverable[];
  sectionErrors?: string[] | null;
}

// ── Personal "MyDashboard" DTOs (mirror spMobile_v2_PersonalDashboard) ──

export interface PersonalPerformance {
  performance: number;
  assigned: number;
  completed: number;
  delayed: number;
  overdue: number;
  inprogress: number;
  rejected: number;
}

export interface PersonalLeaveType {
  leaveTypeId: number;
  name: string;
  quota: number;
  availed: number;
  remaining: number;
}

export interface PersonalPmsHub {
  objectiveCountMine: number;
  serviceCountMine: number;
  programCountMine: number;
  kpiCountMine: number;
}

export interface PersonalDeliverableCounts {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

export interface PersonalTicketCounts {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

export interface PersonalMonthlyPoint {
  month: number;
  performance: number;
  assigned: number;
  completed: number;
}

export interface PersonalDashboard {
  year: number;
  persona: 'WORKER' | string;
  performance: PersonalPerformance;
  leaveBalance: PersonalLeaveType[];
  pmsHub: PersonalPmsHub;
  deliverables: PersonalDeliverableCounts;
  tickets: PersonalTicketCounts;
  monthlyTrend: PersonalMonthlyPoint[];
  sectionErrors?: string[] | null;
}

/** Manager recursive report-line dashboard (Mobile.spMobile_v2_ManagerTeamDashboard). */
export interface ManagerTeamSummary {
  headcount: number;
  performance: number;
  assigned: number;
  completed: number;
  delayed: number;
  overdue: number;
  inprogress: number;
  rejected: number;
}

export interface ManagerTeamMemberTile {
  userId: string;
  name: string;
  nameAr: string;
  title: string;
  titleAr: string;
  level: number;
  performance: number;
  assigned: number;
  completed: number;
  delayed: number;
  overdue: number;
  inprogress: number;
  rejected: number;
}

export interface ManagerTeamDashboard {
  year: number;
  teamSummary: ManagerTeamSummary;
  teamMembers: ManagerTeamMemberTile[];
  monthlyTeamTrend: PersonalMonthlyPoint[];
  sectionErrors?: string[] | null;
}

// ── Endpoints ───────────────────────────────────────────────────────────

export const dashboardApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getExecutiveDashboard: builder.query<ExecutiveDashboard, { year?: number } | void>({
      query: (arg) => {
        const y = arg && 'year' in arg && arg.year ? `?year=${arg.year}` : '';
        return `/dashboard/executive${y}`;
      },
    }),
    getPersonalDashboard: builder.query<PersonalDashboard, { year?: number } | void>({
      query: (arg) => {
        const y = arg && 'year' in arg && arg.year ? `?year=${arg.year}` : '';
        return `/dashboard/personal${y}`;
      },
    }),
    getManagerTeamDashboard: builder.query<ManagerTeamDashboard, { year?: number } | void>({
      query: (arg) => {
        const y = arg && 'year' in arg && arg.year ? `?year=${arg.year}` : '';
        return `/dashboard/manager-team${y}`;
      },
    }),
  }),
});

export const {
  useGetExecutiveDashboardQuery,
  useGetPersonalDashboardQuery,
  useGetManagerTeamDashboardQuery,
} = dashboardApi;
