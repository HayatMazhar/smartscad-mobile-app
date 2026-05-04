import { baseApi } from '../../../store/baseApi';

const toQs = (p: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApprovalsInbox: builder.query<
      { summary: { total?: number; moduleCountsJson?: string }; items: any[] },
      { skip?: number; take?: number; module?: string; q?: string; userId?: string } | void
    >({
      query: (args) => {
        const a = (args || {}) as { skip?: number; take?: number; module?: string; q?: string; userId?: string };
        return `/approvals${toQs({
          skip: a.skip ?? 0,
          take: a.take ?? 50,
          module: a.module,
          q: a.q,
          userId: a.userId,
        })}`;
      },
      providesTags: ['Approvals', 'Tasks', 'Leave', 'Tickets', 'EPMProjects', 'KPIs'],
    }),
    getDecisionContext: builder.query<
      { header: any; allowedActions: any[]; extraFields: any[]; history?: any[] },
      string
    >({
      query: (itemId) => `/approvals/${encodeURIComponent(itemId)}/decision-context`,
    }),
    decideOnApproval: builder.mutation<
      any,
      { itemId: string; body: { moduleCode?: string; actionCode: string; actionId?: number; comment?: string } }
    >({
      query: ({ itemId, body }) => ({
        url: `/approvals/${encodeURIComponent(itemId)}/decide`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Approvals', 'Tasks', 'Leave', 'Tickets', 'EPMProjects', 'KPIs', 'Notifications'],
    }),
  }),
});

export const {
  useGetApprovalsInboxQuery,
  useGetDecisionContextQuery,
  useDecideOnApprovalMutation,
} = approvalsApi;
