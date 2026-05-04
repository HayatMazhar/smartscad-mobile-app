import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const notificationSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetNotifications: b.query<any[], { unseenOnly?: boolean; pageNumber?: number; pageSize?: number; lang?: string } | void>({
      query: (a) => `/svc/notifications${qs((a ?? {}) as any)}`,
      providesTags: ['NotificationsSvc'],
    }),
    v2MarkNotificationSeen: b.mutation<any, string>({
      query: (notificationKey) => ({
        url: '/svc/notifications/mark-seen', method: 'POST', body: { notificationKey },
      }),
      invalidatesTags: ['NotificationsSvc'],
    }),
    v2MarkAllNotificationsSeen: b.mutation<any, string | void>({
      query: (lang) => ({
        url: `/svc/notifications/mark-all-seen${lang ? `?lang=${lang}` : ''}`,
        method: 'POST',
      }),
      invalidatesTags: ['NotificationsSvc'],
    }),

    v2GetSectors: b.query<any[], string | void>({
      query: (lang) => `/common/sectors${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetDepartments: b.query<any[], { sectorId?: number; lang?: string } | void>({
      query: (a) => `/common/departments${qs((a ?? {}) as any)}`,
    }),
    v2GetSections: b.query<any[], { departmentId?: number; lang?: string } | void>({
      query: (a) => `/common/sections${qs((a ?? {}) as any)}`,
    }),
    v2GetResources: b.query<any[], { sectorId?: number; departmentId?: number; sectionId?: number; search?: string; lang?: string } | void>({
      query: (a) => `/common/resources${qs((a ?? {}) as any)}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetNotificationsQuery,
  useV2MarkNotificationSeenMutation,
  useV2MarkAllNotificationsSeenMutation,
  useV2GetSectorsQuery,
  useV2GetDepartmentsQuery,
  useV2GetSectionsQuery,
  useV2GetResourcesQuery,
} = notificationSvcApi;
