import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

const STORAGE_NS = 'reporting-assignable';

export type PersistedAssignablePerson = {
  userId: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
};

type PersistedPayload = {
  ownerUserId: string;
  users: PersistedAssignablePerson[];
  savedAt: number;
};

let mmkv: { getString: (k: string) => string | undefined; set: (k: string, v: string) => void; delete: (k: string) => void } | null = null;

function getMmkv() {
  if (Platform.OS === 'web') return null;
  if (isRunningInExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    if (!mmkv) mmkv = new MMKV({ id: STORAGE_NS });
    return mmkv;
  } catch {
    return null;
  }
}

function keyFor(ownerUserId: string) {
  return `assignable_users_v1_${ownerUserId.replace(/\\/g, '_')}`;
}

export function loadReportingAssignableSnapshot(ownerUserId: string): PersistedAssignablePerson[] {
  if (!ownerUserId) return [];
  try {
    const k = keyFor(ownerUserId);
    let raw: string | null | undefined;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') raw = localStorage.getItem(k) ?? undefined;
    else raw = getMmkv()?.getString(k);
    if (!raw) return [];
    const p = JSON.parse(raw) as PersistedPayload;
    if (!p?.users?.length || p.ownerUserId !== ownerUserId) return [];
    return p.users;
  } catch {
    return [];
  }
}

/** Persist list for offline / instant pickers — refreshed when assignment-options returns. */
export function saveReportingAssignableSnapshot(ownerUserId: string, users: PersistedAssignablePerson[]) {
  if (!ownerUserId) return;
  try {
    const payload: PersistedPayload = {
      ownerUserId,
      users,
      savedAt: Date.now(),
    };
    const json = JSON.stringify(payload);
    const k = keyFor(ownerUserId);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(k, json);
    else getMmkv()?.set(k, json);
  } catch {
    /* ignore */
  }
}

export function clearReportingAssignableStorageFor(ownerUserId: string) {
  try {
    const k = keyFor(ownerUserId);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.removeItem(k);
    else getMmkv()?.delete(k);
  } catch {
    /* ignore */
  }
}
