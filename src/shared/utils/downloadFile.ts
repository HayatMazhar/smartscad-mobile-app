/**
 * Download a file from the mobile API to the device, with progress callback,
 * then open it in the system viewer.
 *
 * **Expo Go:** `react-native-blob-util` is not available (no custom native module).
 * We use `expo-file-system` + `Share` from `react-native` (no extra Expo package).
 * Dev / release builds keep using RNBU for Android DownloadManager and iOS preview.
 *
 * Web parity: see module comment in git history; `Linking.openURL` for web.
 */
import { Platform, Linking, Share } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as FileSystem from 'expo-file-system/legacy';

export type DownloadProgress = {
  written: number;
  total: number;
  percent: number;
};

export type DownloadResult = {
  /** Absolute on-disk path of the downloaded file. */
  path: string;
  /** Convenience: open the file in the system viewer. */
  open: () => Promise<void> | void;
};

export type DownloadOptions = {
  /** Absolute URL to GET. */
  url: string;
  /** File name to save as on disk (with extension, e.g. "Issue 12.pdf"). */
  fileName: string;
  /** MIME type for the system viewer (e.g. "application/pdf"). */
  mime?: string;
  /** Bearer token to attach as Authorization header. */
  bearerToken?: string;
  /** AD user id (e.g. "scad\\maalhosani") to attach as X-User-Id. */
  userId?: string;
  /** Optional language header (en/ar). */
  language?: string;
  /** Progress callback (0..100). */
  onProgress?: (p: DownloadProgress) => void;
  /** If true (default), opens the file once download finishes. */
  autoOpen?: boolean;
};

type BlobUtilT = typeof import('react-native-blob-util').default;
let rnbuCache: BlobUtilT | null = null;

function getReactNativeBlobUtil(): BlobUtilT {
  if (!rnbuCache) {
    // Must not be imported at module scope — that loads native code and crashes Expo Go on startup.
    rnbuCache = (require('react-native-blob-util') as { default: BlobUtilT }).default;
  }
  return rnbuCache;
}

/**
 * Strip characters that are invalid in Android / iOS file names so the
 * download manager doesn't reject them. Keeps spaces, dots, dashes,
 * underscores, parentheses and unicode letters/digits.
 */
function sanitizeFileName(name: string): string {
  const trimmed = (name ?? '').trim() || 'download';
  return trimmed.replace(/[\\/\u0000-\u001F<>:"|?*]+/g, '_');
}

/**
 * Map common file extensions to a MIME type. Used as a fallback when the
 * server didn't provide one.
 */
export function guessMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/** Expo Go–safe path: FileSystem + system share sheet (no react-native-blob-util). */
async function downloadInExpoGo(
  url: string,
  safeName: string,
  _mimeType: string,
  headers: Record<string, string>,
  autoOpen: boolean,
  onProgress?: (p: DownloadProgress) => void,
): Promise<DownloadResult> {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error('expo-file-system: document directory unavailable');
  }
  const fileUri = `${base}${safeName}`;

  if (onProgress) {
    onProgress({ written: 0, total: 0, percent: 0 });
  }

  const result = await FileSystem.downloadAsync(url, fileUri, { headers });

  if (onProgress) {
    onProgress({ written: 1, total: 1, percent: 100 });
  }

  const open = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Share.share({ url: result.uri });
      } else {
        await Share.share({ title: safeName, message: result.uri, url: result.uri });
      }
    } catch {
      // ignore
    }
  };

  if (autoOpen) {
    await open();
  }

  return {
    path: result.uri,
    open,
  };
}

export async function downloadFile(opts: DownloadOptions): Promise<DownloadResult> {
  const { url, fileName, mime, bearerToken, userId, language, onProgress, autoOpen = true } = opts;

  const safeName = sanitizeFileName(fileName);
  const mimeType = mime || guessMimeType(safeName);

  const headers: Record<string, string> = {
    Accept: '*/*',
  };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  if (userId) headers['X-User-Id'] = userId;
  if (language) headers['Accept-Language'] = language;

  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return {
      path: url,
      open: () => Linking.openURL(url),
    };
  }

  if (isRunningInExpoGo() && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    return downloadInExpoGo(url, safeName, mimeType, headers, autoOpen, onProgress);
  }

  const ReactNativeBlobUtil = getReactNativeBlobUtil();

  if (Platform.OS === 'android') {
    const downloadsDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
    const destPath = `${downloadsDir}/${safeName}`;

    const task = ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: safeName,
        description: 'Downloading from SmartSCAD',
        mime: mimeType,
        path: destPath,
        mediaScannable: true,
      },
      fileCache: true,
    }).fetch('GET', url, headers);

    if (onProgress) {
      task.progress({ count: 10 }, (received: number, total: number) => {
        const r = Number(received) || 0;
        const t = Number(total) || 0;
        onProgress({
          written: r,
          total: t,
          percent: t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0,
        });
      });
    }

    const res = await task;
    const path = res.path() || destPath;
    return {
      path,
      open: async () => {
        try {
          await ReactNativeBlobUtil.android.actionViewIntent(path, mimeType);
        } catch {
          /* noop */
        }
      },
    };
  }

  const docsDir = ReactNativeBlobUtil.fs.dirs.DocumentDir;
  const destPath = `${docsDir}/${safeName}`;

  const task = ReactNativeBlobUtil.config({
    fileCache: true,
    path: destPath,
  }).fetch('GET', url, headers);

  if (onProgress) {
    task.progress({ count: 10 }, (received: number, total: number) => {
      const r = Number(received) || 0;
      const t = Number(total) || 0;
      onProgress({
        written: r,
        total: t,
        percent: t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0,
      });
    });
  }

  const res = await task;
  const path = res.path() || destPath;

  if (autoOpen) {
    try {
      ReactNativeBlobUtil.ios.previewDocument(path);
    } catch {
      /* noop */
    }
  }

  return {
    path,
    open: () => {
      try {
        ReactNativeBlobUtil.ios.previewDocument(path);
      } catch {
        /* noop */
      }
    },
  };
}
