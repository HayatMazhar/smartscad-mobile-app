import { baseApi } from '../../../store/baseApi';

// Shapes intentionally loose (any) to match unwrapped SP row shapes; the server
// returns whatever columns the underlying SQL emits. Screens do the narrow typing.
export type TaskHubFilters = {
  priority?: number;
  taskStatus?: number;
  taskAction?: number; // 1=WaitingForMyAction, 3=AssignedToMe, etc.
  startDate?: string;
  endDate?: string;
  feedSources?: string; // csv
  assignedBy?: string;  // csv
  assignedTo?: string;  // csv
  sector?: number;
  department?: number;
  section?: number;
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  lang?: string;
};

export type SubmitActionBody = {
  actionId: number;
  startDate?: string;
  endDate?: string;
  taskPercent?: number;
  comments?: string;
  taskDetail?: string;
  resourcesTo?: string;
  resourcesCc?: string;
  lang?: string;
};

export type AssignTaskBody = {
  taskName: string;
  taskDetail?: string;
  startDate: string;
  endDate: string;
  priorityId: number;
  taskCategoryId: number;
  taskGroupId?: number | null;
  projectUid?: string | null;
  durationHours: number;
  durationMinutes: number;
  assignedTo: string;
  assignedCc?: string;
  feedSourceUid?: string | null;
  sendEmail?: boolean;
};

export type CreateMyTaskBody = {
  taskName: string;
  taskDetail?: string;
  startDate: string;
  endDate: string;
  priorityId?: number;
  taskGroupId?: number | null;
  projectUid?: string | null;
  durationHours?: number;
  durationMinutes?: number;
  isCompleted?: boolean;
  feedSourceUid?: string | null;
};

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const taskSvcApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Reads ────────────────────────────────────────────────────────
    v2GetTaskHub: builder.query<any[], TaskHubFilters | void>({
      query: (f) => `/svc/tasks/hub${toQuery((f ?? {}) as any)}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetTaskDashboard: builder.query<any, number | void>({
      query: (year) => `/svc/tasks/dashboard${year ? `?year=${year}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetWaitingForMyAction: builder.query<any[], number | void>({
      query: (maxRows) => `/svc/tasks/waiting${maxRows ? `?maxRows=${maxRows}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetTaskNotifications: builder.query<any[], string | void>({
      query: (lang) => `/svc/tasks/notifications${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetTaskDetail: builder.query<any, { taskId: string; lang?: string }>({
      query: ({ taskId, lang }) => `/svc/tasks/${taskId}${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetTaskActions: builder.query<any[], { taskId: string; lang?: string }>({
      query: ({ taskId, lang }) => `/svc/tasks/${taskId}/actions${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetSubTaskStatus: builder.query<any, string>({
      query: (taskId) => `/svc/tasks/${taskId}/subtask-status`,
    }),
    v2GetReportingResources: builder.query<any[], { taskId?: string; directOnly?: boolean; includeMe?: boolean; lang?: string } | void>({
      query: (args) => `/svc/tasks/reporting-resources${toQuery((args ?? {}) as any)}`,
    }),
    v2GetOnBehalf: builder.query<any[], string | void>({
      query: (lang) => `/svc/tasks/on-behalf${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetPerformance: builder.query<any, number | void>({
      query: (year) => `/svc/tasks/performance${year ? `?year=${year}` : ''}`,
      providesTags: ['TasksSvc'],
    }),
    v2GetTaskGroups: builder.query<any[], string | void>({
      query: (lang) => `/svc/tasks/groups${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetTaskPriorities: builder.query<any[], string | void>({
      query: (lang) => `/svc/tasks/priorities${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetFeedSources: builder.query<any[], { mobileOnly?: boolean; lang?: string } | void>({
      query: (args) => `/svc/tasks/feed-sources${toQuery((args ?? {}) as any)}`,
    }),
    // ── Writes ───────────────────────────────────────────────────────
    v2AssignTask: builder.mutation<any, AssignTaskBody>({
      query: (body) => ({ url: '/svc/tasks/assign', method: 'POST', body }),
      invalidatesTags: ['TasksSvc'],
    }),
    v2CreateMyTask: builder.mutation<any, CreateMyTaskBody>({
      query: (body) => ({ url: '/svc/tasks/my', method: 'POST', body }),
      invalidatesTags: ['TasksSvc'],
    }),
    v2SubmitTaskAction: builder.mutation<any, { taskId: string; body: SubmitActionBody }>({
      query: ({ taskId, body }) => ({ url: `/svc/tasks/${taskId}/submit-action`, method: 'POST', body }),
      invalidatesTags: ['TasksSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetTaskHubQuery,
  useV2GetTaskDashboardQuery,
  useV2GetWaitingForMyActionQuery,
  useV2GetTaskNotificationsQuery,
  useV2GetTaskDetailQuery,
  useV2GetTaskActionsQuery,
  useV2GetSubTaskStatusQuery,
  useV2GetReportingResourcesQuery,
  useV2GetOnBehalfQuery,
  useV2GetPerformanceQuery,
  useV2GetTaskGroupsQuery,
  useV2GetTaskPrioritiesQuery,
  useV2GetFeedSourcesQuery,
  useV2AssignTaskMutation,
  useV2CreateMyTaskMutation,
  useV2SubmitTaskActionMutation,
} = taskSvcApi;
