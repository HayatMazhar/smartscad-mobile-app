import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
// `react-native-webview` is not available on web. We require it lazily in
// the body so the web bundle can substitute an iframe-based fallback.
let WebViewImpl: any = null;
try { WebViewImpl = require('react-native-webview').WebView; } catch { /* web build */ }
import { useAppDispatch } from '../../../store/store';
import { setCredentials } from '../services/authSlice';
import {
  useGetMicrosoftAuthConfigQuery,
  useMicrosoftExchangeMutation,
} from '../services/authApi';

const isWeb = Platform.OS === 'web';

const BRAND_NAVY = '#023C69';
const SCREEN_BG = '#FFFFFF';
const TEXT_PRIMARY = '#0A1F35';
const TEXT_SECONDARY = '#5C6B7A';
const DANGER = '#C0392B';

interface MicrosoftSignInScreenProps {
  /** Called when the user taps Cancel — typically navigates back. */
  onCancel?: () => void;
  /** Called after the SmartSCAD JWT is minted; defaults to dispatching setCredentials. */
  onSignedIn?: (tokens: { accessToken: string; refreshToken: string; user: any }) => void;
}

/**
 * Microsoft Entra ID sign-in via in-app WebView.
 *
 * Flow:
 *   1. Fetch /auth/microsoft/config to get tenantId / clientId / redirectUri.
 *   2. Build the OAuth2 implicit flow URL with response_type=id_token.
 *   3. Load it in a WebView. The user enters their SCAD email + password
 *      (and any conditional access prompts) in Microsoft's own UI.
 *   4. On success Microsoft redirects to the configured redirect URI with
 *      `#id_token=...` in the URL fragment. We intercept the navigation
 *      BEFORE the WebView actually tries to load it (cancelling the load),
 *      pull the id_token out of the fragment, and POST it to
 *      /auth/microsoft/exchange.
 *   5. The API validates the token against Microsoft's JWKS, finds the
 *      user in Common.ADUser, and returns a SmartSCAD JWT.
 *
 * The redirect URI is registered as a Web platform on the existing
 * SMARTSUPPORT App Registration — the URL never actually loads, we just
 * use it as a marker for "Microsoft wants to redirect back to us now."
 */
