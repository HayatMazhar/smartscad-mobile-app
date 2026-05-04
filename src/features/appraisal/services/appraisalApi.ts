import { baseApi } from '../../../store/baseApi';

/**
 * Mirrors SmartSCAD.Mobile.API Controllers/AppraisalController.cs
 * (performance appraisal + STI training).
 */
type YearArg     = { year?: number | null };
type ForUserArg  = { targetUserId: string; year?: number | null };

const yearQS = (year?: number | null) => (year ? `?year=${year}` : '');

export const appraisalApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    // ── Year history list ───────────────────────────────────────────────
    getAppraisalYears: builder.query<any, { targetUserId?: string | null } | void>({
      query: (arg) => {
        const t = arg && 'targetUserId' in arg && arg.targetUserId
          ? `?targetUserId=${encodeURIComponent(arg.targetUserId)}` : '';
        return `/appraisal/years${t}`;
      },
      providesTags: ['Appraisal'],
    }),

    // ── Own appraisal (year-aware) ──────────────────────────────────────
    getCurrentAppraisal: builder.query<any, YearArg | void>({
      query: (arg) => `/appraisal/current${yearQS(arg?.year)}`,
      providesTags: ['Appraisal'],
    }),
    getAppraisalWorkflow: builder.query<any, YearArg | void>({
      query: (arg) => `/appraisal/workflow${yearQS(arg?.year)}`,
      providesTags: ['Appraisal'],
    }),
    getPersonalObjectives: builder.query<any, YearArg | void>({
      query: (arg) => `/appraisal/objectives${yearQS(arg?.year)}`,
      providesTags: ['Appraisal'],
    }),
    getCompetencies: builder.query<any, YearArg | void>({
      query: (arg) => `/appraisal/competencies${yearQS(arg?.year)}`,
      providesTags: ['Appraisal'],
    }),
    getAppraisalResults: builder.query<any, YearArg | void>({
      query: (arg) => `/appraisal/results${yearQS(arg?.year)}`,
      providesTags: ['Appraisal'],
    }),

    // ── Manager: subordinates + view their appraisals ───────────────────
    getSubordinates: builder.query<any, void>({
      query: () => '/appraisal/subordinates',
      providesTags: ['Appraisal'],
    }),
    getAppraisalForUser: builder.query<any, ForUserArg>({
      query: ({ targetUserId, year }) =>
        `/appraisal/for/${encodeURIComponent(targetUserId)}${yearQS(year)}`,
      providesTags: ['Appraisal'],
    }),
    getWorkflowStepsForUser: builder.query<any, ForUserArg>({
      query: ({ targetUserId, year }) =>
        `/appraisal/for/${encodeURIComponent(targetUserId)}/workflow${yearQS(year)}`,
      providesTags: ['Appraisal'],
    }),
    getObjectivesForUser: builder.query<any, ForUserArg>({
      query: ({ targetUserId, year }) =>
        `/appraisal/for/${encodeURIComponent(targetUserId)}/objectives${yearQS(year)}`,
      providesTags: ['Appraisal'],
    }),
    getCompetenciesForUser: builder.query<any, ForUserArg>({
      query: ({ targetUserId, year }) =>
        `/appraisal/for/${encodeURIComponent(targetUserId)}/competencies${yearQS(year)}`,
      providesTags: ['Appraisal'],
    }),

    // ── Mutations (kept for future implementation) ───────────────────────
    submitSelfEvaluation: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/appraisal/self-evaluate', method: 'POST', body }),
      invalidatesTags: ['Appraisal'],
    }),
    submitManagerEvaluation: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/appraisal/evaluate', method: 'POST', body }),
      invalidatesTags: ['Appraisal'],
    }),

    // ── Training ─────────────────────────────────────────────────────────
    getTrainingCourses: builder.query<any, void>({
      query: () => '/appraisal/training/courses',
    }),
    getTrainingCourseDetail: builder.query<any, number>({
      query: (courseId) => `/appraisal/training/courses/${courseId}`,
    }),
    requestTrainingCourse: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/appraisal/training/request', method: 'POST', body }),
    }),
    getMyTrainingRequests: builder.query<any, void>({
      query: () => '/appraisal/training/my-requests',
    }),
    getTrainingPDP: builder.query<any, void>({
      query: () => '/appraisal/training/pdp',
    }),
    submitTrainingEvaluation: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/appraisal/training/evaluate', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetAppraisalYearsQuery,
  useGetCurrentAppraisalQuery,
  useGetAppraisalWorkflowQuery,
  useGetPersonalObjectivesQuery,
  useGetCompetenciesQuery,
  useGetAppraisalResultsQuery,
  useGetSubordinatesQuery,
  useGetAppraisalForUserQuery,
  useGetWorkflowStepsForUserQuery,
  useGetObjectivesForUserQuery,
  useGetCompetenciesForUserQuery,
  useSubmitSelfEvaluationMutation,
  useSubmitManagerEvaluationMutation,
  useGetTrainingCoursesQuery,
  useGetTrainingCourseDetailQuery,
  useRequestTrainingCourseMutation,
  useGetMyTrainingRequestsQuery,
  useGetTrainingPDPQuery,
  useSubmitTrainingEvaluationMutation,
} = appraisalApi;
