import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';

// Full-fidelity parameters for /api/v1/tasks/hub — one-to-one with the web
// portal's filter bar (hub.ascx). Everything is optional on the client;
// server-side defaults mirror `hub.ascx` (TaskAction=1 WaitingForMyAction,
// TaskStatus=0 All, EndDate=today+1m, all modules selected).
export type TaskHubQueryParams = {
  lang?: string;
  taskAction?: number;               // 0/1/2/3/9/11/12
  taskStatus?: number;               // 0/4/5/6/7/8/80
  priority?: number | null;          // kept for parity; mobile UI hides this
  startDate?: string | null;         // YYYY-MM-DD
  endDate?: string | null;           // YYYY-MM-DD
  csvFeedSource?: string | null;     // CSV of FeedSourceUIDs; empty/null = all
  csvAssignedBy?: string | null;
  csvAssignedTo?: string | null;
  search?: string | null;
  recordTypes?: string | null;       // e.g. 'T' or 'T,L'
  maxRows?: number;
};

const toQS = (params: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'string' && v.length === 0) return;
    p.set(k, String(v));
  });
  const s = p.toString();
  return s.length ? `?${s}` : '';
};

export const taskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTasks: builder.query<any, { status?: number; year?: number } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params && params.status != null) p.set('status', String(params.status));
        if (params && params.year != null) p.set('year', String(params.year));
        return `/tasks/my?${p}`;
      },
      providesTags: ['Tasks'],
    }),

    // Full-fidelity task hub (parity with /taskmgmt/index.aspx). Filters are
    // applied server-side by SMARTSCAD_BETA.dbo.GetUserHub via the wrapper
    // SP [SmartSCADMobile].[Mobile].[spMobile_Tasks_GetHub].
    getTaskHub: builder.query<any, TaskHubQueryParams | void>({
      query: (p) => `/tasks/hub${toQS(p ?? {})}`,
      providesTags: ['Tasks'],
    }),

    // Metadata for the filter bar: { permissions, modules, taskActions,
    // taskStatuses, priorities }.
    getTaskHubFilters: builder.query<any, string | void>({
      query: (lang) => `/tasks/hub/filters${lang ? `?lang=${lang}` : ''}`,
    }),
    getInProgressTasks: builder.query<any, void>({ query: () => '/tasks/in-progress', providesTags: ['Tasks'] }),
    getTaskDetail: builder.query<any, string>({ query: (id) => `/tasks/${id}`, providesTags: ['Tasks'] }),
    /** v2-style bundle: detail, team, history, documents. */
    getTaskFull: builder.query<any, string>({
      query: (id) => `/tasks/${encodeURIComponent(id)}/full`,
      providesTags: ['Tasks'],
    }),
    getTaskHistory: builder.query<any, string>({ query: (id) => `/tasks/${id}/history` }),
    getTaskDashboard: builder.query<any, number | void>({
      query: (year) => `/tasks/dashboard${year ? `?year=${year}` : ''}`,
      providesTags: ['Tasks'],
    }),
    getWaitingForMyAction: builder.query<any, void>({ query: () => '/tasks/waiting', providesTags: ['Tasks'] }),
    getTaskGroups: builder.query<any, void>({ query: () => '/tasks/groups' }),
    getPriorities: builder.query<any, void>({ query: () => '/tasks/priorities' }),
    // Mirrors UAT rules in AssignTask.aspx — returns
    //   { permissions:{canAssign,isManager,isBypass,isDelegate},
    //     onBehalfOf:[{userId,displayName,isSelf}],
    //     reportees:[{userId,displayName,jobTitle,department,managerId}] }
    getTaskAssignmentOptions: builder.query<any, string | void>({
      query: (lang) => `/tasks/assignment-options${lang ? `?lang=${lang}` : ''}`,
    }),
    createTask: builder.mutation<any, any>({
      query: (body) => ({ url: '/tasks/create', method: 'POST', body }),
      invalidatesTags: ['Tasks'],
    }),
    performTaskAction: builder.mutation<any, { taskId: string; body: any }>({
      query: ({ taskId, body }) => ({ url: `/tasks/${taskId}/action`, method: 'POST', body }),
      invalidatesTags: ['Tasks'],
    }),
    uploadTaskDocument: builder.mutation<
      any,
      { taskId: string; file: PickedUploadFile }
    >({
      query: ({ taskId, file }) => {
        const form = new FormData();
        appendFileToFormData(form, 'file', file);
        return {
          url: `/tasks/${encodeURIComponent(taskId)}/document`,
          method: 'POST',
          body: form,
        };
      },
      invalidatesTags: ['Tasks'],
    }),
  }),
});

export const {
  useGetMyTasksQuery, useGetInProgressTasksQuery, useGetTaskDetailQuery, useGetTaskFullQuery,
  useGetTaskHistoryQuery, useGetTaskDashboardQuery, useGetWaitingForMyActionQuery,
  useGetTaskGroupsQuery, useGetPrioritiesQuery, useCreateTaskMutation,
  usePerformTaskActionMutation, useGetTaskAssignmentOptionsQuery,
  useGetTaskHubQuery, useGetTaskHubFiltersQuery,
  useUploadTaskDocumentMutation,
} = taskApi;
