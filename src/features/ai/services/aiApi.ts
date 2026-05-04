import { baseApi } from '../../../store/baseApi';

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAISessions: builder.query<any, void>({
      query: () => '/ai/sessions',
    }),
    createSession: builder.mutation<any, void>({
      query: () => ({ url: '/ai/sessions', method: 'POST' }),
    }),
    deleteSession: builder.mutation<any, string>({
      query: (sessionId) => ({
        url: `/ai/sessions/${encodeURIComponent(sessionId)}`,
        method: 'DELETE',
      }),
    }),
    updateSessionTitle: builder.mutation<any, { sessionId: string; body: unknown }>({
      query: ({ sessionId, body }) => ({
        url: `/ai/sessions/${encodeURIComponent(sessionId)}/title`,
        method: 'PUT',
        body,
      }),
    }),
    getMessages: builder.query<any, string>({
      query: (sessionId) => `/ai/sessions/${encodeURIComponent(sessionId)}/messages`,
    }),
    sendMessage: builder.mutation<any, { sessionId: string; body: any }>({
      query: ({ sessionId, body }) => ({
        url: `/ai/sessions/${encodeURIComponent(sessionId)}/message`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetAISessionsQuery,
  useCreateSessionMutation,
  useDeleteSessionMutation,
  useUpdateSessionTitleMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
} = aiApi;
