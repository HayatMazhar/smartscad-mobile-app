import { baseApi } from '../../../store/baseApi';

export const hrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<any, void>({
      query: () => '/hr/profile',
      providesTags: ['Profile', 'HR'],
    }),
    getProfileImage: builder.query<any, void>({
      query: () => '/hr/profile/image',
    }),
    updateProfileImage: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/hr/profile/image', method: 'PUT', body }),
      invalidatesTags: ['Profile', 'HR'],
    }),
    getOrgChart: builder.query<any, void>({
      query: () => '/hr/orgchart',
      providesTags: ['HR'],
    }),
    getFullOrgChart: builder.query<any, number | undefined>({
      query: (entityId) =>
        entityId ? `/hr/orgchart/full?entityId=${entityId}` : '/hr/orgchart/full',
      providesTags: ['HR'],
    }),
    getSectors: builder.query<any, string | undefined>({
      query: (entityId) => `/hr/orgchart/sectors?entityId=${entityId ?? ''}`,
      providesTags: ['HR'],
    }),
    getDepartments: builder.query<any, string | undefined>({
      query: (sectorId) => `/hr/orgchart/departments?sectorId=${sectorId ?? ''}`,
      providesTags: ['HR'],
    }),
    getSections: builder.query<any, string | undefined>({
      query: (departmentId) => `/hr/orgchart/sections?departmentId=${departmentId ?? ''}`,
      providesTags: ['HR'],
    }),
    searchEmployees: builder.query<any, string | undefined>({
      query: (q) => `/hr/directory?query=${encodeURIComponent(q ?? '')}`,
      providesTags: ['HR'],
    }),
    getEmployee: builder.query<any, string>({
      query: (id) => `/hr/directory/${encodeURIComponent(id)}`,
      providesTags: ['HR'],
    }),
    getRecognition: builder.query<any, void>({
      query: () => '/hr/recognition',
      providesTags: ['HR'],
    }),
    getNominations: builder.query<any, void>({
      query: () => '/hr/recognition/nominations',
      providesTags: ['HR'],
    }),
    getNominationDetail: builder.query<any, number>({
      query: (nominationId) => `/hr/recognition/${nominationId}`,
      providesTags: ['HR'],
    }),
    submitNomination: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/hr/recognition/nominate', method: 'POST', body }),
      invalidatesTags: ['HR'],
    }),
    approveNomination: builder.mutation<any, { nominationId: number; body: unknown }>({
      query: ({ nominationId, body }) => ({
        url: `/hr/recognition/${nominationId}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HR'],
    }),
    likeNomination: builder.mutation<any, number>({
      query: (nominationId) => ({
        url: `/hr/recognition/${nominationId}/like`,
        method: 'POST',
      }),
      invalidatesTags: ['HR'],
    }),
    commentOnNomination: builder.mutation<any, { nominationId: number; body: unknown }>({
      query: ({ nominationId, body }) => ({
        url: `/hr/recognition/${nominationId}/comment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HR'],
    }),
    getRecognitionDashboard: builder.query<any, void>({
      query: () => '/hr/recognition/dashboard',
      providesTags: ['HR'],
    }),
    getRecognitionPeriods: builder.query<any, void>({
      query: () => '/hr/recognition/periods',
      providesTags: ['HR'],
    }),
    getScadStarWinners: builder.query<any, number | undefined>({
      query: (periodId) =>
        periodId ? `/hr/recognition/winners?periodId=${periodId}` : '/hr/recognition/winners',
      providesTags: ['HR'],
    }),
    getScadStarWinnerDetail: builder.query<any, number>({
      query: (shortlistId) => `/hr/recognition/winners/${shortlistId}`,
      providesTags: ['HR'],
    }),
    getPromotionHistory: builder.query<any, void>({
      query: () => '/hr/promotions',
    }),
    getIncrementHistory: builder.query<any, void>({
      query: () => '/hr/increments',
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetProfileImageQuery,
  useUpdateProfileImageMutation,
  useGetOrgChartQuery,
  useGetFullOrgChartQuery,
  useGetSectorsQuery,
  useGetDepartmentsQuery,
  useGetSectionsQuery,
  useSearchEmployeesQuery,
  useGetEmployeeQuery,
  useGetRecognitionQuery,
  useGetNominationsQuery,
  useGetNominationDetailQuery,
  useSubmitNominationMutation,
  useApproveNominationMutation,
  useLikeNominationMutation,
  useCommentOnNominationMutation,
  useGetRecognitionDashboardQuery,
  useGetRecognitionPeriodsQuery,
  useGetScadStarWinnersQuery,
  useGetScadStarWinnerDetailQuery,
  useGetPromotionHistoryQuery,
  useGetIncrementHistoryQuery,
} = hrApi;
