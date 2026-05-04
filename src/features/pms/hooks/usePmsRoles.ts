import { Asset, PMSRole } from '../../../shared/rights/enums';
import { useHasRole, useRolesFor } from '../../../shared/rights/useRights';

/**
 * Centralized PMS role gating, mirroring legacy
 * `Helper.IsGroupMember(PMSAssetID, ...roles)` checks scattered across
 * `SmartHelp\PMS\Controllers\*` and `SmartHelp\PMS\Views\*`.
 *
 * Usage:
 *   const { canApproveKpi, canEditDeliverable } = usePmsRoles();
 */
export function usePmsRoles() {
  const isAdmin = useHasRole(Asset.PMS, PMSRole.Admin);
  const isStrategyTeam = useHasRole(Asset.PMS, PMSRole.StrategyTeam);
  const isCorpPlanning = useHasRole(Asset.PMS, PMSRole.CorporatePerformancePlanning);
  const isTopMgmt = useHasRole(Asset.PMS, PMSRole.TopManagement);
  const canRevoke = useHasRole(Asset.PMS, PMSRole.RevokeApprovals);
  const isDeliverableAdmin = useHasRole(Asset.PMS, PMSRole.DeliverableAdmin);
  const isDeliverableApprover = useHasRole(Asset.PMS, PMSRole.DeliverableApprover);
  const isExcellenceGapsAdmin = useHasRole(Asset.PMS, PMSRole.ExcellenceGapsAdmin);
  const allRoles = useRolesFor(Asset.PMS);

  // Strategy-level edits: Admin or Strategy Team only.
  const canEditStrategy = isAdmin || isStrategyTeam;

  // Approve / revoke approvals on services, programs, KPIs.
  // PMSRole.RevokeApprovals is needed to undo a previously approved item.
  // Approving the KPI *definition* (Edit.cshtml) is Admin-only.
  // Approving a KPI *target* (workflow advance in EnterTargetResult) is broader.
  const canApproveKpiDefinition = isAdmin;
  const canApproveKpi = isAdmin || isStrategyTeam || isCorpPlanning;
  const canRevokeApproval = canRevoke || isAdmin;
  // Saving a KPI target result (Save / Submit / Approve / Reject) is gated
  // server-side by the SP based on the per-KPI Responsible / DataEntry / Approver
  // identity. Show the screen if the user has *any* PMS role; the SP will reject
  // unauthorized writes.
  const canEnterKpiResult = allRoles.length > 0;

  // Deliverables: any role can VIEW; only the owner / DeliverableAdmin can EDIT;
  // approval requires DeliverableApprover (or Admin override).
  const canEditDeliverable = isAdmin || isDeliverableAdmin;
  const canApproveDeliverable = isAdmin || isDeliverableApprover;

  // Activities & Sub-services creation/edit follow the same rule as services.
  const canEditObjectiveDetail = isAdmin || isStrategyTeam;

  return {
    isAdmin,
    isStrategyTeam,
    isCorpPlanning,
    isTopMgmt,
    isDeliverableAdmin,
    isDeliverableApprover,
    isExcellenceGapsAdmin,
    canEditStrategy,
    canEditObjectiveDetail,
    canEditDeliverable,
    canApproveKpiDefinition,
    canApproveKpi,
    canEnterKpiResult,
    canRevokeApproval,
    canApproveDeliverable,
    /** True if the user has any role on PMS — controls whether the module is shown at all. */
    hasAnyPmsRole: allRoles.length > 0,
    rolesRaw: allRoles,
  };
}