const MicrosoftSignInScreen: React.FC<MicrosoftSignInScreenProps> = ({
  onCancel,
  onSignedIn,
}) => {
  const dispatch = useAppDispatch();
  const { data: config, isLoading: configLoading, error: configError } =
    useGetMicrosoftAuthConfigQuery();
  const [exchange, { isLoading: exchanging }] = useMicrosoftExchangeMutation();

  const [error, setError] = useState<string | null>(null);
  const [exchangedOnce, setExchangedOnce] = useState(false);
  // Keep a stable nonce so we can verify it on the way back if we ever
  // want to. Microsoft's id_token includes the nonce we send here.
  const nonce = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
    [],
  );
  const state = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const authUrl = useMemo(() => {
    if (!config) return null;
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: config.responseType || 'id_token',
      redirect_uri: config.redirectUri,
      response_mode: 'fragment',
      scope: config.scope || 'openid profile email',
      nonce,
      state,
      // Force the account picker every time so testers don't get stuck on
      // a previously-cached identity.
      prompt: 'select_account',
    });
    return `${config.authorizeUrl}?${params.toString()}`;
  }, [config, nonce, state]);

  const handleExchange = useCallback(
    async (idToken: string) => {
      if (exchangedOnce) return;
      setExchangedOnce(true);
      try {
        const result = await exchange({ idToken }).unwrap();
        if (onSignedIn) {
          onSignedIn({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
          });
        } else {
          dispatch(
            setCredentials({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              user: result.user,
            }),
          );
        }
      } catch (e: any) {
        const msg = e?.data?.error || e?.error || 'Microsoft sign-in failed.';
        setError(msg);
        setExchangedOnce(false); // allow retry
      }
    },
    [dispatch, exchange, exchangedOnce, onSignedIn],
  );

  // Intercept navigation BEFORE the WebView fetches the URL. When
  // Microsoft sends us back to the configured redirect URI, the URL will
  // either contain `#id_token=...` (success) or `?error=...` (failure).
  const tryHandleRedirect = useCallback(
    (url: string): boolean => {
      if (!config) return true;
      if (!url) return true;
      if (!url.toLowerCase().startsWith(config.redirectUri.toLowerCase())) {
        return true;
      }
      // ── Success: id_token in fragment ──
      const fragmentIdx = url.indexOf('#');
      if (fragmentIdx > -1) {
        const fragment = url.substring(fragmentIdx + 1);
        const params = new URLSearchParams(fragment);
        const idToken = params.get('id_token');
        const returnedState = params.get('state');
        if (idToken) {
          if (returnedState && returnedState !== state) {
            setError('Sign-in state mismatch. Please try again.');
            return false;
          }
          handleExchange(idToken);
          return false;
        }
      }
      // ── Failure: error in query string ──
      const queryIdx = url.indexOf('?');
      if (queryIdx > -1) {
        const query = url.substring(queryIdx + 1, fragmentIdx > -1 ? fragmentIdx : url.length);
        const params = new URLSearchParams(query);
        const err = params.get('error_description') || params.get('error');
        if (err) {
          setError(decodeURIComponent(err.replace(/\+/g, ' ')));
          return false;
        }
      }
      // Redirect URI matched but had no token + no error — block the load anyway
      return false;
    },
    [config, handleExchange, state],
  );

  // Web fallback: WebView is a no-op. Open the auth URL in a popup and
  // poll its location for the redirect.
  useEffect(() => {
    if (!isWeb || !authUrl || !config) return;
    const w: any = (globalThis as any).window;
    if (!w) return;
    const popup = w.open(authUrl, 'ms-signin', 'width=480,height=720');
    if (!popup) {
      setError('Pop-up blocked. Please allow pop-ups and try again.');
      return;
    }
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          return;
        }
        const href: string | undefined = popup.location?.href;
        if (href && href.toLowerCase().startsWith(config.redirectUri.toLowerCase())) {
          const ok = !tryHandleRedirect(href);
          if (ok) {
            clearInterval(interval);
            popup.close();
          }
        }
      } catch {
        // Cross-origin throws while user is on login.microsoftonline.com — ignore.
      }
    }, 500);
    return () => {
      clearInterval(interval);
      try { popup.close(); } catch { /* */ }
    };
  }, [authUrl, config, tryHandleRedirect]);

  if (configLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ThemedActivityIndicator size="large" color={BRAND_NAVY} />
        <Text style={styles.loadingText}>Loading Microsoft sign-in…</Text>
      </View>
    );
  }

  if (configError || !config || !authUrl) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Sign-in unavailable</Text>
        <Text style={styles.errorBody}>
          We couldn't reach the Microsoft sign-in service. Please check your
          connection and try again.
        </Text>
        {onCancel && (
          <TouchableOpacity style={styles.errorBtn} onPress={onCancel}>
            <Text style={styles.errorBtnText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BG} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onCancel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign in with Microsoft</Text>
        <View style={{ width: 60 }} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {(exchanging || exchangedOnce) && !error && (
        <View style={styles.exchangeOverlay}>
          <ThemedActivityIndicator size="large" color={BRAND_NAVY} />
          <Text style={styles.exchangeText}>Finishing sign-in…</Text>
        </View>
      )}

      {!isWeb && WebViewImpl ? (
        <WebViewImpl
          source={{ uri: authUrl }}
          incognito
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ThemedActivityIndicator color={BRAND_NAVY} />
            </View>
          )}
          onShouldStartLoadWithRequest={(request: { url: string }) => tryHandleRedirect(request.url)}
          onNavigationStateChange={(navState: { url: string }) => {
            // Some Android WebView implementations skip onShouldStartLoadWithRequest
            // for fragment-only changes. Belt-and-braces the redirect detection.
            tryHandleRedirect(navState.url);
          }}
        />
      ) : (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            A Microsoft sign-in window has been opened in a new tab. Complete
            sign-in there and return here.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6ED',
    backgroundColor: SCREEN_BG,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  cancelText: { fontSize: 14, fontWeight: '600', color: BRAND_NAVY, width: 60 },

  loadingScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 16, backgroundColor: SCREEN_BG,
  },
  loadingText: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '500' },

  errorScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, gap: 16, backgroundColor: SCREEN_BG,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  errorBody: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 20 },
  errorBtn: {
    height: 44, paddingHorizontal: 28, borderRadius: 10,
    backgroundColor: BRAND_NAVY, justifyContent: 'center', alignItems: 'center',
    marginTop: 12,
  },
  errorBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  errorBanner: {
    backgroundColor: '#FDECEA', borderColor: DANGER, borderBottomWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorBannerText: { color: DANGER, fontSize: 13, fontWeight: '600' },

  exchangeOverlay: {
    position: 'absolute',
    top: 52, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    gap: 14, zIndex: 10,
  },
  exchangeText: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '600' },

  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: SCREEN_BG,
  },
  webFallback: {
    flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center',
  },
  webFallbackText: {
    fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', lineHeight: 22,
  },
});

export default MicrosoftSignInScreen;
