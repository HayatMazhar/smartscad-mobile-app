import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/** Picked file for upload: Web `File` or native `{ uri, name, mimeType }`. */
export type PickedUploadFile = File | { uri: string; name: string; mimeType?: string };

export function appendFileToFormData(fd: FormData, fieldName: string, file: PickedUploadFile) {
  if (typeof File !== 'undefined' && file instanceof File) {
    fd.append(fieldName, file);
    return;
  }
  const f = file as { uri: string; name: string; mimeType?: string };
  fd.append(
    fieldName,
    {
      uri: f.uri,
      name: f.name,
      type: f.mimeType || 'application/octet-stream',
    } as any,
  );
}

export async function pickOneDocumentForUpload(): Promise<PickedUploadFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (Platform.OS === 'web' && a.file) {
    return a.file;
  }
  return { uri: a.uri, name: a.name, mimeType: a.mimeType };
}

/** Multi-select (native + web when supported). Returns empty array if cancelled. */
export async function pickDocumentsForUpload(): Promise<PickedUploadFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
  if (res.canceled || !res.assets?.length) return [];
  const out: PickedUploadFile[] = [];
  for (const a of res.assets) {
    if (Platform.OS === 'web' && a.file) {
      out.push(a.file);
    } else {
      out.push({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    }
  }
  return out;
}
