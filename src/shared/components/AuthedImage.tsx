import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  ImageURISource,
  NativeSyntheticEvent,
  ImageErrorEventData,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppSelector } from '../../store/store';

/**
 * `<Image>` that loads auth-protected remote URLs via the same `fetch()`
 * pipeline RTK Query already uses, then renders the bytes as a `data:`
 * URI through native `<Image>`.
 *
 * Why not `<Image source={{ uri, headers: { Authorization } }}>`:
 *   - RN iOS `RCTImageURLLoader` caches the response per URL (not per
 *     header set), so any image that 401'd once before login keeps
 *     401'ing for the rest of the session even after the token becomes
 *     available.
 *
 * Why not `expo-file-system.downloadAsync`:
 *   - It runs through a different `NSURLSession` configuration than RN's
 *     normal `fetch()`. We've seen it fail silently on UAT iOS while
 *     RTK Query API calls succeeded against the same host.
 *
 * Implementation:
 *   1. `fetch(uri, { headers: { Authorization: 'Bearer <token>' } })`.
 *   2. `response.arrayBuffer()` → manual base64 (more reliable than
 *      `response.blob()` + `FileReader.readAsDataURL` on iOS RN, where
 *      the Blob polyfill has historically had issues).
 *   3. Hand the `data:<mime>;base64,<...>` URI to native `<Image>`. The
 *      decoder runs entirely off-line, no auth headers required, no
 *      URL-level cache poisoning.
 *
 * Module-level cache keyed by `<token>|<uri>`, bounded at 64 entries.
 * Failures are not cached so a token rotation triggers retry.
 *
 * Failure visibility (TEMPORARY DIAGNOSTIC, on in release):
 *   - PENDING state shows an orange badge so we know AuthedImage is
 *     mounted at all.
 *   - FAILED state shows a red badge with status / message / token-presence.
 *   - SUCCESS renders the image with no overlay.
 *   We'll gate this behind an env flag once the iOS image issue is
 *   confirmed fixed.
 */

type Result =
  | { ok: true; dataUri: string }
  | { ok: false; status: number | null; message: string };
type CacheEntry = { promise: Promise<Result>; result?: Result };

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 64;

function keyFor(uri: string, token: string | null): string {
  return `${token ?? 'anon'}|${uri}`;
}

// Manual base64 encoder — avoids the FileReader / Blob round-trip which
// has been unreliable in RN on iOS. Works on Uint8Array of any size; for
// the avatar / cover sizes we serve (typ. < 500KB) the loop cost is fine.
const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  const n = bytes.length;
  for (; i + 2 < n; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64_ALPHABET[a >> 2];
    out += B64_ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    out += B64_ALPHABET[((b & 0x0f) << 2) | (c >> 6)];
    out += B64_ALPHABET[c & 0x3f];
  }
  if (i < n) {
    const a = bytes[i];
    const b = i + 1 < n ? bytes[i + 1] : 0;
    out += B64_ALPHABET[a >> 2];
    out += B64_ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    out += i + 1 < n ? B64_ALPHABET[(b & 0x0f) << 2] : '=';
    out += '=';
  }
  return out;
}

function logDebug(...parts: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[AuthedImage]', ...parts);
}
function logError(...parts: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn('[AuthedImage]', ...parts);
}

