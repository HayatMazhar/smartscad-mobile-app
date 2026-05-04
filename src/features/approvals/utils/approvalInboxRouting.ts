import { extractTicketIdFromLink, resolveWaitingItemRoute, type RouteDescriptor } from '../../tasks/utils/taskRouting';

/** Row shape from Mobile.spMobile_Approvals_GetInbox (UI may use camelCase from JSON). */
export type ApprovalInboxRow = {
  id?: string;
  Id?: string;
  title?: string;
  moduleCode?: string;
  moduleName?: string;
  recordType?: string;
  feedSourceReturnLink?: string | null;
  fromName?: string;
  toName?: string;
  status?: string;
  priority?: string;
  createdDate?: string;
  percentage?: number;
  ageDays?: number;
};

const itemId = (r: ApprovalInboxRow) => String(r.id ?? r.Id ?? '').trim();

/**
 * Best native screen for this approval (same heuristics as task hub / waiting list).
 * Always prefer a real record (leave, ticket, task) over the generic web link.
 */
export function resolveApprovalInboxRoute(row: ApprovalInboxRow): RouteDescriptor {
  return resolveWaitingItemRoute({
    id: itemId(row),
    recordType: row.recordType,
    moduleName: row.moduleName,
    externalLink: row.feedSourceReturnLink ?? undefined,
  });
}

export type RelatedStackRoute =
  | { stack: 'More'; screen: 'Recognition' }
  | { stack: 'More'; screen: 'KPIs' }
  | { stack: 'More'; screen: 'Objectives' }
  | { stack: 'More'; screen: 'Appraisal' }
  | { stack: 'More'; screen: 'ProjectList' }
  | { stack: 'More'; screen: 'Training' };

/**
 * When the workflow is web-only for decisions, offer the closest in-app area (read context).
 * IBDAA_IDEA decisions remain web-first (no in-app innovation screen) — handled by `isWebFirstModule`.
 */
export function resolveRelatedModuleHome(moduleCode: string | undefined | null): RelatedStackRoute | null {
  const c = (moduleCode ?? '').toUpperCase();
  switch (c) {
    case 'SCAD_STAR':
      return { stack: 'More', screen: 'Recognition' };
    case 'PMS_KPI':
      return { stack: 'More', screen: 'KPIs' };
    case 'PMS_OBJECTIVE':
      return { stack: 'More', screen: 'Objectives' };
    case 'APPRAISAL':
      return { stack: 'More', screen: 'Appraisal' };
    case 'EPM_DELIVERABLE':
      return { stack: 'More', screen: 'ProjectList' };
    default:
      return null;
  }
}

/** True if this module only exposes OPEN_WEB in decision context (cannot decide in app). */
export function isWebFirstModule(moduleCode: string | undefined | null): boolean {
  const c = (moduleCode ?? '').toUpperCase();
  return ['IBDAA_IDEA', 'SCAD_STAR', 'PMS_KPI', 'PMS_OBJECTIVE', 'APPRAISAL', 'OTHER'].includes(c);
}

export function hasReturnLink(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

export function canOpenTicketInApp(row: ApprovalInboxRow): boolean {
  return extractTicketIdFromLink(row.feedSourceReturnLink) != null;
}
