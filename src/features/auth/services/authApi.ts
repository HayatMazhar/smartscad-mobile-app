import { baseApi, API_BASE_URL } from '../../../store/baseApi';
import { getDeviceFingerprint } from './deviceId';

interface LoginRequestBody {
  username: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
}

// Re-export the canonical UserProfile from authSlice so we have one source
// of truth for the shape (including persona fields). Earlier this file
// declared its own slimmer copy that omitted persona / isExecutive — that
// caused dev impersonation responses to silently drop the persona flag and
// the Executive Cockpit layout never rendered for DG users.
export type { UserProfile } from './authSlice';
import type { UserProfile } from './authSlice';

/**
 * Discriminated response for `/auth/login`:
 *
 *   - `tokens`: device is trusted (or OTP feature disabled). The access +
 *     refresh tokens are issued immediately.
 *   - `otp_required`: password OK but the device is untrusted. The mobile
 *     app must call `/auth/otp/verify` with the code we just emailed.
 */
export interface LoginTokensResponse {
  kind: 'tokens';
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface LoginOtpRequiredResponse {
  kind: 'otp_required';
  otpSessionId: string;
  maskedEmail: string;
  validitySeconds: number;
  /** Partial user (display name only) — the full profile arrives after verify. */
  user?: Partial<UserProfile>;
  /**
   * 🚧 DEV / TEST ONLY. Populated only when the API has
   * `Otp:DebugEchoCode` enabled — surfaces the plaintext OTP so the login
   * screen can show it for self-service testing. ALWAYS undefined in
   * production.
   */
  debugCode?: string;
}

export type LoginResponse = LoginTokensResponse | LoginOtpRequiredResponse;

export interface RefreshRequest {
  accessToken: string;
  refreshToken: string;
}

export interface OtpRequestBody {
  otpSessionId: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
}

export interface OtpRequestResponse {
  otpSessionId: string;
  maskedEmail: string;
  validitySeconds: number;
  expiresAt: string;
  /**
   * 🚧 DEV / TEST ONLY. Populated only when the API has
   * `Otp:DebugEchoCode` enabled — surfaces the plaintext OTP so the login
   * screen can show it for self-service testing. ALWAYS undefined in
   * production.
   */
  debugCode?: string;
}

export interface OtpVerifyBody {
  otpSessionId: string;
  code: string;
  /** Persist this device so future logins skip OTP. Defaults to true. */
  trustDevice?: boolean;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
}

/**
 * Server-driven Microsoft sign-in config — we fetch this on the way into
 * the WebView so the tenant id / client id / redirect URI can be rotated
 * server-side without shipping a new APK.
 */
export interface MicrosoftAuthConfig {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  scope: string;
  responseType: string;
}

/** Body for `POST /auth/microsoft/exchange`. */
export interface MicrosoftExchangeBody {
  idToken: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
}

/**
 * Try Windows Negotiate auth (browser sends NTLM/Kerberos token automatically).
 * Uses raw fetch with credentials:'include' — cannot go through RTK Query's base query
 * because that sets Authorization: Bearer which conflicts with Negotiate.
 */
export async function tryWindowsLogin(): Promise<LoginTokensResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/windows`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.success ? json.data : json;
    if (data && (data as any).accessToken) {
      return { kind: 'tokens', ...(data as Omit<LoginTokensResponse, 'kind'>) };
    }
    return null;
  } catch {
    return null;
  }
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Sign in with username + password. Returns either tokens (trusted
     * device) or `otp_required` with a session id the client should use to
     * complete `/auth/otp/verify`.
     *
     * The device fingerprint (deviceId/name/platform/version) is attached
     * automatically so callers don't need to plumb it through.
     */
    login: builder.mutation<LoginResponse, { username: string; password: string }>({
      queryFn: async ({ username, password }, _api, _extra, baseQuery) => {
        const fp = await getDeviceFingerprint();
        const body: LoginRequestBody = {
          username,
          password,
          deviceId: fp.deviceId,
          deviceName: fp.deviceName,
          platform: fp.platform,
          appVersion: fp.appVersion,
        };
        const res = await baseQuery({ url: '/auth/login', method: 'POST', body });
        if (res.error) return { error: res.error };
        // Server may omit "kind" for legacy responses — default to "tokens".
        const data = res.data as Partial<LoginResponse> & { accessToken?: string; otpSessionId?: string };
        if (!data.kind) {
          data.kind = data.otpSessionId ? 'otp_required' : 'tokens';
        }
        return { data: data as LoginResponse };
      },
    }),
    /** Re-issue an OTP for an existing session (the "Resend code" button). */
    requestOtp: builder.mutation<OtpRequestResponse, { otpSessionId: string }>({
      queryFn: async ({ otpSessionId }, _api, _extra, baseQuery) => {
        const fp = await getDeviceFingerprint();
        const body: OtpRequestBody = {
          otpSessionId,
          deviceId: fp.deviceId,
          deviceName: fp.deviceName,
          platform: fp.platform,
          appVersion: fp.appVersion,
        };
        const res = await baseQuery({ url: '/auth/otp/request', method: 'POST', body });
        if (res.error) return { error: res.error };
        return { data: res.data as OtpRequestResponse };
      },
    }),
    /** Verify the OTP code — on success the response is the standard tokens shape. */
    verifyOtp: builder.mutation<LoginTokensResponse, { otpSessionId: string; code: string; trustDevice?: boolean }>({
      queryFn: async ({ otpSessionId, code, trustDevice = true }, _api, _extra, baseQuery) => {
        const fp = await getDeviceFingerprint();
        const body: OtpVerifyBody = {
          otpSessionId,
          code,
          trustDevice,
          deviceId: fp.deviceId,
          deviceName: fp.deviceName,
          platform: fp.platform,
          appVersion: fp.appVersion,
        };
        const res = await baseQuery({ url: '/auth/otp/verify', method: 'POST', body });
        if (res.error) return { error: res.error };
        const d = res.data as any;
        return { data: { kind: 'tokens', ...d } as LoginTokensResponse };
      },
    }),
    /**
     * Fetch Microsoft sign-in config (tenant id, client id, redirect URI)
     * from the server so the WebView can build the auth URL without
     * baking these values into the app binary.
     */
    getMicrosoftAuthConfig: builder.query<MicrosoftAuthConfig, void>({
      query: () => '/auth/microsoft/config',
    }),
    /**
     * Exchange a Microsoft Entra ID `id_token` (extracted from the
     * WebView redirect URL fragment) for a SmartSCAD JWT + refresh token.
     */
    microsoftExchange: builder.mutation<LoginTokensResponse, { idToken: string }>({
      queryFn: async ({ idToken }, _api, _extra, baseQuery) => {
        const fp = await getDeviceFingerprint();
        const body: MicrosoftExchangeBody = {
          idToken,
          deviceId: fp.deviceId,
          deviceName: fp.deviceName,
          platform: fp.platform,
          appVersion: fp.appVersion,
        };
        const res = await baseQuery({ url: '/auth/microsoft/exchange', method: 'POST', body });
        if (res.error) return { error: res.error };
        const d = res.data as any;
        return { data: { kind: 'tokens', ...d } as LoginTokensResponse };
      },
    }),
    refreshToken: builder.mutation<LoginTokensResponse, RefreshRequest>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
      transformResponse: (data: any): LoginTokensResponse => ({ kind: 'tokens', ...(data as Omit<LoginTokensResponse, 'kind'>) }),
    }),
    revokeToken: builder.mutation<void, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/revoke',
        method: 'POST',
        body,
      }),
    }),
    getMe: builder.query<UserProfile, void>({
      query: () => '/auth/me',
      providesTags: ['Profile'],
    }),
    /**
     * Fetches the persona / executive flag for the signed-in user.
     * Used by the debug persona badge so QA can see what the API derives
     * (and refetch after changing roles / delegations) without re-logging in.
     */
    getMyPersona: builder.query<{
      persona?: 'DG' | 'ED' | 'DIRECTOR' | 'MANAGER' | 'WORKER';
      isExecutive?: boolean;
      isManager?: boolean;
      hasDelegates?: boolean;
      directReportsCount?: number;
      sectorId?: number | null;
      sectorName?: string | null;
      departmentId?: number | null;
      departmentName?: string | null;
    }, void>({
      query: () => '/auth/me/persona',
      providesTags: ['Profile'],
    }),
    getMyRights: builder.query<{ assets: Record<number, number[]>; loadedAt?: string }, void>({
      query: () => '/auth/my-rights',
    }),
    refreshMyRights: builder.mutation<{ assets: Record<number, number[]>; loadedAt?: string }, void>({
      query: () => ({ url: '/auth/my-rights/refresh', method: 'POST' }),
    }),
    // 🚧 DEV-ONLY — temporary "login as …" picker. Server returns 404 in non-Development builds.
    getDevUsers: builder.query<DevUser[], string | void>({
      query: (search) => `/auth/dev/users${search ? `?search=${encodeURIComponent(search as string)}` : ''}`,
    }),
    impersonateUser: builder.mutation<LoginTokensResponse, { userId: string }>({
      query: (body) => ({
        url: '/auth/dev/impersonate',
        method: 'POST',
        body,
      }),
      transformResponse: (data: any): LoginTokensResponse => ({ kind: 'tokens', ...(data as Omit<LoginTokensResponse, 'kind'>) }),
    }),
  }),
});

export interface DevUser {
  userId: string;
  domainUserId?: string;
  displayName: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  entityId?: number;
}

export const {
  useLoginMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useRevokeTokenMutation,
  useGetMeQuery,
  useGetMyPersonaQuery,
  useLazyGetMyPersonaQuery,
  useGetMyRightsQuery,
  useRefreshMyRightsMutation,
  useGetDevUsersQuery,
  useImpersonateUserMutation,
  useGetMicrosoftAuthConfigQuery,
  useMicrosoftExchangeMutation,
} = authApi;