async function downloadAuthed(uri: string, token: string | null): Promise<Result> {
  const k = keyFor(uri, token);
  const existing = cache.get(k);
  if (existing) {
    return existing.result ?? existing.promise;
  }

  const promise = (async (): Promise<Result> => {
    try {
      const headers: Record<string, string> = { Accept: 'image/*' };
      if (token) headers.Authorization = `Bearer ${token}`;

      logDebug('GET', uri, 'tok?', !!token);
      const res = await fetch(uri, { method: 'GET', headers });
      if (!res.ok) {
        let body = '';
        try {
          body = await res.text();
        } catch {
          /* ignore */
        }
        logError('HTTP', res.status, uri, body.slice(0, 200));
        const result: Result = {
          ok: false,
          status: res.status,
          message: body.slice(0, 200) || res.statusText || `HTTP ${res.status}`,
        };
        const entry = cache.get(k);
        if (entry) entry.result = result;
        return result;
      }

      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const base64 = bytesToBase64(bytes);
      const contentType = res.headers.get('Content-Type') ?? 'image/jpeg';
      const dataUri = `data:${contentType};base64,${base64}`;

      if (cache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = cache.keys().next().value;
        if (typeof firstKey === 'string') cache.delete(firstKey);
      }
      const result: Result = { ok: true, dataUri };
      const entry = cache.get(k);
      if (entry) entry.result = result;
      logDebug('OK', uri, `${bytes.length}B`, contentType);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logError('NET', uri, message);
      // Don't cache the negative result so a token refresh can retry.
      cache.delete(k);
      return { ok: false, status: null, message };
    }
  })();

  cache.set(k, { promise });
  return promise;
}

const AuthedImage: React.FC<ImageProps> = ({ source, onError, style, ...rest }) => {
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const remoteUri: string | undefined = (() => {
    if (!source) return undefined;
    if (typeof source === 'number') return undefined;
    if (Array.isArray(source)) {
      const first = source[0] as ImageURISource | undefined;
      return first?.uri;
    }
    return (source as ImageURISource).uri;
  })();

  const isPassThrough =
    !remoteUri ||
    remoteUri.startsWith('data:') ||
    remoteUri.startsWith('file:') ||
    remoteUri.startsWith('asset:') ||
    remoteUri.startsWith('content:') ||
    remoteUri.startsWith('blob:');

  const [resolved, setResolved] = useState<Result | undefined>(() =>
    isPassThrough && remoteUri ? { ok: true, dataUri: remoteUri } : undefined
  );

  useEffect(() => {
    if (typeof source === 'number') return;
    if (!remoteUri) {
      setResolved(undefined);
      return;
    }
    if (isPassThrough) {
      setResolved({ ok: true, dataUri: remoteUri });
      return;
    }

    let cancelled = false;
    setResolved(undefined);

    downloadAuthed(remoteUri, accessToken).then((r) => {
      if (cancelled) return;
      setResolved(r);
      if (!r.ok && onError) {
        const evt = {
          nativeEvent: { error: `AuthedImage: ${r.status ?? 'NET'} ${r.message}` },
        } as NativeSyntheticEvent<ImageErrorEventData>;
        onError(evt);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUri, accessToken, isPassThrough]);

  // Local require()d asset → pass straight through.
  if (typeof source === 'number') {
    return <Image source={source} onError={onError} style={style} {...rest} />;
  }

  if (resolved?.ok) {
    return <Image source={{ uri: resolved.dataUri }} onError={onError} style={style} {...rest} />;
  }

  // PENDING — orange badge so we know AuthedImage is mounted and the
  // fetch is in flight (vs. truly never running). Helps tell apart "old
  // build" from "fetch hung" while we're chasing the iOS issue.
  if (!resolved) {
    return (
      <View style={[styles.pendingWrap, style]} pointerEvents="none">
        <Text style={styles.badgeText} numberOfLines={3}>
          {`PENDING\n${remoteUri ? remoteUri.slice(-40) : 'no uri'}\ntok=${
            accessToken ? 'Y' : 'N'
          }`}
        </Text>
      </View>
    );
  }

  // FAILED — red badge with status + message + token presence.
  return (
    <View style={[styles.errWrap, style]} pointerEvents="none">
      <Text style={styles.badgeText} numberOfLines={5}>
        {`IMG ${resolved.status ?? 'NET'}\n${resolved.message || '?'}\n${Platform.OS} tok=${
          accessToken ? 'Y' : 'N'
        }`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pendingWrap: {
    backgroundColor: 'rgba(255,140,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  errWrap: {
    backgroundColor: 'rgba(220,20,20,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AuthedImage;
