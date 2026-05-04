/**
 * Notification routing helpers.
 *
 * The API returns rows shaped like:
 *   { id, title, body, module, referenceType, referenceId, deepLink, isRead, createdAt }
 *
 * We resolve each row to a React Navigation target (tab + nested screen + params)
 * using `deepLink` first (e.g. "/tasks/<guid>"), and fall back to `module` +
 * `referenceId` when the link is missing or unrecognised.
 */

import { extractTicketIdFromLink } from '../../tasks/utils/taskRouting';

export type NotifRoute =
  | { stack: 'Approvals'; screen: 'ApprovalsInbox';    params?: { taskUid?: string } }
  | { stack: 'Approvals'; screen: 'ApprovalDetail';   params: { itemId: string } }
  | { stack: 'More';     screen: 'TaskDetail';         params: { taskId: string } }
  | { stack: 'More';     screen: 'TaskList';           params?: undefined }
  | { stack: 'Sanadkom'; screen: 'TicketDetail';       params: { ticketId: number } }
  | { stack: 'Sanadkom'; screen: 'TicketList';         params?: undefined }
  | { stack: 'More';     screen: 'LeaveHistory';       params?: undefined }
  | { stack: 'More';     screen: 'LeaveDetail';        params: { leaveId: string } }
  | { stack: 'More';     screen: 'AnnouncementDetail'; params: { announcementId: number } }
  | { stack: 'More';     screen: 'Announcements';      params?: undefined }
  | { stack: 'More';     screen: 'EventDetail';        params: { eventId: number | string } }
  | { stack: 'More';     screen: 'Events';             params?: undefined }
  | { stack: 'More';     screen: 'OfferDetail';        params: { offerId: number } }
  | { stack: 'More';     screen: 'Offers';             params?: undefined }
  | { stack: 'More';     screen: 'NewsDetail';         params: { newsId: number } }
  | { stack: 'More';     screen: 'News';               params?: undefined }
  | { stack: 'More';     screen: 'Recognition';        params?: undefined }
  | { stack: 'More';     screen: 'WinnerDetail';       params: { winnerId: number } }
  | { stack: 'More';     screen: 'ProjectDetail';      params: { projectId: number } }
  | { stack: 'More';     screen: 'ProjectList';        params?: undefined }
  | { stack: 'More';     screen: 'EpmMilestoneDetail'; params: { projectId: number; milestoneId: number } }
  | { stack: 'More';     screen: 'KPIs';               params?: undefined }
  | { stack: 'More';     screen: 'Appraisal';          params?: undefined }
  | { stack: 'More';     screen: 'Training';           params?: undefined }
  | null;

export interface NotificationLike {
  id?: number | string;
  notificationKey?: string;
  title?: string;
  body?: string;
  message?: string;
  module?: string;
  referenceType?: string;
  referenceId?: string | number;
  deepLink?: string;
  isRead?: boolean;
  isSeen?: boolean;
  createdAt?: string;
  date?: string;
}

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
};

