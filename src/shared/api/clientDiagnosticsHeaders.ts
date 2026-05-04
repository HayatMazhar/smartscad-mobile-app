import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const MAX = { platform: 32, app: 96, model: 160, os: 96 } as const;

function clip(s: string, max: number): string {
  const t = s.replace(/[\r\n]+/g, ' ').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/**
 * Values sent on every API call so servers can correlate failures with
 * user (see X-User-Id in baseApi), OS (iOS / Android / Harmony-equivalent),
 * device OEM/model (e.g. Huawei), and app build.
 */
export function buildClientDiagnosticsHeaders(): Record<string, string> {
  const platform = Platform.OS;

  let deviceModel = '';
  let osVersion = '';

  try {
    if (platform === 'web') {
      deviceModel =
        typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'web';
      osVersion = 'web';
    } else {
      const parts = [Device.manufacturer, Device.brand, Device.modelName].filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      );
      deviceModel = parts.length > 0 ? parts.join(' ') : Device.modelId ?? '';
      osVersion = Device.osVersion ?? '';
      if (Device.osName) {
        osVersion = osVersion ? `${Device.osName} ${osVersion}` : Device.osName;
      }
    }
  } catch {
    deviceModel = platform;
  }

  let appVersion = '';
  try {
    const ver = Application.nativeApplicationVersion;
    const build = Application.nativeBuildVersion;
    if (ver != null && String(ver).length > 0) {
      appVersion = build != null && String(build).length > 0 ? `${ver} (${build})` : String(ver);
    } else {
      appVersion = platform === 'web' ? 'web' : 'unknown';
    }
  } catch {
    appVersion = 'unknown';
  }

  const rnPlatformVersion =
    platform !== 'web' && typeof Platform.Version === 'number' ? String(Platform.Version) : '';

  return {
    'X-Client-Platform': clip(platform, MAX.platform),
    'X-App-Version': clip(appVersion, MAX.app),
    'X-Device-Model': clip(deviceModel || 'unknown', MAX.model),
    'X-OS-Version': clip(osVersion || rnPlatformVersion || 'unknown', MAX.os),
  };
}
