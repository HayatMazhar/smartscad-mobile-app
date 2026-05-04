/**
 * Normalizes RTK Query / API payloads that may be a raw array, `{ data: [] }`, `{ items: [] }`,
 * or nested envelopes after partial unwrapping.
 */
export function asArray<T = unknown>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.Data)) return o.Data as T[];
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.Items)) return o.Items as T[];
    if (Array.isArray(o.results)) return o.results as T[];
    if (Array.isArray(o.balances)) return o.balances as T[];
    if (Array.isArray(o.days)) return o.days as T[];
  }
  return [];
}

/**
 * Some list endpoints return a bare array, a single { data: [] } envelope, or .NET-style { Data: [] }.
 * Use for Saahem leaderboard and similar when rows might not land as a top-level array.
 */
export function asLeaderboardList(data: unknown): unknown[] {
  const a = asArray(data);
  if (a.length > 0) return a;
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    for (const k of ['leaders', 'Leaders', 'data', 'Data', 'rows', 'Rows', 'items', 'Items', 'results', 'Results'] as const) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export type SaahemLeaderboardMeta = {
  resolvedYear?: number | null;
  resolvedQuarter?: string | null;
  recentN?: number | null;
  firstContribution?: string | null;
  lastContribution?: string | null;
  ResolvedYear?: number | null;
  ResolvedQuarter?: string | null;
  RecentN?: number | null;
  FirstContribution?: string | null;
  LastContribution?: string | null;
};

/** Unwraps optional { success, data } layers, then reads { meta, leaders } or a bare array (legacy). */
export function parseSaahemLeaderboardPayload(raw: unknown): { meta: SaahemLeaderboardMeta | null; leaders: unknown[] } {
  let cur: any = raw;
  for (let i = 0; i < 5; i++) {
    if (
      cur !== null &&
      typeof cur === 'object' &&
      typeof cur.success === 'boolean' &&
      cur.data !== undefined
    ) {
      cur = cur.data;
    } else {
      break;
    }
  }
  if (cur !== null && typeof cur === 'object' && !Array.isArray(cur)) {
    const meta = (cur as Record<string, unknown>).meta ?? (cur as Record<string, unknown>).Meta;
    const leadersRaw = (cur as Record<string, unknown>).leaders ?? (cur as Record<string, unknown>).Leaders;
    if (Array.isArray(leadersRaw)) {
      return { meta: (meta as SaahemLeaderboardMeta) ?? null, leaders: leadersRaw };
    }
  }
  if (Array.isArray(cur)) {
    return { meta: null, leaders: cur };
  }
  return { meta: null, leaders: asLeaderboardList(cur) };
}

export function asObject<T extends object = Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (typeof data === 'object' && !Array.isArray(data)) return data as T;
  return null;
}

/** Safe numeric reduce for KPI-style averages */
export function safeAvg(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}
