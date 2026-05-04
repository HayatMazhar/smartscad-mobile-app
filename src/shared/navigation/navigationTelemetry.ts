import {
  createNavigationContainerRef,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';

/** Shared ref — attach to `<NavigationContainer ref={navigationRef}>`. */
export const navigationRef = createNavigationContainerRef();

const MAX_SCREEN_HEADER_LEN = 220;

let currentRoutePath = '';

function resolveRoutePath(state: NavigationState | PartialState<NavigationState> | undefined): string {
  if (!state || typeof state.index !== 'number' || !state.routes?.length) return '';
  const route = state.routes[state.index];
  if (!route) return '';
  const child = route.state as NavigationState | PartialState<NavigationState> | undefined;
  const nested = child ? resolveRoutePath(child) : '';
  return nested ? `${route.name}/${nested}` : route.name;
}

function clipPath(path: string): string {
  const t = path.replace(/[\r\n]+/g, '').trim();
  if (!t) return '';
  return t.length <= MAX_SCREEN_HEADER_LEN ? t : `${t.slice(0, MAX_SCREEN_HEADER_LEN - 1)}…`;
}

/**
 * Call from NavigationContainer `onReady` and `onStateChange` so API headers reflect the active UI route.
 */
export function syncNavigationRoutePath(): void {
  try {
    if (!navigationRef.isReady()) {
      currentRoutePath = '';
      return;
    }
    const state = navigationRef.getRootState();
    currentRoutePath = clipPath(resolveRoutePath(state));
  } catch {
    currentRoutePath = '';
  }
}

/** Leaf screen + nested path, e.g. `MainTabs/LeaveStack/LeaveRequest`. */
export function getClientScreenForApi(): string {
  return currentRoutePath;
}
