/**
 * Types for the Strategic Performance Management (PMS) module.
 *
 * Mirrors the JSON shape returned by the SPs in
 * `database/058_PMS_Hub_Read_BETA.sql` and the controllers in
 * `SmartSCAD.Mobile.API/Controllers/PMSController.cs`.
 *
 * Field naming follows the SP output (camelCase) — keep in sync.
 */

export interface PmsApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

/**
 * Shape returned by every PMS write SP (Approve / Revoke / SaveResult / etc.).
 * The C# controller wraps the Dapper row in `{ success: true, data: {...} }`,
 * so callers should peel `data` if it exists or read the row directly.
 */
export interface PmsWriteResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: PmsWriteResponse | Record<string, unknown>;

  kpiId?: number;
  kpiName?: string;
  kpiTargetId?: number;
  approved?: string | null;
  approvedBy?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;

  previousWorkflowStep?: number;
  newWorkflowStep?: number;
  isApproved?: boolean;
  enteredAt?: string | null;
  enteredBy?: string | null;

  errorLine?: number;
  errorProcedure?: string | null;
}

export interface PmsHubSummary {
  activeStrategyCount: number;
  objectiveCount: number;
  serviceCount: number;
  programCount: number;
  kpiCount: number;
  objectiveCountMine: number;
  serviceCountMine: number;
  programCountMine: number;
  kpiCountMine: number;
}

export interface PmsStrategy {
  id: number;
  strategyId: number;
  strategyName: string;
  strategyNameAr: string;
  startDate: string;
  endDate: string;
  startYear: string;
  endYear: string;
  period: string;
  vision: string;
  visionAr: string;
  mission: string;
  missionAr: string;
  values: string;
  valuesAr: string;
  isActive: number;
  ownerId: string;
  ownerName: string;
  ownerNameAr: string;
  objectiveCount: number;
  serviceCount: number;
  programCount: number;
  kpiCount: number;
}

export interface PmsObjective {
  id: number;
  objectiveId: number;
  strategyId: number;
  objectiveName: string;
  objectiveNameAr: string;
  code: string;
  sortOrder: number;
  description: string;
  descriptionAr: string;
  responsibleId: string;
  responsibleName: string;
  responsibleNameAr: string;
  responsibleTitle?: string;
  responsibleTitleAr?: string;
  priorityId: number | null;
  priorityName: string | null;
  priorityNameAr: string | null;
  priorityOrder?: number;
  strategyName: string;
  strategyNameAr: string;
  strategyStartYear?: string;
  strategyEndYear?: string;
  strategyStartDate?: string;
  strategyEndDate?: string;
  serviceCount: number;
  programCount: number;
  kpiCount: number;
  isMine: number;
}

/** Common shape returned by GetServices, GetPrograms and GetObjectiveDetailHeader. */
export interface PmsObjectiveDetail {
  id: number;
  serviceId?: number;
  programId?: number;
  objectiveId: number;
  strategyId: number;
  typeId: number;
  typeName: string;
  typeNameAr: string;
  hasKpis?: number;
  hasDetails?: number;
  code: string;
  /** ServiceList uses `serviceName`, ProgramList uses `programName`, header uses `name`. */
  name?: string;
  nameAr?: string;
  serviceName?: string;
  serviceNameAr?: string;
  programName?: string;
  programNameAr?: string;
  description: string;
  descriptionAr: string;
  startDate: string;
  endDate: string;
  statusId: number | null;
  statusName: string;
  approvedDate: string | null;
  approvedBy: string | null;
  responsibleId: string;
  responsibleName: string;
  responsibleNameAr: string;
  responsibleTitle?: string;
  responsibleTitleAr?: string;
  ownerId: string;
  ownerName: string;
  ownerNameAr: string;
  businessOwnerId?: string;
  businessOwnerName?: string;
  businessOwnerNameAr?: string;
  projectId?: number | null;
  createdBy?: string;
  createdDate?: string;
  modifiedDate?: string | null;
  objectiveName: string;
  objectiveNameAr: string;
  strategyName: string;
  strategyNameAr: string;
  kpiCount: number;
  activityCount: number;
  deliverableCount: number;
  isMine: number;
}

export interface PmsKpi {
  id: number;
  kpiId: number;
  kpiName: string;
  kpiNameAr: string;
  code: string;
  description: string;
  descriptionAr: string;
  objectiveId: number | null;
  objectiveDetailId: number | null;
  activityId: number | null;
  parentKpiId: number | null;
  kpiTypeId: number | null;
  measuringUnitId: number | null;
  measuringUnit: string;
  measuringUnitAr: string;
  measuringCycleId: number | null;
  baseline: number;
  benchmark: string | null;
  responsibleId: string;
  ownerName: string;
  ownerNameAr: string;
  dataEntryId: string | null;
  dataEntryName: string | null;
  approverId: string | null;
  approverName: string | null;
  approvedDate: string | null;
  approvedBy: string | null;
  statusName: string;
  target: string | null;
  targetNum: number | null;
  actual: string | null;
  actualNum: number | null;
  workflowStepId: number | null;
  dueDate: string | null;
  attainmentPct: number | null;
  objectiveName: string;
  objectiveNameAr: string;
  objectiveDetailName: string;
  objectiveDetailNameAr: string;
  strategyId: number | null;
  strategyName: string;
  isMine: number;
}

/** Extra fields returned by GetKPIDetail on top of PmsKpi. */
export interface PmsKpiDetail extends PmsKpi {
  benchmarkSource?: string;
  hasFormula?: number;
  formula?: string;
  startDate?: string;
  endDate?: string;
  responsibleName?: string;
  responsibleNameAr?: string;
  dataEntryNameAr?: string;
  approverNameAr?: string;
  viewerId?: string;
  viewerName?: string;
  approvedByName?: string;
  latestTargetId?: number | null;
  latestTargetCode?: string | null;
  callerIsResponsible?: number;
  callerIsDataEntry?: number;
  callerIsApprover?: number;
  callerIsViewer?: number;
  strategyNameAr?: string;
}

export interface PmsKpiTarget {
  id: number;
  targetId: number;
  kpiId: number;
  parentTargetId: number | null;
  code: string;
  target: string;
  targetNum: number | null;
  actual: string;
  actualNum: number | null;
  workflowStepId: number | null;
  dueDate: string | null;
  valueDate: string | null;
  approved: number;
  isActive: number;
  enteredDate: string | null;
  enteredBy: string | null;
  enteredByName: string | null;
  mainHighlights: string;
  reason: string;
  impact: string;
  nextActions: string;
  analysis: string;
  recommendation: string;
  challenges: string;
  attainmentPct: number | null;
}

export interface PmsActivity {
  id: number;
  activityId: number;
  objectiveDetailId: number;
  projectId: number | null;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  responsibleId: string;
  responsibleName: string;
  responsibleNameAr: string;
  startDate: string;
  endDate: string;
  approvedDate: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  statusName: string;
  templateTaskId: number | null;
  kpiCount: number;
  isMine: number;
}

export interface PmsDeliverable {
  id: number;
  deliverableId: number;
  objectiveDetailId: number;
  name: string;
  nameAr: string;
  description: string;
  startDate: string;
  endDate: string;
  performance: number | null;
  completion: number | null;
  completionComments: string;
  evidence: string;
  assignedToId: string;
  assignedToName: string;
  assignedToNameAr: string;
  isApproved: number;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedDate: string | null;
  approvalStatus: number;
  approvalStatusName: string;
  rejectionComments: string;
  createdBy: string | null;
  createdDate: string | null;
  modifiedBy: string | null;
  modifiedDate: string | null;
  isMine: number;
}
