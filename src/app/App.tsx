import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '../store/store';
import { ThemeProvider } from './theme/ThemeContext';
import RootNavigator from './navigation/RootNavigator';
import WelcomeSplash from './WelcomeSplash';
import { tryRestoreSession, type RestoreOutcome } from '../features/auth/services/sessionRestore';
import '../shared/i18n/i18n';
import { ClientErrorBoundary } from '../shared/diagnostics/ClientErrorBoundary';
import { setupClientErrorReporting } from '../shared/diagnostics/setupClientErrorReporting';
import ContextMenuHost from '../shared/components/ContextMenu';

/**
 * App boot sequence:
 *
 *   1. Render the splash immediately (animated, ~3.5s baseline).
 *   2. In parallel, kick off `tryRestoreSession()` which silently exchanges
 *      the cached refresh token for a fresh pair (native only).
 *   3. Hide the splash ONLY when BOTH (a) the splash animation has
 *      finished and (b) the restore attempt has resolved. This avoids
 *      flashing the login screen for a frame before flipping to home.
 *
 * If restore fails (no cached token, expired refresh token, 401 from
 * `/auth/refresh`, network down, etc.) RootNavigator falls back to the
 * auth stack with the cached `lastUsername` pre-filled.
 */
const App: React.FC = () => {
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const restoreOutcomeRef = useRef<RestoreOutcome | null>(null);

  useEffect(() => {
    setupClientErrorReporting();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const outcome = await tryRestoreSession();
      if (cancelled) return;
      restoreOutcomeRef.current = outcome;
      // Useful crumb for QA — surfaces in Metro / browser console why the
      // app went to login vs straight to home.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[boot] session restore outcome', outcome);
      }
      setRestoreDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide splash only after BOTH the animation and the restore have settled.
  const splashGone = splashAnimDone && restoreDone;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ClientErrorBoundary>
              <View style={{ flex: 1 }}>
                <RootNavigator />
                {!splashGone && (
                  <WelcomeSplash onDone={() => setSplashAnimDone(true)} />
                )}
                {/* Cross-platform action sheet host. iOS uses native
                    ActionSheetIOS directly so this stays inert there;
                    Android renders a bottom-sheet modal. */}
                <ContextMenuHost />
              </View>
            </ClientErrorBoundary>
          </ThemeProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default App;
