import { useMemo } from 'react';

export type QueryScreenSource = {
  isLoading?: boolean;
  /** RTK Query isFetching — e.g. refetch spinner / RefreshControl */
  isFetching?: boolean;
  /** Prefer when using RTK’s boolean instead of inspecting `error` */
  isError?: boolean;
  /** RTK `error` payload */
  error?: unknown;
};

/**
 * Normalises RTK-Query-ish flags into booleans for full-screen loaders and error shells.
 *
 * - **`hasFailure`**: `isError === true`, or **`error`** is neither `undefined` nor `null`.
 * - **`showBlockingFailure`**: failure after **`isLoading`** is false (splash → error UX).
 */
export function useQueryScreenState(source: QueryScreenSource) {
  return useMemo(() => {
    const isLoading = !!source.isLoading;
    const isFetching = !!source.isFetching;
    const hasFailure = source.isError === true || (source.error !== undefined && source.error !== null);
    const showBlockingFailure = !isLoading && hasFailure;
    const showBlockingLoading = isLoading;
    return {
      isBlockingLoading: showBlockingLoading,
      showBlockingFailure,
      hasFailure,
      /** Alias for RefreshControl / retry button spinner */
      isRefreshing: isFetching,
    };
  }, [source.isLoading, source.isFetching, source.isError, source.error]);
}