/** Parse the mobile deep-link path segment; returns null if not recognised. */
function routeFromDeepLink(link: string): NotifRoute {
  // Accept "/tasks/<id>" with any leading scheme/host stripped.
  const clean = link.replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/+/, '/').toLowerCase();

  const m = (re: RegExp) => re.exec(clean);

  let r;
  if ((r = m(/^\/tasks\/([^/?#]+)/))) return { stack: 'More', screen: 'TaskDetail', params: { taskId: r[1] } };
  if (clean === '/tasks' || clean.startsWith('/tasks?')) return { stack: 'More', screen: 'TaskList' };

  if ((r = m(/^\/approvals\/([0-9a-f-]{8,})/i))) {
    return { stack: 'Approvals', screen: 'ApprovalDetail', params: { itemId: r[1] } };
  }
  if (clean === '/approvals' || clean.startsWith('/approvals?')) {
    return { stack: 'Approvals', screen: 'ApprovalsInbox' };
  }

  if ((r = m(/^\/tickets\/(\d+)/))) return { stack: 'Sanadkom', screen: 'TicketDetail', params: { ticketId: Number(r[1]) } };
  if (clean === '/tickets' || clean.startsWith('/tickets?')) return { stack: 'Sanadkom', screen: 'TicketList' };

  // /leave/<id> → leave detail; /leave/approv/<id> → leave detail (for action); fallback → history
  if ((r = m(/^\/leave\/(?:approv\/)?([0-9a-f-]{8,})/i))) {
    return { stack: 'More', screen: 'LeaveDetail', params: { leaveId: r[1] } };
  }
  if (clean.startsWith('/leave')) return { stack: 'More', screen: 'LeaveHistory' };

  if ((r = m(/^\/portal\/announcements\/(\d+)/))) return { stack: 'More', screen: 'AnnouncementDetail', params: { announcementId: Number(r[1]) } };
  if (clean.startsWith('/portal/announcements')) return { stack: 'More', screen: 'Announcements' };

  if ((r = m(/^\/portal\/events\/([^/?#]+)/))) return { stack: 'More', screen: 'EventDetail', params: { eventId: r[1] } };
  if (clean.startsWith('/portal/events')) return { stack: 'More', screen: 'Events' };

  if ((r = m(/^\/portal\/offers\/(\d+)/))) return { stack: 'More', screen: 'OfferDetail', params: { offerId: Number(r[1]) } };
  if (clean.startsWith('/portal/offers')) return { stack: 'More', screen: 'Offers' };

  if ((r = m(/^\/portal\/news\/(\d+)/))) return { stack: 'More', screen: 'NewsDetail', params: { newsId: Number(r[1]) } };
  if (clean.startsWith('/portal/news') || clean.startsWith('/news')) return { stack: 'More', screen: 'News' };

  if ((r = m(/^\/hr\/recognition\/(\d+)/))) return { stack: 'More', screen: 'WinnerDetail', params: { winnerId: Number(r[1]) } };
  if (clean.startsWith('/hr/recognition') || clean.startsWith('/recognition')) return { stack: 'More', screen: 'Recognition' };

  // EPM milestone approval / send-back notifications point at the legacy web
  // page /EPM/Tasks/UploadEvidence/{milestoneId}. On mobile we route this to
  // the new milestone-detail screen which has the Approve / Reject controls.
  // We don't know the projectId from the URL alone, so we pass projectId=0 and
  // let the detail screen fetch it from the SP response.
  if ((r = m(/^\/epm\/tasks\/uploadevidence\/(\d+)/))) {
    return { stack: 'More', screen: 'EpmMilestoneDetail', params: { projectId: 0, milestoneId: Number(r[1]) } };
  }
  if ((r = m(/^\/epm\/milestones\/(\d+)/))) {
    return { stack: 'More', screen: 'EpmMilestoneDetail', params: { projectId: 0, milestoneId: Number(r[1]) } };
  }
  if ((r = m(/^\/epm\/projects\/(\d+)/))) return { stack: 'More', screen: 'ProjectDetail', params: { projectId: Number(r[1]) } };
  if (clean.startsWith('/epm') || clean.startsWith('/projects')) return { stack: 'More', screen: 'ProjectList' };

  if (clean.startsWith('/pms/kpi') || clean.startsWith('/kpi')) return { stack: 'More', screen: 'KPIs' };
  if (clean.startsWith('/appraisal')) return { stack: 'More', screen: 'Appraisal' };
  if (clean.startsWith('/training')) return { stack: 'More', screen: 'Training' };

  return null;
}

/** Resolve a route using only the module/referenceType/referenceId fields. */
function routeFromModule(n: NotificationLike): NotifRoute {
  const mod = (n.module ?? '').toLowerCase();
  const rt  = (n.referenceType ?? '').toLowerCase();
  const ref = n.referenceId;

  if (rt === 'approval' || mod === 'approvals' || mod === 'approval') {
    return ref != null
      ? { stack: 'Approvals', screen: 'ApprovalDetail', params: { itemId: String(ref) } }
      : { stack: 'Approvals', screen: 'ApprovalsInbox' };
  }
  if (mod.startsWith('task')) {
    return ref != null
      ? { stack: 'More', screen: 'TaskDetail', params: { taskId: String(ref) } }
      : { stack: 'More', screen: 'TaskList' };
  }
  if (mod.startsWith('ticket') || mod.includes('sanadkom')) {
    const id = toNum(ref);
    return id != null
      ? { stack: 'Sanadkom', screen: 'TicketDetail', params: { ticketId: id } }
      : { stack: 'Sanadkom', screen: 'TicketList' };
  }
  if (mod.startsWith('leave')) {
    const lid = ref != null ? String(ref) : '';
    return lid
      ? { stack: 'More', screen: 'LeaveDetail', params: { leaveId: lid } }
      : { stack: 'More', screen: 'LeaveHistory' };
  }
  if (mod.startsWith('portal')) {
    if (rt.includes('event')) {
      return ref != null
        ? { stack: 'More', screen: 'EventDetail', params: { eventId: ref } }
        : { stack: 'More', screen: 'Events' };
    }
    if (rt.includes('offer')) {
      const id = toNum(ref);
      return id != null
        ? { stack: 'More', screen: 'OfferDetail', params: { offerId: id } }
        : { stack: 'More', screen: 'Offers' };
    }
    if (rt.includes('news')) {
      const id = toNum(ref);
      return id != null
        ? { stack: 'More', screen: 'NewsDetail', params: { newsId: id } }
        : { stack: 'More', screen: 'News' };
    }
    // default portal → announcement
    const aid = toNum(ref);
    return aid != null
      ? { stack: 'More', screen: 'AnnouncementDetail', params: { announcementId: aid } }
      : { stack: 'More', screen: 'Announcements' };
  }
  if (mod.startsWith('hr') || mod.includes('recognition') || mod.includes('star')) {
    const id = toNum(ref);
    return id != null
      ? { stack: 'More', screen: 'WinnerDetail', params: { winnerId: id } }
      : { stack: 'More', screen: 'Recognition' };
  }
  if (mod.startsWith('epm') || mod.includes('project')) {
    const id = toNum(ref);
    return id != null
      ? { stack: 'More', screen: 'ProjectDetail', params: { projectId: id } }
      : { stack: 'More', screen: 'ProjectList' };
  }
  if (mod.startsWith('pms') || mod.includes('kpi')) return { stack: 'More', screen: 'KPIs' };
  if (mod.startsWith('appraisal')) return { stack: 'More', screen: 'Appraisal' };
  if (mod.startsWith('training')) return { stack: 'More', screen: 'Training' };

  return null;
}

/**
 * Web hub feeds full URLs (`FeedSourceReturnLink` / LinkUrl). Map common query patterns
 * to mobile deep-link paths recognised by routeFromDeepLink.
 */
export function normalizeLegacyNotificationUrlToDeepLink(link?: string | null): string | undefined {
  if (!link?.trim()) return undefined;
  const raw = link.trim();

  const ticketId = extractTicketIdFromLink(raw);
  if (ticketId != null) return `/tickets/${ticketId}`;

  const tu = raw.match(/[?&]TaskUID=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (tu?.[1]) return `/tasks/${tu[1]}`;

  const lu = raw.match(/[?&]LeaveUID=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (lu?.[1]) return `/leave/${lu[1]}`;

  if (raw.startsWith('/')) return raw;

  try {
    const u = new URL(/^https?:/i.test(raw) ? raw : `https://invalid.local/${raw.replace(/^\/+/, '')}`);
    const path = `${u.pathname}${u.search}`;
    if (path.startsWith('/') && path.length > 1) {
      const inner = normalizeLegacyNotificationUrlToDeepLink(path);
      if (inner) return inner;
    }
    return path.startsWith('/') ? path : undefined;
  } catch {
    return undefined;
  }
}

/** Main entry: try deepLink first, then module/referenceType/referenceId. */
export function resolveNotificationRoute(n: NotificationLike): NotifRoute {
  const dl = n?.deepLink?.trim();
  if (dl) {
    const canonical = normalizeLegacyNotificationUrlToDeepLink(dl) ?? dl;
    const webTicketId = extractTicketIdFromLink(canonical) ?? extractTicketIdFromLink(dl);
    if (webTicketId != null) {
      return { stack: 'Sanadkom', screen: 'TicketDetail', params: { ticketId: webTicketId } };
    }
    const byLink = routeFromDeepLink(canonical);
    if (byLink) return byLink;
  }
  return routeFromModule(n);
}

export const MODULE_ICONS: Record<string, string> = {
  task: '📋', tasks: '📋',
  approval: '✅', approvals: '✅',
  leave: '🗓️',
  ticket: '🎫', tickets: '🎫', sanadkom: '🎫',
  announcement: '📢', portal: '📢',
  reminder: '⏰',
  kpi: '📊', pms: '📊', performance: '📊',
  idea: '💡', ibdaa: '💡', innovation: '💡',
  event: '🎉',
  appraisal: '⭐',
  hr: '👥', recognition: '🏆', star: '🏆',
  epm: '🏗️', project: '🏗️', projects: '🏗️',
  training: '🎓',
};

export function iconForNotif(n: NotificationLike): string {
  const keys = [n.module, n.referenceType, n.referenceId].filter(Boolean).map((s) => String(s).toLowerCase());
  for (const k of keys) {
    if (MODULE_ICONS[k]) return MODULE_ICONS[k];
    for (const prefix of Object.keys(MODULE_ICONS)) {
      if (k.includes(prefix)) return MODULE_ICONS[prefix];
    }
  }
  return '🔔';
}

/** Friendly module label for the pill shown on each card. */
export function moduleLabel(n: NotificationLike): string {
  const raw = (n.module ?? '').trim();
  if (!raw) return 'Update';
  const low = raw.toLowerCase();
  if (low === 'hr') return 'HR';
  if (low === 'pms') return 'KPIs';
  if (low === 'epm') return 'Projects';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}
