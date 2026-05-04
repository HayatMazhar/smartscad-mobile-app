/**
 * Task routing helpers.
 *
 * Tasks in SMARTSCAD's central [Task] table are created for every module
 * (Sanadkom ticket approvals, Leave approvals, Appraisal, PMS, EPM, etc.),
 * so "Waiting for my action" rows often aren't real standalone tasks —
 * they're proxies whose FeedSourceReturnLink points at the real record.
 *
 * These helpers decode that link so the mobile app can navigate to the
 * correct detail screen (e.g. TicketDetail) instead of the generic
 * TaskDetail, which would just show the raw HTML email template.
 */

export type WaitingItem = {
  id?: string;
  recordType?: string;            // 'Task' | 'Leave' (from spMobile_Hub_GetWaitingForMyAction)
  moduleName?: string;            // e.g. 'Sanadkom', 'Appraisal System', 'HR'
  externalLink?: string;          // FeedSourceReturnLink from the source module
  [k: string]: any;
};

/** SMARTSCAD TaskUID as string (mobile `/tasks/{id}/full` requires this shape). */
const TASK_UID_GUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isTaskUidGuid(s: string): boolean {
  return TASK_UID_GUID_RE.test(s.trim());
}

/** e.g. `/taskmgmt/TaskReview.aspx?TaskUID=...&lang=en` from GetUserHub */
function extractTaskUidFromReturnLink(link?: string | null): string {
  if (!link) return '';
  const m = /[?&]taskUID=([0-9a-fA-F-]{36})/i.exec(link);
  if (!m) return '';
  const g = m[1].replace(/[{}]/g, '').trim();
  return isTaskUidGuid(g) ? g : '';
}

/**
 * Stable TaskUID for hub / inbox rows. `/tasks/{id}/full` only accepts a GUID.
 * - Raw GetUserHub / Dapper may use `ID` not `id`.
 * - Some payloads put the human task number in `taskNo` while the GUID only appears in `feedSourceReturnLink` (?TaskUID=...).
 * Prefer any column that matches a GUID, then parse the web return link.
 */
export function hubRowTaskId(item: any): string {
  const link =
    item?.feedSourceReturnLink ??
    item?.FeedSourceReturnLink ??
    item?.externalLink ??
    item?.ExternalLink ??
    '';
  const fromLink = extractTaskUidFromReturnLink(link);

  const columnCandidates = [
    item?.taskUID,
    item?.TaskUID,
    item?.TASKUID,
    item?.taskUid,
    item?.id,
    item?.Id,
    item?.ID,
  ];
  for (const c of columnCandidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s && isTaskUidGuid(s)) return s;
  }
  if (fromLink) return fromLink;
  for (const c of columnCandidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return '';
}

/** Leave hub row — prefer application id over proxy task UID. */
export function hubRowLeaveId(item: any): string {
  const raw =
    item?.leaveAppUID ??
    item?.LeaveAppUID ??
    item?.id ??
    item?.Id ??
    item?.ID;
  if (raw == null) return '';
  return String(raw).trim();
}

export type RouteDescriptor =
  | { stack: 'Sanadkom'; screen: 'TicketDetail'; params: { ticketId: number } }
  | { stack: 'More';     screen: 'LeaveDetail';   params: { leaveId: string } }
  | { stack: 'More';     screen: 'LeaveHistory';  params?: undefined }
  | { stack: 'More';     screen: 'Appraisal';     params?: undefined }
  | { stack: 'More';     screen: 'KPIs';          params?: undefined }
  | { stack: 'More';     screen: 'TaskDetail';    params: { taskId: string } };

/**
 * Extract a numeric ticket ID from a SmartHelp return link like
 * `https://.../SmartHelp/Ticket/Edit/468896`.
 * Returns null if the link is not a recognised ticket URL.
 */
export function extractTicketIdFromLink(link?: string | null): number | null {
  if (!link) return null;
  // /SmartHelp/Ticket/Edit/{id}  or  /Ticket/Edit/{id}
  const m = /\/Ticket\/(?:Edit|Detail|View)\/(\d+)/i.exec(link);
  if (m) return Number(m[1]);
  // ?TicketID=123 or ?TicketId=123
  const q = /[?&]ticketI[dD]=(\d+)/i.exec(link);
  if (q) return Number(q[1]);
  return null;
}

