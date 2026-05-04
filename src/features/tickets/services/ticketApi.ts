import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';

/** actionType: 2 move next / resolve, 3 reject, 5 edit-and-resubmit, 10 skip. */
export type TicketActionBody = {
  actionType: number;
  comments: string;
  attributeValuesJson?: string;
  statusId?: number;
  delegatedBy?: string;
};

export const ticketApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getServiceGroups: builder.query<any, void>({ query: () => '/tickets/catalog/groups' }),
    getServiceCategories: builder.query<any, number | undefined>({
      query: (groupId) => `/tickets/catalog/categories${groupId ? `?groupId=${groupId}` : ''}`,
    }),
    getCatalogServices: builder.query<any, { categoryId?: number; groupId?: number }>({
      query: ({ categoryId, groupId } = {}) => {
        const params = new URLSearchParams();
        if (categoryId) params.set('categoryId', String(categoryId));
        if (groupId) params.set('groupId', String(groupId));
        return `/tickets/catalog/services?${params}`;
      },
    }),
    getServiceCatalog: builder.query<any, void>({ query: () => '/tickets/catalog' }),
    getServiceDetails: builder.query<any, number>({ query: (id) => `/tickets/catalog/${id}` }),
    getServiceAttributes: builder.query<any, number>({ query: (id) => `/tickets/catalog/${id}/attributes` }),
    getServiceWorkflow: builder.query<any, number>({ query: (id) => `/tickets/catalog/${id}/workflow` }),
    getTopServices: builder.query<any, void>({ query: () => '/tickets/top-services' }),
    getMyTickets: builder.query<any, {
      viewId?: number;
      statusIds?: string;
      filterIds?: string;
      fromDate?: string;
      toDate?: string;
      keywords?: string;
    } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.viewId != null) p.set('viewId', String(params.viewId));
        if (params?.statusIds) p.set('statusIds', params.statusIds);
        if (params?.filterIds) p.set('filterIds', params.filterIds);
        if (params?.fromDate) p.set('fromDate', params.fromDate);
        if (params?.toDate) p.set('toDate', params.toDate);
        if (params?.keywords) p.set('keywords', params.keywords);
        return `/tickets/my?${p}`;
      },
      providesTags: ['Tickets'],
    }),
    getMyJobs: builder.query<any, void>({ query: () => '/tickets/jobs', providesTags: ['Tickets'] }),
    getTicket: builder.query<any, number>({ query: (id) => `/tickets/${id}`, providesTags: ['Tickets'] }),
    getTicketAttachments: builder.query<any, number>({
      query: (ticketId) => `/tickets/${ticketId}/attachments`,
      providesTags: ['Tickets'],
    }),
    getTicketDashboard: builder.query<any, void>({ query: () => '/tickets/dashboard', providesTags: ['Tickets'] }),
    searchTickets: builder.query<any, string>({
      query: (q) => `/tickets/search?query=${encodeURIComponent(q)}`,
    }),
    createTicket: builder.mutation<any, any>({
      query: (body) => ({ url: '/tickets', method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    approveTicket: builder.mutation<any, { ticketId: number; body: any }>({
      query: ({ ticketId, body }) => ({ url: `/tickets/${ticketId}/approve`, method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    resolveTicket: builder.mutation<any, { ticketId: number; body: any }>({
      query: ({ ticketId, body }) => ({ url: `/tickets/${ticketId}/resolve`, method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    assignTicket: builder.mutation<any, { ticketId: number; body: any }>({
      query: ({ ticketId, body }) => ({ url: `/tickets/${ticketId}/assign`, method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    rateTicket: builder.mutation<any, { ticketId: number; body: any }>({
      query: ({ ticketId, body }) => ({ url: `/tickets/${ticketId}/rate`, method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    cancelTicket: builder.mutation<any, { ticketId: number; body: any }>({
      query: ({ ticketId, body }) => ({ url: `/tickets/${ticketId}/cancel`, method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    ticketAction: builder.mutation<any, { ticketId: number; body: TicketActionBody }>({
      query: ({ ticketId, body }) => ({
        url: `/tickets/${ticketId}/action`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tickets'],
    }),
    ticketEnquiryReply: builder.mutation<any, { ticketId: number; reply: string }>({
      query: ({ ticketId, reply }) => ({
        url: `/tickets/${ticketId}/enquiry-reply`,
        method: 'POST',
        body: { reply },
      }),
      invalidatesTags: ['Tickets'],
    }),
    ticketRevert: builder.mutation<
      any,
      { ticketId: number; targetStepId: number; targetUserId: string; comments: string }
    >({
      query: ({ ticketId, targetStepId, targetUserId, comments }) => ({
        url: `/tickets/${ticketId}/revert`,
        method: 'POST',
        body: { targetStepId, targetUserId, comments },
      }),
      invalidatesTags: ['Tickets'],
    }),
    uploadTicketDocument: builder.mutation<any, { ticketId: number; file: PickedUploadFile }>({
      query: ({ ticketId, file }) => {
        const form = new FormData();
        appendFileToFormData(form, 'file', file);
        return { url: `/tickets/${ticketId}/document`, method: 'POST', body: form };
      },
      invalidatesTags: ['Tickets'],
    }),
  }),
});

export const {
  useGetServiceGroupsQuery,
  useGetServiceCategoriesQuery,
  useGetCatalogServicesQuery,
  useGetTopServicesQuery,
  useGetServiceCatalogQuery,
  useGetServiceDetailsQuery,
  useGetServiceAttributesQuery,
  useGetServiceWorkflowQuery,
  useGetMyTicketsQuery,
  useGetMyJobsQuery,
  useGetTicketQuery,
  useGetTicketDashboardQuery,
  useSearchTicketsQuery,
  useCreateTicketMutation,
  useApproveTicketMutation,
  useResolveTicketMutation,
  useAssignTicketMutation,
  useRateTicketMutation,
  useCancelTicketMutation,
  useTicketActionMutation,
  useTicketEnquiryReplyMutation,
  useTicketRevertMutation,
  useGetTicketAttachmentsQuery,
  useUploadTicketDocumentMutation,
} = ticketApi;
