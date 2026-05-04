import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from './store';
import { API_BASE_URL } from '../shared/api/apiBaseUrl';
import { buildClientDiagnosticsHeaders } from '../shared/api/clientDiagnosticsHeaders';
import { getClientScreenForApi } from '../shared/navigation/navigationTelemetry';
import { logout, silentSessionTokensUpdated } from '../features/auth/services/authSlice';
import type { UserProfile } from '../features/auth/services/authSlice';

/** Re-export for callers that already imported from baseApi. */
export { API_BASE_URL };

/** Strip repeated { success, data } envelopes (e.g. double-wrapped mock payloads). */
function unwrapEnvelope(payload: unknown): unknown {
  let cur: any = payload;
  for (let i = 0; i < 5; i++) {
    if (
      cur !== null &&
      typeof cur === 'object' &&
      typeof cur.success === 'boolean' &&
      'data' in cur &&
      cur.data !== undefined
    ) {
      cur = cur.data;
    } else {
      break;
    }
  }
  return cur;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const auth = (getState() as RootState).auth;
    if (auth.accessToken) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`);
    }
    const uid = auth.user?.userId?.trim();
    if (uid) {
      headers.set('X-User-Id', uid);
    }
    headers.set('Accept-Language', auth.language ?? 'en');
    const diag = buildClientDiagnosticsHeaders();
    Object.entries(diag).forEach(([k, v]) => {
      if (v) headers.set(k, v);
    });
    const screen = getClientScreenForApi();
    if (screen) headers.set('X-Client-Screen', screen);
    return headers;
  },
});

/**
 * Wraps fetchBaseQuery to automatically unwrap the API envelope.
 * The .NET API returns { success: bool, data: T } — screens expect T directly.
 * On HTTP 401 (expired access token), performs one silent `/auth/refresh` round-trip
 * and retries the original request (unless the call is already part of auth flows).
 */
const unwrappingBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.data !== undefined && result.data !== null) {
    return { ...result, data: unwrapEnvelope(result.data) };
  }
  return result;
};

function endpointPath(args: string | FetchArgs): string {
  if (typeof args === 'string') return args;
  return typeof args.url === 'string' ? args.url : '';
}

function skip401SilentRefresh(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.includes('/auth/login') ||
    p.includes('/auth/otp/') ||
    p.includes('/auth/refresh') ||
    p.includes('/auth/microsoft/exchange') ||
    p.includes('/auth/dev/impersonate') ||
    p.includes('/auth/windows')
  );
}

/** Single-flight refresh so parallel 401s share one POST /auth/refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function silentRefresh(api: Parameters<BaseQueryFn>[1]): Promise<boolean> {
  const snap = (api.getState() as RootState).auth;
  if (!snap.refreshToken || !snap.accessToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<boolean> => {
      try {
        const res = await rawBaseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { accessToken: snap.accessToken, refreshToken: snap.refreshToken },
          },
          api,
          {},
        );
        if (res.error) {
          const st = res.error.status;
          if (typeof st === 'number' && (st === 401 || st === 403)) {
            api.dispatch(logout());
          }
          return false;
        }
        const payload = unwrapEnvelope(res.data) as {
          accessToken?: string;
          refreshToken?: string;
          user?: Partial<UserProfile>;
        };
        if (!payload?.accessToken || !payload?.refreshToken) return false;
        api.dispatch(
          silentSessionTokensUpdated({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: payload.user,
          }),
        );
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const path = endpointPath(args);
  let result = await unwrappingBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !skip401SilentRefresh(path)) {
    const refreshed = await silentRefresh(api);
    if (refreshed) {
      result = await unwrappingBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Tasks',
    'Leave',
    'Attendance',
    'Tickets',
    'Profile',
    'Notifications',
    'EPMProjects',
    'KPIs',
    'News',
    'Appraisal',
    'Portal',
    'HR',
    'Approvals',
    'Attachments',
    'Executive',
    'TasksSvc',
    'LeaveSvc',
    'AttendanceSvc',
    'TicketsSvc',
    'ProfileSvc',
    'NotificationsSvc',
    'EpmSvc',
    'PmsSvc',
    'PortalSvc',
    'HRSvc',
    'AppraisalSvc',
    'ScadStarSvc',
    'FinanceSvc',
    'FinanceV2',
  ],
  endpoints: () => ({}),
});
