import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

const STORAGE_KEY = 'smartscad_client_err_q_v1';
const MAX_ITEMS = 25;

export type PendingClientError = {
  message: string;
  stackTrace?: string | null;
  source: string;
  isFatal: boolean;
  queuedAt: number;
};

let mmkv: { getString: (k: string) => string | undefined; set: (k: string, v: string) => void } | null = null;

function getMmkv() {
  if (Platform.OS === 'web') return null;
  if (isRunningInExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    if (!mmkv) mmkv = new MMKV({ id: 'client-error-queue' });
    return mmkv;
  } catch {
    return null;
  }
}

function loadRaw(): PendingClientError[] {
  try {
    let raw: string | null | undefined;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') raw = localStorage.getItem(STORAGE_KEY) ?? undefined;
    else raw = getMmkv()?.getString(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is PendingClientError =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as PendingClientError).message === 'string' &&
        typeof (x as PendingClientError).source === 'string',
    );
  } catch {
    return [];
  }
}

function saveRaw(items: PendingClientError[]) {
  try {
    const json = JSON.stringify(items.slice(-MAX_ITEMS));
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, json);
    else getMmkv()?.set(STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
}

export function enqueuePendingClientError(payload: Omit<PendingClientError, 'queuedAt'>) {
  const next = loadRaw();
  next.push({ ...payload, queuedAt: Date.now() });
  saveRaw(next.slice(-MAX_ITEMS));
}

export function replacePendingQueue(items: PendingClientError[]) {
  saveRaw(items.slice(-MAX_ITEMS));
}

export function loadPendingQueue(): PendingClientError[] {
  return loadRaw().slice(-MAX_ITEMS);
}
