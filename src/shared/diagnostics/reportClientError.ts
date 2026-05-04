import { API_BASE_URL } from '../api/apiBaseUrl';
import { buildClientDiagnosticsHeaders } from '../api/clientDiagnosticsHeaders';
import { getClientScreenForApi } from '../navigation/navigationTelemetry';
import { store } from '../../store/store';
import type { RootState } from '../../store/store';
import {
  enqueuePendingClientError,
  loadPendingQueue,
  replacePendingQueue,
  type PendingClientError,
} from './clientErrorQueue';

export type ClientErrorSource = 'react_boundary' | 'global_js' | 'unhandled_promise';

const DEDUPE_MS = 90_000;
const dedupeUntil = new Map<string, number>();

function pruneDedupe(now: number) {
  for (const [k, t] of dedupeUntil) {
    if (now - t > DEDUPE_MS) dedupeUntil.delete(k);
  }
}

function shouldSkipDuplicate(source: string, message: string): boolean {
  const key = `${source}:${message.slice(0, 160)}`;
  const now = Date.now();
  pruneDedupe(now);
  const prev = dedupeUntil.get(key);
  if (prev !== undefined && now - prev < DEDUPE_MS) return true;
  dedupeUntil.set(key, now);
  return false;
}

function buildHeaders(auth: RootState['auth']): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': auth.language ?? 'en',
  });
  const token = auth.accessToken?.trim();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const uid = auth.user?.userId?.trim();
  if (uid) headers.set('X-User-Id', uid);
  Object.entries(buildClientDiagnosticsHeaders()).forEach(([k, v]) => {
    if (v) headers.set(k, v);
  });
  const screen = getClientScreenForApi();
  if (screen) headers.set('X-Client-Screen', screen);
  return headers;
}

async function postReport(auth: RootState['auth'], body: PendingClientError): Promise<boolean> {
  const token = auth.accessToken?.trim();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/client-errors`, {
      method: 'POST',
      headers: buildHeaders(auth),
      body: JSON.stringify({
        message: body.message,
        stackTrace: body.stackTrace ?? null,
        source: body.source,
        isFatal: body.isFatal,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Report JS/React errors that never hit the ASP.NET exception pipeline.
 * When logged out, queues locally (MMKV / localStorage) and flushes after login.
 */
export async function reportClientError(payload: {
  message: string;
  stackTrace?: string | null;
  source: ClientErrorSource;
  isFatal?: boolean;
}): Promise<void> {
  const msg = (payload.message ?? '').trim();
  if (!msg || shouldSkipDuplicate(payload.source, msg)) return;

  const row: Omit<PendingClientError, 'queuedAt'> = {
    message: msg.slice(0, 4000),
    stackTrace: payload.stackTrace ? String(payload.stackTrace).slice(0, 120_000) : null,
    source: payload.source,
    isFatal: !!payload.isFatal,
  };

  const auth = store.getState().auth;
  if (!auth.accessToken?.trim()) {
    enqueuePendingClientError(row);
    return;
  }

  const ok = await postReport(auth, { ...row, queuedAt: Date.now() });
  if (!ok) enqueuePendingClientError(row);
}

/** Send queued rows — call after login / on boot when session exists. */
export async function flushQueuedClientErrors(): Promise<void> {
  const auth = store.getState().auth;
  if (!auth.accessToken?.trim()) return;

  let pending = loadPendingQueue();
  if (pending.length === 0) return;

  const remaining: PendingClientError[] = [];
  for (const row of pending) {
    const ok = await postReport(auth, row);
    if (!ok) remaining.push(row);
  }
  replacePendingQueue(remaining);
}
