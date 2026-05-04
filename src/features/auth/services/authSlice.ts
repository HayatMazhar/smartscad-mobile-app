import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RightsMap } from '../../../shared/rights/enums';
import { secureSet, secureDelete, SECURE_KEYS } from './secureStore';

export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  profileImageUrl?: string;
  // Executive Cockpit persona fields
  persona?: 'DG' | 'ED' | 'DIRECTOR' | 'MANAGER' | 'WORKER';
  isExecutive?: boolean;
  isManager?: boolean;
  hasDelegates?: boolean;
  directReportsCount?: number;
}

export interface PendingOtpSession {
  otpSessionId: string;
  maskedEmail: string;
  /** Username typed at the password screen — needed if the user wants to "Sign in with another account". */
  username: string;
  /** Display name returned by the server for the OTP screen header. */
  displayName?: string;
  /** Server-supplied OTP validity (seconds). UI uses this for the countdown. */
  validitySeconds: number;
  /** Wall-clock issuance time (epoch ms) — used to compute time remaining. */
  issuedAt: number;
  /**
   * 🚧 DEV / TEST ONLY. Plaintext OTP echoed back by the API when
   * `Otp:DebugEchoCode` is enabled server-side. The login screen renders
   * this in a "Test mode" banner so QA can sign in without checking email.
   * ALWAYS undefined in production builds.
   */
  debugCode?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  language: string;
  theme: 'light' | 'dark';
  rights: RightsMap | null;
  /** Set after `/auth/login` returns `otp_required`; cleared on verify or cancel. */
  pendingOtp: PendingOtpSession | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  language: 'en',
  theme: 'light',
  rights: null,
  pendingOtp: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; user: UserProfile }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.pendingOtp = null;
      // Best-effort persistence for silent token refresh on next boot.
      void persistAuthArtifacts(action.payload);
    },
    /**
     * Updates JWT pair after a silent in-flight refresh (RTK baseQuery 401 retry).
     * Does NOT reset RTK caches — unlike {@link setCredentials} — so concurrent
     * queries don't thrash; see {@link resetCachesOnUserChangeMiddleware}.
     */
    silentSessionTokensUpdated: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user?: Partial<UserProfile> }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      const prev = state.user;
      const u = action.payload.user;
      if (prev && u) {
        state.user = {
          ...prev,
          ...u,
          userId: u.userId || prev.userId,
          displayName: u.displayName || prev.displayName,
          email: u.email ?? prev.email,
          department: u.department ?? prev.department,
          jobTitle: u.jobTitle ?? prev.jobTitle,
          profileImageUrl: u.profileImageUrl ?? prev.profileImageUrl,
          persona: u.persona ?? prev.persona,
          isExecutive: u.isExecutive ?? prev.isExecutive,
          isManager: u.isManager ?? prev.isManager,
          hasDelegates: u.hasDelegates ?? prev.hasDelegates,
          directReportsCount: u.directReportsCount ?? prev.directReportsCount,
        };
      } else if (u?.userId && u.displayName) {
        state.user = u as UserProfile;
      }
      if (state.user && state.accessToken && state.refreshToken) {
        void persistAuthArtifacts({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          user: state.user,
        });
      }
    },
    setRights: (state, action: PayloadAction<RightsMap | null>) => {
      state.rights = action.payload;
    },
    /** Move into the OTP-required state after a successful password check. */
    setPendingOtp: (state, action: PayloadAction<PendingOtpSession>) => {
      state.pendingOtp = action.payload;
    },
    /** Update the masked email / validity after a "Resend code" call. */
    refreshPendingOtp: (state, action: PayloadAction<{ otpSessionId: string; validitySeconds: number; maskedEmail?: string; debugCode?: string }>) => {
      if (!state.pendingOtp) return;
      state.pendingOtp.otpSessionId = action.payload.otpSessionId;
      state.pendingOtp.validitySeconds = action.payload.validitySeconds;
      state.pendingOtp.issuedAt = Date.now();
      if (action.payload.maskedEmail) state.pendingOtp.maskedEmail = action.payload.maskedEmail;
      // 🚧 DEV / TEST ONLY — refresh (or clear) the echoed OTP banner.
      state.pendingOtp.debugCode = action.payload.debugCode;
    },
    clearPendingOtp: (state) => {
      state.pendingOtp = null;
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.rights = null;
      state.pendingOtp = null;
      void clearAuthArtifacts();
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

// Side-effect helpers — kept outside the reducer so it stays pure. Failures
// are silent: SecureStore is best-effort and a missing token just means the
// user goes through the full password flow next time.
async function persistAuthArtifacts(payload: { accessToken: string; refreshToken: string; user: UserProfile }) {
  try {
    await secureSet(SECURE_KEYS.refreshToken, payload.refreshToken);
    await secureSet(SECURE_KEYS.accessToken, payload.accessToken);
    await secureSet(SECURE_KEYS.userProfile, JSON.stringify(payload.user));
    if (payload.user?.userId) {
      await secureSet(SECURE_KEYS.lastUsername, payload.user.userId.replace(/^.*\\/, ''));
    }
  } catch {
    /* SecureStore not available (web) — fine. */
  }
}

async function clearAuthArtifacts() {
  try {
    await secureDelete(SECURE_KEYS.refreshToken);
    await secureDelete(SECURE_KEYS.accessToken);
    await secureDelete(SECURE_KEYS.userProfile);
    // Migration cleanup: drop the legacy biometric opt-in flag if it lingers
    // from a pre-cleanup install.
    await secureDelete(SECURE_KEYS.biometricEnabled);
    // Intentionally KEEP `lastUsername` so the login screen can pre-fill.
  } catch {
    /* fine */
  }
}

export const {
  setCredentials,
  silentSessionTokensUpdated,
  setRights,
  setPendingOtp,
  refreshPendingOtp,
  clearPendingOtp,
  logout,
  setLanguage,
  setTheme,
} = authSlice.actions;
export default authSlice.reducer;
