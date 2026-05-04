import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const pmsSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetMyKPIs: b.query<any[], { year?: number; lang?: string } | void>({
      query: (a) => `/svc/pms/kpis${qs((a ?? {}) as any)}`,
      providesTags: ['PmsSvc'],
    }),
    v2UpdateKPIActual: b.mutation<any, { kpiUid: string; actual: number; notes?: string }>({
      query: ({ kpiUid, ...body }) => ({ url: `/svc/pms/kpis/${kpiUid}/actual`, method: 'POST', body }),
      invalidatesTags: ['PmsSvc'],
    }),
    v2GetMyObjectives: b.query<any[], { year?: number; lang?: string } | void>({
      query: (a) => `/svc/pms/objectives${qs((a ?? {}) as any)}`,
      providesTags: ['PmsSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetMyKPIsQuery,
  useV2UpdateKPIActualMutation,
  useV2GetMyObjectivesQuery,
} = pmsSvcApi;
