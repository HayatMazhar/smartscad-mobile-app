import { baseApi, API_BASE_URL } from '../../../store/baseApi';

/**
 * Build the absolute URL for a circular's file (used by the download
 * helper which has to drive react-native-blob-util directly — RTK Query
 * is not used for binary streaming).
 */
export const circularFileUrl = (circularId: number | string): string =>
  `${API_BASE_URL}/portal/circulars/${circularId}/file`;

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNews: builder.query<any, void>({
      query: () => '/portal/news',
      providesTags: ['News', 'Portal'],
    }),
    getNewsDetail: builder.query<any, number>({
      query: (id) => `/portal/news/${id}`,
      providesTags: ['News', 'Portal'],
    }),
    getNewsComments: builder.query<any, number>({
      query: (newsId) => `/portal/news/${newsId}/comments`,
      providesTags: ['News'],
    }),
    getNewsLikes: builder.query<any, number>({
      query: (newsId) => `/portal/news/${newsId}/likes`,
      providesTags: ['News'],
    }),
    likeNews: builder.mutation<any, number>({
      query: (newsId) => ({ url: `/portal/news/${newsId}/like`, method: 'POST' }),
      invalidatesTags: ['News', 'Portal'],
    }),
    commentOnNews: builder.mutation<any, { newsId: number; body: unknown }>({
      query: ({ newsId, body }) => ({
        url: `/portal/news/${newsId}/comment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['News', 'Portal'],
    }),
    getEvents: builder.query<any, void>({
      query: () => '/portal/events',
      providesTags: ['Portal'],
    }),
    getCalendarEvents: builder.query<any, { start?: string; end?: string } | void>({
      query: (params) => {
        const p = params as { start?: string; end?: string } | undefined;
        const qs = new URLSearchParams();
        if (p?.start) qs.set('start', p.start);
        if (p?.end) qs.set('end', p.end);
        const q = qs.toString();
        return q ? `/portal/events/calendar?${q}` : '/portal/events/calendar';
      },
      providesTags: ['Portal'],
    }),
    rsvpEvent: builder.mutation<any, { eventId: number; body: unknown }>({
      query: ({ eventId, body }) => ({
        url: `/portal/events/${eventId}/rsvp`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Portal'],
    }),
    getAnnouncements: builder.query<any, void>({
      query: () => '/portal/announcements',
      providesTags: ['Portal'],
    }),
    getFAQs: builder.query<any, void>({
      query: () => '/portal/faqs',
      providesTags: ['Portal'],
    }),
    getFAQDetail: builder.query<any, number>({
      query: (faqId) => `/portal/faqs/${faqId}`,
      providesTags: ['Portal'],
    }),
    /**
     * Web parity for `Pages/Circulars(int CatID)`. Pass `catId` to filter
     * by `CircularTypeID`; omit (or pass 0) to get all visible circulars.
     */
    getCirculars: builder.query<any, { catId?: number } | void>({
      query: (arg) => {
        const catId = (arg as { catId?: number } | undefined)?.catId;
        return catId && catId > 0
          ? `/portal/circulars?catId=${catId}`
          : '/portal/circulars';
      },
      providesTags: ['Portal'],
    }),
    /**
     * Active CircularType rows + per-type counts. Drives the chip filter
     * at the top of the mobile Circulars screen — same set the web
     * swiper renders (incl. types with zero rows).
     */
    getCircularTypes: builder.query<any, void>({
      query: () => '/portal/circulars/types',
      providesTags: ['Portal'],
    }),
    getGalleries: builder.query<any, void>({
      query: () => '/portal/galleries/photos',
      providesTags: ['Portal'],
    }),
    getPhotoGalleryDetail: builder.query<any, number>({
      query: (galleryId) => `/portal/galleries/photos/${galleryId}`,
      providesTags: ['Portal'],
    }),
    getVideoGalleries: builder.query<any, void>({
      query: () => '/portal/galleries/videos',
      providesTags: ['Portal'],
    }),
    getVideoDetail: builder.query<any, number>({
      query: (videoId) => `/portal/galleries/videos/${videoId}`,
      providesTags: ['Portal'],
    }),
    getOffers: builder.query<any, void>({
      query: () => '/portal/offers',
      providesTags: ['Portal'],
    }),
    /** Latest Saahem leaders — no dates/quarter. Response { meta: { recentN, firstContribution, lastContribution }, leaders }. */
    getSaahemLeaderboardRecent: builder.query<any, void>({
      query: () => '/portal/saahem-leaderboard/latest',
      providesTags: ['Portal'],
    }),
  }),
});

export const {
  useGetNewsQuery,
  useGetNewsDetailQuery,
  useGetNewsCommentsQuery,
  useGetNewsLikesQuery,
  useLikeNewsMutation,
  useCommentOnNewsMutation,
  useGetEventsQuery,
  useGetCalendarEventsQuery,
  useRsvpEventMutation,
  useGetAnnouncementsQuery,
  useGetFAQsQuery,
  useGetFAQDetailQuery,
  useGetCircularsQuery,
  useGetCircularTypesQuery,
  useGetGalleriesQuery,
  useGetPhotoGalleryDetailQuery,
  useGetVideoGalleriesQuery,
  useGetVideoDetailQuery,
  useGetOffersQuery,
  useGetSaahemLeaderboardRecentQuery,
} = portalApi;
