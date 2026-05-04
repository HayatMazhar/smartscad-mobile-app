import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { baseApi } from './baseApi';
import authReducer, { setCredentials, logout } from '../features/auth/services/authSlice';
import uiPreferencesReducer, { uiPreferencesListener } from '../app/settings/uiPreferencesSlice';
/** Side-effect: merge injected RTK Query endpoints at store init */
import '../features/appraisal/services/appraisalApi';
import '../features/approvals/services/approvalsApi';
import '../features/attachments/services/attachmentsApi';
import '../features/dashboard/services/dashboardApi';
import '../features/executive/services/executiveApi';

/**
 * Wipes ALL RTK Query caches on EVERY auth transition (login, logout, OTP
 * verify, SSO, silent token refresh, dev impersonation). This intentionally
 * aggressive — every time we set new credentials we discard any cached
 * tasks / dashboard / profile / persona / approvals / executive cockpit
 * data so the new session always pulls live data from the API.
 *
 * Why not be clever and only reset on user-id change? Because in practice:
 *   - user A logs out, user A logs back in → still want fresh data (their
 *     leave balance / tasks may have changed since logout)
 *   - dev impersonation may keep the same wrapper user but switch persona
 *   - cached entries are keyed by the OLD bearer token, which is now invalid
 *     anyway, so refetching is the right thing
 *
 * `setCredentials` is NEVER fired by the silent token-refresh path (that goes
 * through fetchBaseQuery's reauth flow without re-dispatching credentials),
 * so this middleware does not interfere with normal session refresh.
 *
 * `silentSessionTokensUpdated` (401 → `/auth/refresh` retry) also does not reset
 * caches — only token + profile merge + SecureStore persistence.
 */
const resetCachesOnUserChangeMiddleware: Middleware = (storeApi) => (next) => (action: any) => {
  const result = next(action);
  if (action?.type === logout.type || action?.type === setCredentials.type) {
    storeApi.dispatch(baseApi.util.resetApiState());
  }
  return result;
};

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    uiPreferences: uiPreferencesReducer,
  },
  // NOTE: order matters — .prepend() must come BEFORE .concat() because of a
  // Hermes bug. Hermes does not honor Symbol.species on built-in Array
  // subclasses, so RTK's Tuple.concat() returns a plain Array (without
  // .prepend), causing "undefined is not a function" at app boot in release
  // builds. .prepend() always constructs a fresh Tuple via Reflect.construct,
  // so it works either way. See: https://github.com/facebook/hermes/issues/1029
  middleware: (getDefault) =>
    getDefault()
      .prepend(uiPreferencesListener.middleware)
      .concat(baseApi.middleware, resetCachesOnUserChangeMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
