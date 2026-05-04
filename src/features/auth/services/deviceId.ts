import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { secureGet, secureSet, SECURE_KEYS } from './secureStore';

export interface DeviceFingerprint {
  /** Stable per-install GUID — survives reboots / app updates, lost on uninstall. */
  deviceId: string;
  /** Human-friendly device name shown in the trusted-devices list. */
  deviceName: string;
  /** "ios" | "android" | "web". */
  platform: string;
  /** Mobile app version, e.g. "1.0.0". */
  appVersion: string;
}

let cached: DeviceFingerprint | null = null;
let inflight: Promise<DeviceFingerprint> | null = null;

function buildName(): string {
  const parts = [Device.manufacturer, Device.modelName ?? Device.deviceName].filter(Boolean);
  const label = parts.join(' ').trim();
  if (label) return label;
  return Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web';
}

/**
 * Generate a v4 GUID using `expo-crypto.getRandomBytes` (works in release
 * builds without native UUID dependencies). Falls back to `Math.random`
 * only if crypto is unavailable, which is fine for the trust-device key.
 */
function newGuid(): string {
  try {
    const bytes = Crypto.getRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  } catch {
    const rnd = (n: number) => Math.floor(Math.random() * n).toString(16).padStart(2, '0');
    return Array.from({ length: 16 }, () => rnd(256))
      .reduce((acc, byte, i) => acc + byte + ([3, 5, 7, 9].includes(i) ? '-' : ''), '');
  }
}

/**
 * Returns a stable per-install device fingerprint. The deviceId is created
 * once and persisted in `expo-secure-store` so it survives app restarts.
 * If you uninstall + reinstall, a new id is generated and the user will
 * get an OTP again on first login (intentional — the install is "new").
 */
export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    let id = await secureGet(SECURE_KEYS.deviceId);
    if (!id || id.length < 16) {
      id = newGuid();
      await secureSet(SECURE_KEYS.deviceId, id);
    }
    const fp: DeviceFingerprint = {
      deviceId: id,
      deviceName: buildName(),
      platform: Platform.OS,
      appVersion: Application.nativeApplicationVersion ?? '1.0.0',
    };
    cached = fp;
    return fp;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Forget the cached fingerprint — used in tests and after a hard
 * "forget this device" action.
 */
export function _clearDeviceFingerprintCache() {
  cached = null;
}
