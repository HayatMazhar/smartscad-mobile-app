import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type { HeroBannerSize, HomeSectionId, HomeSectionConfig } from '../settings/homeLayoutTypes';
import type { ColorPaletteId, FontFamilyId, FontSizeStep } from '../settings/themePreferencesTypes';

const STORAGE_KEY = 'ui_preferences_v1';

type PersistedShape = {
  homeHeroSize: HeroBannerSize;
  homeSections: Record<HomeSectionId, HomeSectionConfig>;
  colorPaletteId: ColorPaletteId;
  fontSizeStep: FontSizeStep;
  fontFamilyId: FontFamilyId;
};

let mmkv: { getString: (k: string) => string | undefined; set: (k: string, v: string) => void } | null = null;

function getMmkv() {
  if (Platform.OS === 'web') return null;
  // react-native-mmkv is a custom native module — not available in the Expo Go client.
  if (isRunningInExpoGo()) return null;
  try {
    if (!mmkv) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
      mmkv = new MMKV({ id: 'ui-preferences' });
    }
    return mmkv;
  } catch {
    return null;
  }
}

export function loadUiPreferencesJson(): Partial<PersistedShape> | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s) as Partial<PersistedShape>;
      return null;
    }
    const m = getMmkv();
    if (m) {
      const s = m.getString(STORAGE_KEY);
      if (s) return JSON.parse(s) as Partial<PersistedShape>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveUiPreferencesJson(data: PersistedShape) {
  try {
    const payload = JSON.stringify(data);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, payload);
      return;
    }
    const m = getMmkv();
    if (m) m.set(STORAGE_KEY, payload);
  } catch {
    /* ignore */
  }
}
