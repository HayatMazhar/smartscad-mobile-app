import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type TicketCreateBody = {
  serviceId: number;
  title?: string;
  description?: string;
  priorityId?: number;
  attributesJson?: string;
  lang?: string;
};

export type TicketMoveNextBody = {
  stepId?: number;
  comments?: string;
  assignTo?: string;
  lang?: string;
};

export const ticketSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetTicketCatalog: b.query<any, { entityId?: number; lang?: string } | void>({
      query: (a) => `/svc/tickets/catalog${qs((a ?? {}) as any)}`,
      providesTags: ['TicketsSvc'],
    }),
    v2GetServiceDetail: b.query<any, { serviceId: number; lang?: string }>({
      query: ({ serviceId, lang }) => `/svc/tickets/services/${serviceId}${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetTicketList: b.query<any[], { ticketView?: number; csvStatuses?: string; pageNumber?: number; pageSize?: number; search?: string; lang?: string } | void>({
      query: (a) => `/svc/tickets/list${qs((a ?? {}) as any)}`,
      providesTags: ['TicketsSvc'],
    }),
    v2GetTicketDetail: b.query<any[], { ticketId: number; lang?: string }>({
      query: ({ ticketId, lang }) => `/svc/tickets/${ticketId}${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['TicketsSvc'],
    }),
    v2GetPendingTicketActions: b.query<any[], string | void>({
      query: (lang) => `/svc/tickets/pending-actions${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['TicketsSvc'],
    }),

    v2CreateTicket: b.mutation<any, TicketCreateBody>({
      query: (body) => ({ url: '/svc/tickets/create', method: 'POST', body }),
      invalidatesTags: ['TicketsSvc'],
    }),
    v2MoveTicketNext: b.mutation<any, { ticketId: number; body: TicketMoveNextBody }>({
      query: ({ ticketId, body }) => ({ url: `/svc/tickets/${ticketId}/move-next`, method: 'POST', body }),
      invalidatesTags: ['TicketsSvc'],
    }),
    v2CancelTicket: b.mutation<any, { ticketId: number; reason?: string; lang?: string }>({
      query: ({ ticketId, ...body }) => ({ url: `/svc/tickets/${ticketId}/cancel`, method: 'POST', body }),
      invalidatesTags: ['TicketsSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetTicketCatalogQuery,
  useV2GetServiceDetailQuery,
  useV2GetTicketListQuery,
  useV2GetTicketDetailQuery,
  useV2GetPendingTicketActionsQuery,
  useV2CreateTicketMutation,
  useV2MoveTicketNextMutation,
  useV2CancelTicketMutation,
} = ticketSvcApi;