/**
 * Resolve the best destination for a row coming from the Task Hub SP
 * (spMobile_Tasks_GetHub). Hub rows have a slightly different shape than
 * waiting items: `recordType` is a single letter (T|L|A|S), the module name
 * lives under `feedSourceName`, and the deep link is `feedSourceReturnLink`.
 */
export function resolveHubItemRoute(item: any): RouteDescriptor {
  const rt = String(item?.recordType ?? '').toUpperCase();
  const rowId = rt === 'L' ? hubRowLeaveId(item) : hubRowTaskId(item);
  return resolveWaitingItemRoute({
    id: rowId || undefined,
    recordType: rt === 'L' ? 'Leave' : rt === 'T' ? 'Task' : rt,
    moduleName: item?.feedSourceName ?? item?.FeedSourceName,
    externalLink: item?.feedSourceReturnLink ?? item?.FeedSourceReturnLink,
  });
}

/**
 * Resolve the best destination for a "Waiting for my action" item (universal inbox).
 * Falls back to the generic TaskDetail when we cannot map the row to a module screen.
 */
export function resolveWaitingItemRoute(item: WaitingItem): RouteDescriptor {
  // 1. Leave items — open the new LeaveDetail screen (shared workflow + history
  //    view) when we have a leave id; otherwise fall back to the Leave History list.
  if (item?.recordType === 'Leave' || /leave/i.test(item?.moduleName ?? '')) {
    const leaveId = item?.id ? String(item.id) : '';
    return leaveId
      ? { stack: 'More', screen: 'LeaveDetail', params: { leaveId } }
      : { stack: 'More', screen: 'LeaveHistory' };
  }

  const link = item?.externalLink ?? '';
  const mod  = (item?.moduleName ?? '').toLowerCase();

  // 2. Sanadkom / SmartHelp tickets — parse the ticket ID out of the link
  const ticketId = extractTicketIdFromLink(link);
  if (ticketId && (mod.includes('sanadkom') || /smarthelp|ticket/i.test(link))) {
    return { stack: 'Sanadkom', screen: 'TicketDetail', params: { ticketId } };
  }

  // 3. Appraisal module
  if (mod.includes('appraisal')) {
    return { stack: 'More', screen: 'Appraisal' };
  }

  // 4. PMS / KPIs
  if (mod.includes('performance management') || mod.includes('kpi')) {
    return { stack: 'More', screen: 'KPIs' };
  }

  // 5. Fallback: generic task detail (hub rows may reach here with only taskUID on raw item)
  return {
    stack: 'More',
    screen: 'TaskDetail',
    params: { taskId: hubRowTaskId(item as any) || String(item?.id ?? '').trim() },
  };
}

/**
 * Convert a legacy HTML description (the Task table stores the whole email
 * template) into readable plain text.
 * Keeps line breaks, drops tags/styles/scripts, decodes common entities.
 */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  let s = String(html);

  // Drop script/style blocks
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Convert common block-level tags into line breaks
  s = s.replace(/<\/?(?:br|\/br)\s*\/?>/gi, '\n');
  s = s.replace(/<\/?(?:p|div|tr|li|h[1-6])\b[^>]*>/gi, '\n');
  s = s.replace(/<\/td>/gi, '  ');
  s = s.replace(/<\/?(?:table|thead|tbody|tfoot|ul|ol|strong|b|em|i|u|span|a|td|th|font|center)\b[^>]*>/gi, '');

  // Strip any remaining tags
  s = s.replace(/<[^>]+>/g, '');

  // Decode the handful of entities we actually see in these templates
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  // Collapse whitespace: trim each line, drop >2 consecutive blank lines
  s = s
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((_, idx, arr) => !(idx > 0 && arr[idx - 1] === '' && arr[idx] === ''))
    .join('\n')
    .trim();

  return s;
}
