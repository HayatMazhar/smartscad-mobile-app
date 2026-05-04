import { Platform } from 'react-native';

// Same URL rules as RTK baseQuery — extracted so crash reporters avoid importing baseApi.
const UAT_API_BASE_URL = 'https://uatmobileapi.adsmartsupport.ae/SmartSCADMobileAPI/api/v1';
const LOCAL_WEB_API_BASE = 'http://localhost:5087/api';

function isLocalApiUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url);
}

export function resolveApiBaseUrl(): string {
  const envUrl = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    return `${LOCAL_WEB_API_BASE}/v1`;
  }

  if (envUrl && (Platform.OS === 'android' || Platform.OS === 'ios') && !isLocalApiUrl(envUrl)) {
    return envUrl;
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return UAT_API_BASE_URL;
  }

  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  return `${LOCAL_WEB_API_BASE}/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();
