import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeaveBalance: builder.query<any, { year?: number } | void>({
      query: (args) => {
        const y = args && 'year' in args && args.year ? args.year : undefined;
        return `/leave/balance${y ? `?year=${y}` : ''}`;
      },
      providesTags: ['Leave'],
    }),
    getLeaveHistory: builder.query<any, { year?: number } | void>({
      query: (args) => {
        const y = args && 'year' in args && args.year ? args.year : undefined;
        return `/leave/history${y ? `?year=${y}` : ''}`;
      },
      providesTags: ['Leave'],
    }),
    getLeaveTypes: builder.query<any, void>({ query: () => '/leave/types' }),
    getLeaveCategories: builder.query<any, number>({
      query: (typeId) => `/leave/categories?leaveTypeId=${typeId}`,
    }),
    getLeaveDetail: builder.query<any, string>({ query: (id) => `/leave/${id}`, providesTags: ['Leave'] }),
    getLeaveDocuments: builder.query<any, string>({
      query: (leaveId) => `/leave/${encodeURIComponent(leaveId)}/documents`,
      providesTags: ['Leave'],
    }),
    getLeaveSummary: builder.query<any, void>({ query: () => '/leave/summary', providesTags: ['Leave'] }),
    getShortLeave: builder.query<any, void>({ query: () => '/leave/short-leave' }),
    getOfficialMission: builder.query<any, void>({ query: () => '/leave/official-mission' }),
    getLeaveActions: builder.query<any, string>({ query: (id) => `/leave/${id}/actions` }),
    getOverlapLeaves: builder.query<any, { start: string; end: string }>({
      query: ({ start, end }) => `/leave/overlap?startDate=${start}&endDate=${end}`,
    }),
    getTeamLeave: builder.query<any, void>({ query: () => '/leave/team', providesTags: ['Leave'] }),
    getTeamBalance: builder.query<any, void>({ query: () => '/leave/team/balance' }),
    getPendingApprovals: builder.query<any, void>({ query: () => '/leave/approvals', providesTags: ['Leave'] }),
    submitLeave: builder.mutation<any, any>({ query: (body) => ({ url: '/leave/submit', method: 'POST', body }), invalidatesTags: ['Leave'] }),
    performLeaveAction: builder.mutation<any, { leaveId: string; body: { actionId: number; comments?: string } }>({
      query: ({ leaveId, body }) => ({ url: `/leave/${leaveId}/action`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    checkOverlap: builder.mutation<any, { startDate: string; endDate: string }>({
      query: (body) => ({ url: '/leave/check-overlap', method: 'POST', body }),
    }),
    uploadLeaveDocument: builder.mutation<any, { leaveId: string; file: PickedUploadFile }>({
      query: ({ leaveId, file }) => {
        const form = new FormData();
        appendFileToFormData(form, 'file', file);
        return { url: `/leave/${encodeURIComponent(leaveId)}/document`, method: 'POST', body: form };
      },
      invalidatesTags: ['Leave'],
    }),
  }),
});

export const {
  useGetLeaveBalanceQuery, useGetLeaveHistoryQuery, useGetLeaveTypesQuery, useGetLeaveCategoriesQuery,
  useGetLeaveDetailQuery, useGetLeaveSummaryQuery, useGetShortLeaveQuery, useGetOfficialMissionQuery,
  useGetLeaveActionsQuery, useGetOverlapLeavesQuery, useGetTeamLeaveQuery, useGetTeamBalanceQuery,
  useGetPendingApprovalsQuery, useSubmitLeaveMutation, usePerformLeaveActionMutation, useCheckOverlapMutation,
  useGetLeaveDocumentsQuery, useUploadLeaveDocumentMutation,
} = leaveApi;
