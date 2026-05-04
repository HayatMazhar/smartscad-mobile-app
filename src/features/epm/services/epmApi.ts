import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';

export const epmApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getEPMDashboard: builder.query<any, void>({
      query: () => '/epm/dashboard',
      providesTags: ['EPMProjects'],
    }),
    getEPMDashboardView: builder.query<any, string>({
      query: (viewName) => `/epm/dashboard/${encodeURIComponent(viewName)}`,
      providesTags: ['EPMProjects'],
    }),
    getMyProjects: builder.query<any, { year?: number } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params && typeof params.year === 'number') p.set('year', String(params.year));
        const qs = p.toString();
        return `/epm/projects${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['EPMProjects'],
    }),
    getAllProjects: builder.query<any, { year?: number } | void>({
      query: (params) => {
        const p = new URLSearchParams();
        if (params && typeof params.year === 'number') p.set('year', String(params.year));
        const qs = p.toString();
        return `/epm/projects/all${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['EPMProjects'],
    }),
    getProject: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}`,
      providesTags: ['EPMProjects'],
    }),
    getProjectDetailsJson: builder.query<any, number>({
      query: (projectId) => `/epm/projects/${projectId}/details`,
      providesTags: ['EPMProjects'],
    }),
    getProjectTab: builder.query<any, { projectId: number; tabName: string }>({
      query: ({ projectId, tabName }) =>
        `/epm/projects/${projectId}/tab/${encodeURIComponent(tabName)}`,
      providesTags: ['EPMProjects'],
    }),
    editProject: builder.mutation<any, { projectId: number; body: unknown }>({
      query: ({ projectId, body }) => ({
        url: `/epm/projects/${projectId}/edit`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    approveProjectClosure: builder.mutation<any, { projectId: number; body: unknown }>({
      query: ({ projectId, body }) => ({
        url: `/epm/projects/${projectId}/approve-closure`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    getProjectMilestones: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/milestones`,
      providesTags: ['EPMProjects'],
    }),
    getMilestoneEvidence: builder.query<any, number>({
      query: (milestoneId) => `/epm/milestones/${milestoneId}/evidence`,
      providesTags: (result, err, milestoneId) => [{ type: 'EPMProjects', id: `ev-${milestoneId}` }],
    }),
    getGantt: builder.query<any, number>({
      query: (projectId) => `/epm/projects/${projectId}/gantt`,
    }),
    // ── Project section queries (all 17 sections, project-scoped) ──────────────
    getProjectStrategy: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/strategy`,
      providesTags: ['EPMProjects'],
    }),
    getProjectInfo: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/info`,
      providesTags: ['EPMProjects'],
    }),
    getProjectTeam: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/team`,
      providesTags: ['EPMProjects'],
    }),
    getProjectRisks: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/risks`,
      providesTags: ['EPMProjects'],
    }),
    getProjectDeliverables: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/deliverables`,
      providesTags: ['EPMProjects'],
    }),
    getProjectIssues: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/issues`,
      providesTags: ['EPMProjects'],
    }),
    getProjectChangeMgmt: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/change-management`,
      providesTags: ['EPMProjects'],
    }),
    getProjectProcurement: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/procurement`,
      providesTags: ['EPMProjects'],
    }),
    getProjectKPIs: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/kpis`,
      providesTags: ['EPMProjects'],
    }),
    getProjectFinalResult: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/final-result`,
      providesTags: ['EPMProjects'],
    }),
    getProjectLessons: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/lessons`,
      providesTags: ['EPMProjects'],
    }),
    getProjectPlanVersions: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/plan-versions`,
      providesTags: ['EPMProjects'],
    }),
    getProjectApprovals: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/approvals`,
      providesTags: ['EPMProjects'],
    }),
    getProjectStatusReport: builder.query<any, number>({
      query: (id) => `/epm/projects/${id}/status-report`,
      providesTags: ['EPMProjects'],
    }),
    getProjectTaskDetail: builder.query<any, { projectId: number; taskId: number }>({
      query: ({ taskId }) => `/epm/tasks/${taskId}`,
      providesTags: ['EPMProjects'],
    }),
    getProjectMilestoneDetail: builder.query<any, { projectId: number; milestoneId: number }>({
      query: ({ milestoneId }) => `/epm/milestones/${milestoneId}`,
      providesTags: ['EPMProjects'],
    }),
    // ── Write mutations ───────────────────────────────────────────────────────
    createEPMRisk: builder.mutation<any, { projectId: number; body: unknown }>({
      query: ({ body }) => ({ url: '/epm/risks/create', method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    editEPMRisk: builder.mutation<any, { riskId: number; body: unknown }>({
      query: ({ riskId, body }) => ({ url: `/epm/risks/${riskId}/edit`, method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    createEPMIssue: builder.mutation<any, { projectId: number; body: unknown }>({
      query: ({ body }) => ({ url: '/epm/issues/create', method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    editEPMIssue: builder.mutation<any, { issueId: number; body: unknown }>({
      query: ({ issueId, body }) => ({ url: `/epm/issues/${issueId}/edit`, method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    updateEPMTaskProgress: builder.mutation<any, { taskId: number; percentage: number; comments?: string }>({
      query: ({ taskId, percentage, comments }) => ({
        url: `/epm/tasks/${taskId}/percentage`,
        method: 'POST',
        body: { percentage, comments },
      }),
      invalidatesTags: ['EPMProjects', 'Tasks'],
    }),
    requestEPMTaskChange: builder.mutation<any, { taskId: number; body: unknown }>({
      query: ({ taskId, body }) => ({ url: `/epm/tasks/${taskId}/request-change`, method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    createEPMMilestone: builder.mutation<any, { projectId: number; body: unknown }>({
      query: ({ projectId, body }) => ({ url: `/epm/projects/${projectId}/milestones/create`, method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    editMilestone: builder.mutation<any, { milestoneId: number; body: unknown }>({
      query: ({ milestoneId, body }) => ({
        url: `/epm/milestones/${milestoneId}/edit`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    uploadMilestoneEvidence: builder.mutation<any, { milestoneId: number; file: PickedUploadFile }>({
      query: ({ milestoneId, file }) => {
        const form = new FormData();
        appendFileToFormData(form, 'file', file);
        return {
          url: `/epm/milestones/${milestoneId}/evidence`,
          method: 'POST',
          body: form,
        };
      },
      invalidatesTags: (result, err, arg) => ['EPMProjects', { type: 'EPMProjects', id: `ev-${arg.milestoneId}` }],
    }),
    approveMilestone: builder.mutation<any, { milestoneId: number; body: unknown }>({
      query: ({ milestoneId, body }) => ({
        url: `/epm/milestones/${milestoneId}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    getMyDeliverables: builder.query<any, void>({
      query: () => '/epm/deliverables',
    }),
    getPendingDeliverableApprovals: builder.query<any, void>({
      query: () => '/epm/deliverables/pending',
    }),
    editDeliverable: builder.mutation<any, { deliverableId: number; body: unknown }>({
      query: ({ deliverableId, body }) => ({
        url: `/epm/deliverables/${deliverableId}/edit`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    /** Namespaced: PMS also registers `/pms/deliverables/.../approve` on the same `baseApi`. */
    epmApproveDeliverable: builder.mutation<any, { deliverableId: number; body: unknown }>({
      query: ({ deliverableId, body }) => ({
        url: `/epm/deliverables/${deliverableId}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    epmRejectDeliverable: builder.mutation<any, { deliverableId: number; body: unknown }>({
      query: ({ deliverableId, body }) => ({
        url: `/epm/deliverables/${deliverableId}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    getRiskRegister: builder.query<any, void>({
      query: () => '/epm/risks',
    }),
    createRisk: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/epm/risks/create', method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    editRisk: builder.mutation<any, { riskId: number; body: unknown }>({
      query: ({ riskId, body }) => ({ url: `/epm/risks/${riskId}/edit`, method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    createIssue: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/epm/issues/create', method: 'POST', body }),
      invalidatesTags: ['EPMProjects'],
    }),
    getBudget: builder.query<any, number>({
      query: (projectId) => `/epm/projects/${projectId}/budget`,
    }),
    getFinancialDues: builder.query<any, void>({
      query: () => '/epm/financial-dues',
    }),
    getProjectReports: builder.query<any, number | undefined>({
      query: (projectId) =>
        projectId == null ? '/epm/reports' : `/epm/reports?projectId=${projectId}`,
    }),
    approvePlanVersion: builder.mutation<any, { versionId: number; body: unknown }>({
      query: ({ versionId, body }) => ({
        url: `/epm/plan-versions/${versionId}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    rejectPlanVersion: builder.mutation<any, { versionId: number; body: unknown }>({
      query: ({ versionId, body }) => ({
        url: `/epm/plan-versions/${versionId}/reject`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['EPMProjects'],
    }),
    getEPMTasks: builder.query<any, void>({
      query: () => '/epm/tasks',
      providesTags: ['Tasks'],
    }),
    getEPMTask: builder.query<any, number>({
      query: (taskId) => `/epm/tasks/${taskId}`,
      providesTags: ['Tasks'],
    }),
    createEPMTask: builder.mutation<any, unknown>({
      query: (body) => ({ url: '/epm/tasks/create', method: 'POST', body }),
      invalidatesTags: ['Tasks', 'EPMProjects'],
    }),
    editEPMTask: builder.mutation<any, { taskId: number; body: unknown }>({
      query: ({ taskId, body }) => ({
        url: `/epm/tasks/${taskId}/edit`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks', 'EPMProjects'],
    }),
    updateEPMTaskPercentage: builder.mutation<any, { taskId: number; body: unknown }>({
      query: ({ taskId, body }) => ({
        url: `/epm/tasks/${taskId}/percentage`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks', 'EPMProjects'],
    }),
  }),
});

export const {
  useGetProjectStrategyQuery,
  useGetProjectInfoQuery,
  useGetProjectTeamQuery,
  useGetProjectRisksQuery,
  useGetProjectDeliverablesQuery,
  useGetProjectIssuesQuery,
  useGetProjectChangeMgmtQuery,
  useGetProjectProcurementQuery,
  useGetProjectKPIsQuery,
  useGetProjectFinalResultQuery,
  useGetProjectLessonsQuery,
  useGetProjectPlanVersionsQuery,
  useGetProjectApprovalsQuery,
  useGetProjectStatusReportQuery,
  useGetProjectTaskDetailQuery,
  useGetProjectMilestoneDetailQuery,
  useCreateEPMRiskMutation,
  useEditEPMRiskMutation,
  useCreateEPMIssueMutation,
  useEditEPMIssueMutation,
  useUpdateEPMTaskProgressMutation,
  useRequestEPMTaskChangeMutation,
  useCreateEPMMilestoneMutation,
  useGetEPMDashboardQuery,
  useGetEPMDashboardViewQuery,
  useGetMyProjectsQuery,
  useGetAllProjectsQuery,
  useGetProjectQuery,
  useGetProjectDetailsJsonQuery,
  useGetProjectTabQuery,
  useEditProjectMutation,
  useApproveProjectClosureMutation,
  useGetProjectMilestonesQuery,
  useGetMilestoneEvidenceQuery,
  useGetGanttQuery,
  useEditMilestoneMutation,
  useUploadMilestoneEvidenceMutation,
  useApproveMilestoneMutation,
  useGetMyDeliverablesQuery,
  useGetPendingDeliverableApprovalsQuery,
  useEditDeliverableMutation,
  useEpmApproveDeliverableMutation,
  useEpmRejectDeliverableMutation,
  useGetRiskRegisterQuery,
  useCreateRiskMutation,
  useEditRiskMutation,
  useCreateIssueMutation,
  useGetBudgetQuery,
  useGetFinancialDuesQuery,
  useGetProjectReportsQuery,
  useApprovePlanVersionMutation,
  useRejectPlanVersionMutation,
  useGetEPMTasksQuery,
  useGetEPMTaskQuery,
  useCreateEPMTaskMutation,
  useEditEPMTaskMutation,
  useUpdateEPMTaskPercentageMutation,
} = epmApi;
