/**
 * useEpmProjectRights
 *
 * Centralises EPM role gating, mirroring the legacy web portal logic in:
 *   SmartHelp\EPM\Controllers\ProjectsController.cs
 *   SmartHelp\EPM\Controllers\TasksController.cs
 *   SmartHelp\EPM\Controllers\MilestonesController.cs
 *
 * Asset-level roles (Helper.IsGroupMember(179 = EPM, role)):
 *   Admin=1, PMOTeam=2, FinanceTeam=3, TopManagement=4,
 *   BTUAdmin=5, NotificationsReceiver=6, EPMEditMilestone=7, ReadOnlyAllProjects=8
 *
 * Per-project roles come from the project object returned by the API
 * (isProjectManager, isTeamMember, isReadOnly …).
 */

import { Asset, EPMRole } from '../../../shared/rights/enums';
import { useHasRole } from '../../../shared/rights/useRights';
import { useAppSelector } from '../../../store/store';

export type EpmProjectRights = {
  // Asset-level
  isAdmin: boolean;
  isPMO: boolean;
  isFinance: boolean;
  isTopMgmt: boolean;
  canEditMilestone: boolean;
  canReadAll: boolean;

  // Project-level (derived from API response)
  isProjectManager: boolean;
  isTeamMember: boolean;

  // Composed permissions
  canCreateTask: boolean;      // manager, PMO, admin
  canEditTask: boolean;        // same as canCreateTask
  canEditThisTask: (assignedToLogin: string) => boolean;
  canUpdateTaskProgress: (assignedToLogin: string) => boolean;

  canCreateMilestone: boolean; // manager, PMO, admin
  canEditMilestone2: boolean;  // manager, PMO, admin, EPMEditMilestone role
  canEditThisMilestone: (assignedToLogin: string) => boolean;
  canUploadEvidence: (assignedToLogin: string) => boolean;
  canApproveMilestone: boolean; // admin, PMO, manager

  canEditRisk: boolean;        // admin, PMO, manager
  canEditIssue: boolean;       // admin, PMO, manager
  canEditDeliverable: boolean; // admin, PMO
  canEditChangeMgmt: boolean;  // admin, PMO, manager
  canEditLessons: boolean;     // all team members
  canEditProjectCard: boolean; // admin, PMO
  canEditFinancials: boolean;  // admin, finance team
};

export function useEpmProjectRights(project?: any): EpmProjectRights {
  const isAdmin        = useHasRole(Asset.EPM, EPMRole.Admin);
  const isPMO          = useHasRole(Asset.EPM, EPMRole.PMOTeam);
  const isFinance      = useHasRole(Asset.EPM, EPMRole.FinanceTeam);
  const isTopMgmt      = useHasRole(Asset.EPM, EPMRole.TopManagement);
  const editMilRole    = useHasRole(Asset.EPM, EPMRole.EPMEditMilestone);
  const readAllRole    = useHasRole(Asset.EPM, EPMRole.ReadOnlyAllProjects);

  const user = useAppSelector((s) => s.auth.user);
  // userId is the domain login, e.g. 'scad\mqadir'
  const userId = user?.userId ?? '';

  // Per-project flags from the API response (ProjectsController.Index logic)
  const isProjectManager = !!(
    project?.isProjectManager ||
    (userId && project?.managerId &&
      String(project.managerId).toLowerCase() === userId.toLowerCase())
  );
  const isTeamMember = !!(project?.isTeamMember);

  // ── Composed rules (mirror EPMRole checks scattered across controllers) ──

  // canCreateTask / canEditTask: admin, PMO, or project manager
  // (TasksController.Create gate: IsGroupMember(1|2) || IsProjectManager)
  const canCreateTask = isAdmin || isPMO || isProjectManager;
  const canEditTask   = canCreateTask;

  // The task owner (assignedToLogin) or someone with create rights can edit a task
  const canEditThisTask = (assignedToLogin: string): boolean =>
    canEditTask ||
    (!!assignedToLogin && !!userId &&
      assignedToLogin.toLowerCase() === userId.toLowerCase());

  // Progress update: assignee or manager / PMO / admin
  const canUpdateTaskProgress = (assignedToLogin: string): boolean =>
    canCreateTask ||
    (!!assignedToLogin && !!userId &&
      assignedToLogin.toLowerCase() === userId.toLowerCase());

  // Milestone create: admin, PMO, or project manager
  const canCreateMilestone = canCreateTask;

  // EPMEditMilestone role also grants editing (MilestonesController gate)
  const canEditMilestone2 = isAdmin || isPMO || isProjectManager || editMilRole;

  const canEditThisMilestone = (assignedToLogin: string): boolean =>
    canEditMilestone2 ||
    (!!assignedToLogin && !!userId &&
      assignedToLogin.toLowerCase() === userId.toLowerCase());

  // Evidence upload: assignee or admin / PMO
  const canUploadEvidence = (assignedToLogin: string): boolean =>
    isAdmin || isPMO ||
    (!!assignedToLogin && !!userId &&
      assignedToLogin.toLowerCase() === userId.toLowerCase());

  // Milestone approval: admin, PMO, manager
  const canApproveMilestone = isAdmin || isPMO || isProjectManager;

  const canEditRisk        = isAdmin || isPMO || isProjectManager;
  const canEditIssue       = isAdmin || isPMO || isProjectManager;
  const canEditDeliverable = isAdmin || isPMO;
  const canEditChangeMgmt  = isAdmin || isPMO || isProjectManager;
  const canEditLessons     = isAdmin || isPMO || isProjectManager || isTeamMember;
  const canEditProjectCard = isAdmin || isPMO;
  const canEditFinancials  = isAdmin || isFinance;

  return {
    isAdmin, isPMO, isFinance, isTopMgmt,
    canEditMilestone: editMilRole,
    canReadAll: readAllRole,
    isProjectManager,
    isTeamMember,
    canCreateTask, canEditTask,
    canEditThisTask, canUpdateTaskProgress,
    canCreateMilestone, canEditMilestone2,
    canEditThisMilestone, canUploadEvidence,
    canApproveMilestone,
    canEditRisk, canEditIssue, canEditDeliverable, canEditChangeMgmt,
    canEditLessons, canEditProjectCard, canEditFinancials,
  };
}
