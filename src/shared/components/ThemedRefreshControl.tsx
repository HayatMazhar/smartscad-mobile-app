import React, { useCallback } from 'react';
import { Platform, RefreshControl, RefreshControlProps } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';
import haptics from '../utils/haptics';

export type ThemedRefreshControlProps = Omit<
  RefreshControlProps,
  'tintColor' | 'colors' | 'progressBackgroundColor' | 'refreshing'
> & {
  /** iOS spinner tint; Android progress arc uses the same unless `colors` is passed explicitly below. */
  tintColor?: string;
  /** Android-only; defaults to `colors.card` from theme. */
  progressBackgroundColor?: string;
  /**
   * Native **`RefreshControl.refreshing`**. Ignored when **`isFetching`** is passed (RTK mode).
   * For RTK Query, prefer **`isFetching`** + **`isLoading`** so the spinner does not run during the first load
   * (Android shows `SwipeRefreshLayout` at the top whenever this is true).
   */
  refreshing?: boolean;
  /**
   * RTK Query **`isFetching`**. With **`isLoading`**, effective refreshing is **`isFetching && !isLoading`**.
   */
  isFetching?: boolean;
  /** RTK Query **`isLoading`** (first load / no data yet). */
  isLoading?: boolean;
};

/**
 * Pull-to-refresh: iOS uses `tintColor` only (unchanged behaviour).
 * Android uses Material `SwipeRefreshLayout` with brand `colors` + `progressBackgroundColor`.
 */
const ThemedRefreshControl: React.FC<ThemedRefreshControlProps> = ({
  tintColor,
  progressBackgroundColor,
  refreshing,
  isFetching,
  isLoading,
  onRefresh,
  ...rest
}) => {
  const { colors } = useTheme();
  const tint = tintColor ?? colors.primary;
  const progBg = progressBackgroundColor ?? colors.card;

  const spin =
    isFetching !== undefined
      ? isFetching && !(isLoading ?? false)
      : Boolean(refreshing);

  const onRefreshWithHaptic = useCallback(() => {
    // Light tap when the user pulls past the threshold; iOS-only via util.
    haptics.lightImpact();
    onRefresh?.();
  }, [onRefresh]);

  if (Platform.OS === 'ios') {
    return (
      <RefreshControl
        {...rest}
        refreshing={spin}
        onRefresh={onRefreshWithHaptic}
        tintColor={tint}
      />
    );
  }

  return (
    <RefreshControl
      {...rest}
      refreshing={spin}
      onRefresh={onRefresh}
      colors={[tint]}
      progressBackgroundColor={progBg}
    />
  );
};

export default ThemedRefreshControl;
