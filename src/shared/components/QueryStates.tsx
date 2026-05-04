import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';
import ApiErrorState from './ApiErrorState';
import SanadkomScreenLoader from './SanadkomScreenLoader';

export type QueryStatesProps = {
  /** First-load / uninitialized gate (fullscreen spinner). */
  loading: boolean;
  /** Combined with **`apiError`** to detect failure (`error != null`, or `apiError`). */
  error?: unknown;
  /** Explicit RTK `isError`; useful when `error` shape is unreliable. */
  apiError?: boolean;
  /** Shown inside ApiErrorState retry UX (during refetch). */
  isRefreshing?: boolean;
  onRetry?: () => void;
  errorTitle?: string;
  errorMessage?: string;
  children: React.ReactNode;
  loadingTestID?: string;
  style?: StyleProp<ViewStyle>;
  loadingContainerStyle?: StyleProp<ViewStyle>;
  errorContainerStyle?: StyleProp<ViewStyle>;
  /**
   * When true, **`loading`** is ignored — never show the fullscreen spinner.
   * Use under fixed headers/toolbars where only failures should swap the body.
   */
  errorGateOnly?: boolean;
  /**
   * When set, replaces the default fullscreen **`SanadkomScreenLoader`** while **`loading`**.
   * Container is **`flex: 1`** with the screen background (not centered) so scroll layouts fill the screen.
   */
  loadingFallback?: React.ReactNode;
};

const base = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

/**
 * Standard RTK-query tri-state for full-screen lists/screens:
 * fullscreen loading → fullscreen ApiErrorState → **`children`**.
 *
 * Compose with **`useQueryScreenState`** when you want derived flags outside JSX.
 */
const QueryStates: React.FC<QueryStatesProps> = ({
  loading,
  error,
  apiError,
  isRefreshing,
  onRetry,
  errorTitle,
  errorMessage,
  children,
  loadingTestID,
  style,
  loadingContainerStyle,
  errorContainerStyle,
  errorGateOnly = false,
  loadingFallback,
}) => {
  const { colors } = useTheme();
  const bg = { backgroundColor: colors.background };

  const hasErr = apiError === true || (error !== undefined && error !== null);

  if (!errorGateOnly && loading) {
    if (loadingFallback != null) {
      return (
        <View
          style={[{ flex: 1 }, bg, loadingContainerStyle, style]}
          testID={loadingTestID}
        >
          {loadingFallback}
        </View>
      );
    }
    return (
      <View
        style={[base.center, bg, loadingContainerStyle, style]}
        testID={loadingTestID}
      >
        <SanadkomScreenLoader />
      </View>
    );
  }

  if (hasErr) {
    return (
      <View style={[base.center, bg, { padding: 20 }, errorContainerStyle, style]}>
        <ApiErrorState
          onRetry={onRetry}
          isRetrying={!!isRefreshing}
          title={errorTitle}
          message={errorMessage}
        />
      </View>
    );
  }

  return <>{children}</>;
};

export default QueryStates;
