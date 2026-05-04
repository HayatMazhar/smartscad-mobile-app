import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const epmSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetMyProjects: b.query<any[], { year?: number; lang?: string } | void>({
      query: (a) => `/svc/epm/projects${qs((a ?? {}) as any)}`,
      providesTags: ['EpmSvc'],
    }),
    v2GetProjectDetail: b.query<any, { projectUid: string; lang?: string }>({
      query: ({ projectUid, lang }) => `/svc/epm/projects/${projectUid}${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['EpmSvc'],
    }),
    v2UpdateDeliverableProgress: b.mutation<any, { deliverableUid: string; progress: number; notes?: string }>({
      query: ({ deliverableUid, ...body }) => ({
        url: `/svc/epm/deliverables/${deliverableUid}/progress`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EpmSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetMyProjectsQuery,
  useV2GetProjectDetailQuery,
  useV2UpdateDeliverableProgressMutation,
} = epmSvcApi;
