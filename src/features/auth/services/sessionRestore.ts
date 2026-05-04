import { Platform } from 'react-native';
import { store } from '../../../store/store';
import { setCredentials, type UserProfile } from './authSlice';
import { secureGet, SECURE_KEYS } from './secureStore';
import { API_BASE_URL } from '../../../store/baseApi';

/**
 * Outcome of {@link tryRestoreSession}. The caller (App.tsx) uses this to
 * decide whether to show the home screen or the login screen after the
 * splash. We return a discriminated reason so the UI / logs can surface a
 * meaningful "why" without leaking secrets.
 */
export type RestoreOutcome =
  | { ok: true }
  | { ok: false; reason: 'web' | 'no_token' | 'refresh_failed' | 'network'; detail?: string };

/**
 * Silent token-refresh boot path. Biometrics have been removed for now —
 * if a refresh token is cached we simply exchange it for a fresh pair on
 * boot and drop the user straight onto the home screen. A failed refresh
 * sends them back to the login screen.
 *
 * Sequence:
 *   1. Skip on web (SecureStore is in-memory only there — no persistence
 *      across reloads, and the user just typed their password seconds ago).
 *   2. Read refresh + access tokens from SecureStore. Missing → login.
 *   3. POST `/auth/refresh` to rotate the pair.
 *   4. Dispatch setCredentials so RootNavigator flips to the home tabs.
 *
 * Any failure leaves the user on the login screen with the cached
 * `lastUsername` pre-filled.
 */
export async function tryRestoreSession(): Promise<RestoreOutcome> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'web' };
  }

  try {
    const [refreshToken, accessToken, profileJson] = await Promise.all([
      secureGet(SECURE_KEYS.refreshToken),
      secureGet(SECURE_KEYS.accessToken),
      secureGet(SECURE_KEYS.userProfile),
    ]);

    if (!refreshToken || !accessToken) {
      return { ok: false, reason: 'no_token' };
    }

    // Exchange the cached refresh token for a fresh pair. We hit the API
    // directly (not via RTK Query) because the store is empty at boot —
    // RTK's prepareHeaders would attach a stale / empty Bearer.
    //
    // 12s timeout — the splash is sitting on top of this call. Without a
    // bound, a slow / dead UAT network would hold the user on the splash
    // screen indefinitely.
    let res: Response;
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 12000);
    try {
      res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      const aborted = e?.name === 'AbortError';
      return { ok: false, reason: 'network', detail: aborted ? 'timeout (12s)' : e?.message };
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return { ok: false, reason: 'refresh_failed', detail: `HTTP ${res.status}` };
    }

    const json: any = await res.json().catch(() => null);
    const data = json?.data ?? json;
    const newAccess: string | undefined = data?.accessToken;
    const newRefresh: string | undefined = data?.refreshToken;
    const apiUser: Partial<UserProfile> | undefined = data?.user;
    if (!newAccess || !newRefresh) {
      return { ok: false, reason: 'refresh_failed', detail: 'malformed response' };
    }

    // Merge the API user (UserId/DisplayName/Email only — refresh doesn't
    // echo Department/JobTitle) with the cached profile so the home banner
    // has the full set without an immediate /auth/me roundtrip.
    let cachedProfile: UserProfile | null = null;
    if (profileJson) {
      try { cachedProfile = JSON.parse(profileJson) as UserProfile; } catch { /* ignore */ }
    }
    const user: UserProfile = {
      userId: apiUser?.userId || cachedProfile?.userId || '',
      displayName: apiUser?.displayName || cachedProfile?.displayName || '',
      email: apiUser?.email || cachedProfile?.email,
      department: apiUser?.department ?? cachedProfile?.department,
      jobTitle: apiUser?.jobTitle ?? cachedProfile?.jobTitle,
      profileImageUrl: apiUser?.profileImageUrl ?? cachedProfile?.profileImageUrl,
      // Persona fields — the API enriches the refresh response with persona
      // every time, but we fall back to the cached profile so an older API
      // (or a transient persona-SP failure) doesn't downgrade an executive
      // back to the generic worker home on cold start.
      persona: apiUser?.persona ?? cachedProfile?.persona,
      isExecutive: apiUser?.isExecutive ?? cachedProfile?.isExecutive,
      isManager: apiUser?.isManager ?? cachedProfile?.isManager,
      hasDelegates: apiUser?.hasDelegates ?? cachedProfile?.hasDelegates,
      directReportsCount: apiUser?.directReportsCount ?? cachedProfile?.directReportsCount,
    };

    store.dispatch(setCredentials({
      accessToken: newAccess,
      refreshToken: newRefresh,
      user,
    }));

    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'refresh_failed', detail: e?.message };
  }
}
