/**
 * dateUtils.ts — shared date/time formatting helpers used across the app.
 *
 * Core rule: calendar and task data stored with date-only values arrive from
 * the DB as midnight timestamps (T00:00:00) or as bare time strings "00:00" /
 * "00:00:00". Displaying those raw values shows confusing "00:00" / "12:00 AM"
 * to the user. All helpers here detect the midnight case and omit the time
 * component, showing a clean date-only string instead.
 */

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Returns true when a standalone time string represents midnight ("00:00", "00:00:00", "0:00", etc.) */
export function isMidnightTimeString(t: string | null | undefined): boolean {
  if (!t) return true;
  return /^0?0:00(:[0-9]{2})?$/.test(t.trim());
}

/**
 * Returns true when the time portion of a JS Date (or ISO string) is exactly
 * midnight — i.e. the date was stored without a meaningful time component.
 */
export function isMidnightDate(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

// ---------------------------------------------------------------------------
// Date-only formatting
// ---------------------------------------------------------------------------

/** Format a date as "15 Apr 2026" (no time). Returns "—" on bad input. */
export function formatDateOnly(
  value: string | Date | null | undefined,
  locale = 'en-GB',
): string {
  if (!value) return '—';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Smart datetime formatting — the main export used in card / list views
// ---------------------------------------------------------------------------

/**
 * Formats a datetime value for display. Key behaviours:
 *  • If the time component is midnight, shows date only (no "00:00" / "12:00 AM").
 *  • Otherwise shows date + time in a compact human-readable form.
 *  • Works with both ISO strings and Date objects.
 *
 * @param value   ISO datetime string, Date object, or null/undefined.
 * @param locale  BCP-47 locale tag (defaults to device locale via undefined).
 */
export function formatSmartDateTime(
  value: string | Date | null | undefined,
  locale?: string,
): string {
  if (!value) return '—';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    if (isMidnightDate(d)) {
      return d.toLocaleDateString(locale ?? 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return d.toLocaleString(locale ?? undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    } as Intl.DateTimeFormatOptions);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Time-only formatting (for event/meeting start & end time strings)
// ---------------------------------------------------------------------------

/**
 * Formats a standalone time string (e.g. "09:30:00") for display.
 *  • Returns undefined when the string is midnight ("00:00" / "00:00:00") so
 *    callers can choose to hide the time row entirely.
 *  • Strips seconds so "09:30:00" → "09:30".
 *  • Passes through well-formatted "HH:MM" strings unchanged.
 */
export function formatTimeString(t: string | null | undefined): string | undefined {
  if (!t || isMidnightTimeString(t)) return undefined;
  // Already looks like HH:MM — strip seconds suffix if present
  const trimmed = t.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : trimmed;
}

/**
 * Builds a time range label like "09:30 – 11:00" for display.
 *  • Returns undefined (hide the row) if both values are midnight / absent.
 *  • If only start or end is valid, returns just that one.
 */
export function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string | undefined {
  const s = formatTimeString(startTime);
  const e = formatTimeString(endTime);
  if (!s && !e) return undefined;
  if (s && e) return `${s} – ${e}`;
  return s ?? e;
}
