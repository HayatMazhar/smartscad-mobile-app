import { Platform } from 'react-native';
import { store } from '../../store/store';
import { flushQueuedClientErrors, reportClientError } from './reportClientError';

type RnErrorUtils = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

/** RN sets `global.ErrorUtils`; it is NOT a public export — avoid `react-native.ErrorUtils` (breaks webpack / RN Web). */
function getRnErrorUtils(): RnErrorUtils | undefined {
  if (Platform.OS === 'web') return undefined;
  const eu = (globalThis as Record<string, unknown>).ErrorUtils;
  return eu != null && typeof eu === 'object' ? (eu as RnErrorUtils) : undefined;
}

let installed = false;

function reasonToClientPayload(reason: unknown): { msg: string; stack: string | null } {
  if (reason instanceof Error) {
    return { msg: reason.message || 'Promise rejection', stack: reason.stack ?? null };
  }
  if (typeof reason === 'string') return { msg: reason, stack: null };
  if (reason != null && typeof reason === 'object' && typeof (reason as any).message === 'string') {
    const stack = typeof (reason as any).stack === 'string' ? (reason as any).stack : null;
    return { msg: String((reason as any).message), stack };
  }
  try {
    return { msg: `Unhandled rejection: ${JSON.stringify(reason)}`, stack: null };
  } catch {
    return { msg: `Unhandled rejection: ${String(reason)}`, stack: null };
  }
}

/**
 * Hooks promise rejections that never attach `.catch`/try-await where the VM exposes them.
 */
function installUnhandledPromiseReporting(): void {
  const flush = (reason: unknown) => {
    try {
      const { msg, stack } = reasonToClientPayload(reason);
      void reportClientError({
        message: msg,
        stackTrace: stack,
        source: 'unhandled_promise',
        isFatal: false,
      });
    } catch {
      /* ignore */
    }
  };

  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    type Webish = typeof globalThis & {
      addEventListener?: (type: string, listener: (event: { preventDefault?: () => void; reason?: unknown }) => void) => void;
    };
    const w = globalThis as Webish;
    w.addEventListener?.('unhandledrejection', (event) => {
      flush(event.reason);
    });
    return;
  }

  const proc =
    typeof process !== 'undefined' && process?.on !== undefined ? process : undefined;
  if (!proc?.on || typeof proc.on !== 'function') return;

  try {
    proc.on('unhandledRejection', flush as (reason: unknown) => void);
  } catch {
    /* optional in some bundles */
  }
}

export function setupClientErrorReporting(): void {
  if (installed) return;
  installed = true;

  try {
    const eu = getRnErrorUtils();
    const prevHandler = eu?.getGlobalHandler?.();
    eu?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
      try {
        const err = error instanceof Error ? error : new Error(String(error));
        void reportClientError({
          message: err.message || 'Unknown error',
          stackTrace: err.stack ?? null,
          source: 'global_js',
          isFatal: !!isFatal,
        });
      } catch {
        /* never throw from reporter */
      }
      prevHandler?.(error as Error, isFatal);
    });
  } catch {
    /* older RN web bundles may omit ErrorUtils */
  }

  installUnhandledPromiseReporting();

  let prevTok = (store.getState().auth.accessToken ?? '').trim();
  if (prevTok) void flushQueuedClientErrors();

  store.subscribe(() => {
    const tok = (store.getState().auth.accessToken ?? '').trim();
    if (tok && !prevTok) void flushQueuedClientErrors();
    prevTok = tok;
  });
}
