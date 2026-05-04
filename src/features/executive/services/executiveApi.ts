import { baseApi } from '../../../store/baseApi';

export type BriefingSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface ApprovalsHeader {
  total: number;
  oldestWaiting: string | null;
  trendDelta: number;
}

export interface ApprovalModule {
  module: string;
  count: number;
  icon: string;
}

export interface KpiScope {
  scopeId: string;
  scopeName: string;
  performance: number;
  assigned: number;
  completed: number;
  delayed: number;
  overdue: number;
  inProgress: number;
  rejected: number;
  performanceTrend: number;
}

export interface TeamPulse {
  onLeaveToday: number;
  onLeaveUpcoming: number;
  attendanceFlagged: number;
}

export interface BriefingItem {
  bullet: string;
  severity: BriefingSeverity;
}

export interface TrendData {
  metric: string;
  day0: number;
  day1: number;
  day2: number;
  day3: number;
  day4: number;
  day5: number;
  day6: number;
}

export type AgendaKind = 'meeting' | 'task_due';

export interface AgendaItem {
  title: string;
  startTime: string | null;
  endTime: string | null;
  organizer: string;
  location: string;
  kind: AgendaKind;
}

export type RankingQuartile = 'top' | 'upper' | 'lower' | 'bottom' | '';

export interface RankingItem {
  scopeId: string;
  scopeName: string;
  performance: number;
  rank: number;
  totalScopes: number;
  quartile: RankingQuartile;
}

export type GoalStatus = 'ahead' | 'ontrack' | 'behind' | '';

export interface AnnualGoal {
  yearProgress: number;
  currentPerformance: number;
  targetPerformance: number;
  gap: number;
  status: GoalStatus;
  daysRemaining: number;
}

export interface ExecCockpitResponse {
  approvals: ApprovalsHeader[];
  approvalsByModule: ApprovalModule[];
  kpis: KpiScope[];
  teamPulse: TeamPulse[];
  briefing: BriefingItem[];
  trends: TrendData[];
  todaysAgenda: AgendaItem[];
  ranking: RankingItem[];
  annualGoal: AnnualGoal[];
}

export interface CockpitTrackEvent {
  eventName: string;
  section?: string;
  metadata?: string;
}

export const executiveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExecCockpit: builder.query<ExecCockpitResponse, void>({
      query: () => '/executive/cockpit',
      providesTags: ['Executive'],
      // Cache the cockpit for 2 minutes — it's expensive (calls GetPerformance per
      // scope) but the data doesn't change minute-to-minute. Pull-to-refresh
      // forces a refetch via refetch().
      keepUnusedDataFor: 120,
    }),

    trackCockpitEvent: builder.mutation<{ success: boolean }, CockpitTrackEvent>({
      query: (body) => ({
        url: '/executive/cockpit/track',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetExecCockpitQuery,
  useTrackCockpitEventMutation,
} = executiveApi;
