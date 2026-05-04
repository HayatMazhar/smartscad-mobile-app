import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';
import type {
  PmsApiEnvelope,
  PmsHubSummary,
  PmsStrategy,
  PmsObjective,
  PmsObjectiveDetail,
  PmsKpi,
  PmsKpiDetail,
  PmsKpiTarget,
  PmsActivity,
  PmsDeliverable,
  PmsWriteResponse,
} from '../types';

function qs(o: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const pmsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** One-shot summary for the PMS hub landing card. */
    getPmsHubSummary: builder.query<PmsApiEnvelope<PmsHubSummary> | PmsHubSummary, void>({
      query: () => '/pms/hub-summary',
      providesTags: ['KPIs'],
    }),

    getStrategies: builder.query<PmsApiEnvelope<PmsStrategy[]> | PmsStrategy[], void>({
      query: () => '/pms/strategies',
      providesTags: ['KPIs'],
    }),

    getStrategyMenu: builder.query<unknown, number | undefined>({
      query: (strategyId) =>
        strategyId == null ? '/pms/strategy-menu' : `/pms/strategy-menu?strategyId=${strategyId}`,
    }),

    /** List of objectives, optionally filtered to a single strategy. */
    getObjectives: builder.query<PmsApiEnvelope<PmsObjective[]> | PmsObjective[], number | undefined>({
      query: (strategyId) => `/pms/objectives${qs({ strategyId })}`,
      providesTags: ['KPIs'],
    }),

    getObjectiveDetails: builder.query<PmsApiEnvelope<PmsObjective> | PmsObjective, number>({
      query: (objectiveId) => `/pms/objectives/${objectiveId}`,
      providesTags: ['KPIs'],
    }),

    /** Lists Main Services (TypeID 1/7). */
    getServices: builder.query<
      PmsApiEnvelope<PmsObjectiveDetail[]> | PmsObjectiveDetail[],
      { strategyId?: number; objectiveId?: number; mineOnly?: boolean } | void
    >({
      query: (a) => `/pms/services${qs((a ?? {}) as Record<string, unknown>)}`,
      providesTags: ['KPIs'],
    }),

    /** Lists Programs (TypeID 2/8). */
    getPrograms: builder.query<
      PmsApiEnvelope<PmsObjectiveDetail[]> | PmsObjectiveDetail[],
      { strategyId?: number; objectiveId?: number; mineOnly?: boolean } | void
    >({
      query: (a) => `/pms/programs${qs((a ?? {}) as Record<string, unknown>)}`,
      providesTags: ['KPIs'],
    }),

    /** Single ObjectiveDetail header — works for both services and programs. */
    getObjectiveDetail: builder.query<PmsApiEnvelope<PmsObjectiveDetail> | PmsObjectiveDetail, number>({
      query: (id) => `/pms/objective-details/${id}`,
      providesTags: ['KPIs'],
    }),

    getObjectiveDetailActivities: builder.query<PmsApiEnvelope<PmsActivity[]> | PmsActivity[], number>({
      query: (id) => `/pms/objective-details/${id}/activities`,
      providesTags: ['KPIs'],
    }),

    getObjectiveDetailDeliverables: builder.query<PmsApiEnvelope<PmsDeliverable[]> | PmsDeliverable[], number>({
      query: (id) => `/pms/objective-details/${id}/deliverables`,
      providesTags: ['KPIs'],
    }),

    approveObjectiveDetail: builder.mutation<
      PmsWriteResponse,
      { objectiveDetailId: number; comments?: string }
    >({
      query: ({ objectiveDetailId, comments }) => ({
        url: `/pms/objective-details/${objectiveDetailId}/approve`,
        method: 'POST',
        body: { comments: comments ?? '' },
      }),
      invalidatesTags: ['KPIs'],
    }),

    revokeObjectiveDetail: builder.mutation<
      PmsWriteResponse,
      { objectiveDetailId: number; comments?: string }
    >({
      query: ({ objectiveDetailId, comments }) => ({
        url: `/pms/objective-details/${objectiveDetailId}/revoke`,
        method: 'POST',
        body: { comments: comments ?? '' },
      }),
      invalidatesTags: ['KPIs'],
    }),

    saveActivity: builder.mutation<
      PmsWriteResponse,
      {
        activityId?: number | null;
        objectiveDetailId: number;
        name: string;
        nameAr: string;
        description: string;
        descriptionAr: string;
        responsible: string;
        startDate: string;
        endDate: string;
        projectId?: number | null;
        templateTaskId?: number | null;
      }
    >({
      query: (body) => ({
        url: '/pms/activities/save',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['KPIs'],
    }),

    saveDeliverable: builder.mutation<
      PmsWriteResponse,
      {
        deliverableId?: number | null;
        objectiveId: number;
        nameEn: string;
        nameAr: string;
        description?: string;
        startDate: string;
        endDate: string;
        performance?: number | null;
        assignedTo: string;
      }
    >({
      query: (body) => ({
        url: '/pms/deliverables/save',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['KPIs'],
    }),

    approveDeliverable: builder.mutation<
      PmsWriteResponse,
      { deliverableId: number; comments?: string }
    >({
      query: ({ deliverableId, comments }) => ({
        url: `/pms/deliverables/${deliverableId}/approve`,
        method: 'POST',
        body: { comments: comments ?? '' },
      }),
      invalidatesTags: ['KPIs'],
    }),

    rejectDeliverable: builder.mutation<
      PmsWriteResponse,
      { deliverableId: number; comments: string }
    >({
      query: ({ deliverableId, comments }) => ({
        url: `/pms/deliverables/${deliverableId}/reject`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: ['KPIs'],
    }),

    /** Filterable KPI list — supports strategy, objective, objectiveDetail, activity scope and "mine". */
    getMyKPIs: builder.query<
      PmsApiEnvelope<PmsKpi[]> | PmsKpi[],
      {
        strategyId?: number;
        objectiveId?: number;
        objectiveDetailId?: number;
        activityId?: number;
        mineOnly?: boolean;
        year?: number;
      } | void
    >({
      query: (a) => `/pms/kpis${qs((a ?? {}) as Record<string, unknown>)}`,
      providesTags: ['KPIs'],
    }),

    getKPIDetails: builder.query<PmsApiEnvelope<PmsKpiDetail> | PmsKpiDetail, number>({
      query: (id) => `/pms/kpis/${id}`,
      providesTags: ['KPIs'],
    }),

    getKPITargets: builder.query<PmsApiEnvelope<PmsKpiTarget[]> | PmsKpiTarget[], number>({
      query: (kpiId) => `/pms/kpis/${kpiId}/targets`,
      providesTags: ['KPIs'],
    }),

    approveKPI: builder.mutation<PmsWriteResponse, { kpiId: number; comments?: string }>({
      query: ({ kpiId, comments }) => ({
        url: `/pms/kpis/${kpiId}/approve`,
        method: 'POST',
        body: { comments: comments ?? '' },
      }),
      invalidatesTags: ['KPIs'],
    }),

    revokeKPI: builder.mutation<PmsWriteResponse, { kpiId: number; comments?: string }>({
      query: ({ kpiId, comments }) => ({
        url: `/pms/kpis/${kpiId}/revoke`,
        method: 'POST',
        body: { comments: comments ?? '' },
      }),
      invalidatesTags: ['KPIs'],
    }),

    saveKpiTargetResult: builder.mutation<
      PmsWriteResponse,
      {
        kpiTargetId: number;
        action?: 'Save' | 'Submit' | 'Approve' | 'Reject';
        actualValue?: string;
        mainHighlights?: string;
        reason?: string;
        impact?: string;
        nextActions?: string;
        analysis?: string;
        recommendation?: string;
        challenges?: string;
        comments?: string;
      }
    >({
      query: ({ kpiTargetId, ...body }) => ({
        url: `/pms/kpi-targets/${kpiTargetId}/save-result`,
        method: 'POST',
        body: { action: 'Save', ...body },
      }),
      invalidatesTags: ['KPIs'],
    }),

    getMyAssignment: builder.query<unknown, void>({
      query: () => '/pms/my-assignment',
      providesTags: ['KPIs'],
    }),

    getKpiAttachments: builder.query<unknown, string>({
      query: (entityKey) => `/pms/kpi-attachments/${encodeURIComponent(entityKey)}`,
      providesTags: ['KPIs'],
    }),

    uploadKpiAttachment: builder.mutation<unknown, { entityKey: string; file: PickedUploadFile }>({
      query: ({ entityKey, file }) => {
        const form = new FormData();
        appendFileToFormData(form, 'file', file);
        return { url: `/pms/kpi-attachments/${encodeURIComponent(entityKey)}`, method: 'POST', body: form };
      },
      invalidatesTags: ['KPIs'],
    }),
  }),
});

export const {
  useGetPmsHubSummaryQuery,
  useGetStrategiesQuery,
  useGetStrategyMenuQuery,
  useGetObjectivesQuery,
  useGetObjectiveDetailsQuery,
  useGetServicesQuery,
  useGetProgramsQuery,
  useGetObjectiveDetailQuery,
  useGetObjectiveDetailActivitiesQuery,
  useGetObjectiveDetailDeliverablesQuery,
  useApproveObjectiveDetailMutation,
  useRevokeObjectiveDetailMutation,
  useSaveActivityMutation,
  useSaveDeliverableMutation,
  useApproveDeliverableMutation,
  useRejectDeliverableMutation,
  useGetMyKPIsQuery,
  useGetKPIDetailsQuery,
  useGetKPITargetsQuery,
  useApproveKPIMutation,
  useRevokeKPIMutation,
  useSaveKpiTargetResultMutation,
  useGetMyAssignmentQuery,
  useGetKpiAttachmentsQuery,
  useUploadKpiAttachmentMutation,
} = pmsApi;
