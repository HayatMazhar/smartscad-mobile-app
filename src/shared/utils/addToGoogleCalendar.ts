import { Linking, Alert } from 'react-native';

/** Short label for start/end dates (list + detail), aligned with web calendar list. */
export function formatRangeShort(startDate?: string, endDate?: string): string {
  const a = (startDate || '').toString().trim();
  const b = (endDate || '').toString().trim();
  if (!a) return '—';
  if (!b || a === b) {
    const d = new Date(a);
    if (Number.isNaN(d.getTime())) return a;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return `${a} – ${b}`;
  return `${d1.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${
    d2.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * Parity with web calendar UX (smartscad/pages/calendar): users add events to
 * their own calendar. Opens Google Calendar's template URL so the event can be
 * saved to Google (and typically synced to the device). No server RSVP.
 */
export function parseEventStartEnd(ev: {
  startDate?: string;
  endDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}): { start: Date; end: Date } {
  const d0 = (ev.startDate ?? ev.date ?? '').toString().trim();
  const d1 = (ev.endDate ?? '').toString().trim();
  const t0 = (ev.startTime ?? '09:00:00').toString().trim();
  const t1 = (ev.endTime ?? '10:00:00').toString().trim();

  const pad = (n: string, def: string) => (n && n.length > 0 ? n : def);

  const pickDate = (d: string) => d || d0;
  const parseOne = (dateStr: string, timeStr: string) => {
    const p = /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr : d0;
    const t = /^\d{1,2}:\d{2}/.test(timeStr) ? timeStr : '09:00:00';
    const [Y, M, D] = p.split(/[-/T ]/g).map((x) => parseInt(x, 10));
    const parts = t.split(':').map((x) => parseInt(x, 10));
    const hh = parts[0] ?? 0;
    const mm = parts[1] ?? 0;
    const ss = parts[2] ?? 0;
    if (!Y || !M || !D) return new Date();
    return new Date(Y, M - 1, D, hh, mm, ss, 0);
  };

  const start = parseOne(pickDate(d0), pad(t0, '09:00:00'));
  const end = d1
    ? parseOne(pickDate(d1), pad(t1, '10:00:00'))
    : new Date(start.getTime() + 60 * 60 * 1000);
  const endAdj = end.getTime() < start.getTime()
    ? new Date(start.getTime() + 60 * 60 * 1000)
    : end;
  return { start, end: endAdj };
}

function toGCalSegment(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}`;
}

export function buildGoogleCalendarUrl(args: {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}): string {
  const dates = `${toGCalSegment(args.start)}/${toGCalSegment(args.end)}`;
  const p = new URL('https://www.google.com/calendar/render');
  p.searchParams.set('action', 'TEMPLATE');
  p.searchParams.set('text', args.title);
  p.searchParams.set('dates', dates);
  if (args.description) p.searchParams.set('details', args.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000));
  if (args.location) p.searchParams.set('location', args.location);
  return p.toString();
}

function stripTags(html: string): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function addEventToGoogleCalendarFromRow(
  ev: {
    id?: number | string;
    title?: string;
    description?: string;
    body?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    locationAr?: string;
  },
  opts?: { languageStartsWithAr?: boolean },
): Promise<void> {
  const title = String(ev.title ?? '').trim() || 'Event';
  const { start, end } = parseEventStartEnd(ev);
  const ar = opts?.languageStartsWithAr;
  const loc = (ar
    ? (ev.locationAr && String(ev.locationAr).trim() ? ev.locationAr : ev.location)
    : (ev.location && String(ev.location).trim() ? ev.location : ev.locationAr)) as string | undefined;
  const details = stripTags(String(ev.description ?? ev.body ?? ''));

  const url = buildGoogleCalendarUrl({ title, start, end, description: details, location: loc ? String(loc) : undefined });

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Calendar', 'Could not open the calendar. Check your device browser or try again.');
  }
}
