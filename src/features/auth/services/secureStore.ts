import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper around `expo-secure-store` that falls back to in-memory
 * storage on web (where SecureStore is a no-op). Used to persist anything
 * sensitive that survives app restarts: device id, refresh + access tokens,
 * the cached profile, and the last-used username for the login screen.
 */
const memFallback = new Map<string, string>();

const isAvailable = Platform.OS !== 'web';

export async function secureGet(key: string): Promise<string | null> {
  if (!isAvailable) return memFallback.get(key) ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memFallback.get(key) ?? null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (!isAvailable) {
    memFallback.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {
    memFallback.set(key, value);
  }
}

export async function secureDelete(key: string): Promise<void> {
  if (!isAvailable) {
    memFallback.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    memFallback.delete(key);
  }
}

export const SECURE_KEYS = {
  /** Persistent per-install device id sent to the API on every login attempt. */
  deviceId: 'sanadkom.device_id',
  /** Last refresh token — used to silently re-issue tokens at app boot. */
  refreshToken: 'sanadkom.refresh_token',
  /** Last access token — short-lived cache; the refresh endpoint accepts an expired one. */
  accessToken: 'sanadkom.access_token',
  /** Cached profile (JSON) so we can show name + avatar before /auth/me roundtrips. */
  userProfile: 'sanadkom.user_profile',
  /** Username last used to log in (pre-fill the username field on the login screen). */
  lastUsername: 'sanadkom.last_username',
  /**
   * Legacy biometric opt-in key. Kept here so we can still `secureDelete()` it
   * during sign-out / migration; no code reads this any more.
   * TODO(remove): drop in the next major version once all installs are upgraded.
   */
  biometricEnabled: 'sanadkom.biometric_enabled',
} as const;
