import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const portalSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetNews: b.query<any[], { pageNumber?: number; pageSize?: number; lang?: string } | void>({
      query: (a) => `/svc/portal/news${qs((a ?? {}) as any)}`,
      providesTags: ['PortalSvc'],
    }),
    v2GetNewsDetail: b.query<any, { newsUid: string; lang?: string }>({
      query: ({ newsUid, lang }) => `/svc/portal/news/${newsUid}${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['PortalSvc'],
    }),
    v2PostNewsComment: b.mutation<any, { newsUid: string; comment: string }>({
      query: ({ newsUid, comment }) => ({
        url: `/svc/portal/news/${newsUid}/comment`, method: 'POST', body: { comment },
      }),
      invalidatesTags: ['PortalSvc'],
    }),
    v2ToggleNewsLike: b.mutation<any, string>({
      query: (newsUid) => ({ url: `/svc/portal/news/${newsUid}/like`, method: 'POST' }),
      invalidatesTags: ['PortalSvc'],
    }),

    v2GetEvents: b.query<any[], { from?: string; to?: string; lang?: string } | void>({
      query: (a) => `/svc/portal/events${qs((a ?? {}) as any)}`,
      providesTags: ['PortalSvc'],
    }),
    v2GetOffers: b.query<any[], string | void>({
      query: (lang) => `/svc/portal/offers${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetVideos: b.query<any[], { categoryId?: number; lang?: string } | void>({
      query: (a) => `/svc/portal/videos${qs((a ?? {}) as any)}`,
    }),
    v2GetFAQs: b.query<any[], { categoryId?: number; lang?: string } | void>({
      query: (a) => `/svc/portal/faqs${qs((a ?? {}) as any)}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetNewsQuery,
  useV2GetNewsDetailQuery,
  useV2PostNewsCommentMutation,
  useV2ToggleNewsLikeMutation,
  useV2GetEventsQuery,
  useV2GetOffersQuery,
  useV2GetVideosQuery,
  useV2GetFAQsQuery,
} = portalSvcApi;
