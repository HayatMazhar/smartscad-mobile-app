import { baseApi } from '../../../store/baseApi';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerPushDevice: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/notifications/register', method: 'POST', body }),
    }),
    unregisterPushDevice: builder.mutation<any, string | undefined>({
      query: (deviceToken) => ({
        url: `/notifications/unregister?deviceToken=${encodeURIComponent(deviceToken ?? '')}`,
        method: 'DELETE',
      }),
    }),
    getNotifications: builder.query<any, { page?: number; pageSize?: number } | void>({
      query: (params) => {
        const page = (params as any)?.page ?? 1;
        const pageSize = (params as any)?.pageSize ?? 20;
        return `/notifications?page=${page}&pageSize=${pageSize}`;
      },
      providesTags: ['Notifications'],
    }),
    getUnreadCount: builder.query<any, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notifications'],
    }),
    markAsRead: builder.mutation<any, string>({
      query: (notificationKey) => ({
        url: `/notifications/${encodeURIComponent(notificationKey)}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllAsRead: builder.mutation<any, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PUT' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useRegisterPushDeviceMutation,
  useUnregisterPushDeviceMutation,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationApi;
