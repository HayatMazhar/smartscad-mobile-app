import { baseApi } from '../../../store/baseApi';

export type LeaveHistoryFilters = {
  startDate?: string;
  endDate?: string;
  leaveTypeIds?: string;
  leaveStatus?: string;
  lang?: string;
};

export type LeaveSubmitBody = {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  attendanceTypeId?: number;
  contactNumber?: string;
  reason?: string;
  filesCount?: number;
  recLog?: string;
  lang?: string;
};

export type LeaveActionBody = {
  currentApplicationStatus: number;
  actionApplicationStatus: number;
  comments?: string;
  lang?: string;
};

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const leaveSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetLeaveBalance: b.query<any[], { endDate?: string; lang?: string } | void>({
      query: (a) => `/svc/leave/balance${qs((a ?? {}) as any)}`,
      providesTags: ['LeaveSvc'],
    }),
    v2GetLeaveTypes: b.query<any[], string | void>({
      query: (lang) => `/svc/leave/types${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetLeaveCategories: b.query<any[], { leaveTypeId: number; lang?: string }>({
      query: ({ leaveTypeId, lang }) => `/svc/leave/types/${leaveTypeId}/categories${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetLeaveHistory: b.query<any[], LeaveHistoryFilters | void>({
      query: (f) => `/svc/leave/history${qs((f ?? {}) as any)}`,
      providesTags: ['LeaveSvc'],
    }),
    v2GetLeaveSummary: b.query<any[], LeaveHistoryFilters | void>({
      query: (f) => `/svc/leave/summary${qs((f ?? {}) as any)}`,
    }),
    v2GetLeaveSummaryV2: b.query<any, { leaveTypeId: number; startDate?: string; endDate?: string; lang?: string }>({
      query: (a) => `/svc/leave/summary-v2${qs(a as any)}`,
    }),
    v2GetLeaveQuota: b.query<any, { leaveTypeId: number; year?: number }>({
      query: (a) => `/svc/leave/quota${qs(a as any)}`,
    }),
    v2GetLeaveQuotaTypes: b.query<any[], string | void>({
      query: (lang) => `/svc/leave/quota-types${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetLeaveDetail: b.query<any, { leaveUid: string; lang?: string }>({
      query: ({ leaveUid, lang }) => `/svc/leave/${leaveUid}${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['LeaveSvc'],
    }),
    v2GetLeaveHistoryByUid: b.query<any[], { leaveUid: string; lang?: string }>({
      query: ({ leaveUid, lang }) => `/svc/leave/${leaveUid}/history${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetLeaveActions: b.query<any[], { leaveUid: string; lang?: string }>({
      query: ({ leaveUid, lang }) => `/svc/leave/${leaveUid}/actions${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetLeaveOverlap: b.query<any[], { startDate: string; endDate: string; lang?: string }>({
      query: (a) => `/svc/leave/overlap${qs(a as any)}`,
    }),
    v2GetMyEmployeesLeave: b.query<any[], string | void>({
      query: (lang) => `/svc/leave/my-employees${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetMyEmployeesLeaveBalance: b.query<any[], { users?: string; lang?: string } | void>({
      query: (a) => `/svc/leave/my-employees/balance${qs((a ?? {}) as any)}`,
    }),
    v2GetShortPersonalLeave: b.query<any[], { startDate: string; endDate: string; lang?: string }>({
      query: (a) => `/svc/leave/short-personal${qs(a as any)}`,
    }),

    v2SubmitLeave: b.mutation<any, LeaveSubmitBody>({
      query: (body) => ({ url: '/svc/leave/submit', method: 'POST', body }),
      invalidatesTags: ['LeaveSvc'],
    }),
    v2SubmitLeaveAction: b.mutation<any, { leaveUid: string; body: LeaveActionBody }>({
      query: ({ leaveUid, body }) => ({ url: `/svc/leave/${leaveUid}/submit-action`, method: 'POST', body }),
      invalidatesTags: ['LeaveSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetLeaveBalanceQuery,
  useV2GetLeaveTypesQuery,
  useV2GetLeaveCategoriesQuery,
  useV2GetLeaveHistoryQuery,
  useV2GetLeaveSummaryQuery,
  useV2GetLeaveSummaryV2Query,
  useV2GetLeaveQuotaQuery,
  useV2GetLeaveQuotaTypesQuery,
  useV2GetLeaveDetailQuery,
  useV2GetLeaveHistoryByUidQuery,
  useV2GetLeaveActionsQuery,
  useV2GetLeaveOverlapQuery,
  useV2GetMyEmployeesLeaveQuery,
  useV2GetMyEmployeesLeaveBalanceQuery,
  useV2GetShortPersonalLeaveQuery,
  useV2SubmitLeaveMutation,
  useV2SubmitLeaveActionMutation,
} = leaveSvcApi;
