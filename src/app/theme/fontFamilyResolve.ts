import { Platform } from 'react-native';
import type { FontFamilyId } from '../settings/themePreferencesTypes';

/** Cross-platform font family for UI text. Undefined lets RN use the default. */
export function resolveUiFontFamily(id: FontFamilyId): string | undefined {
  if (id === 'system') return undefined;
  if (id === 'sans') {
    return Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: undefined,
    });
  }
  if (id === 'serif') {
    return Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: undefined,
    });
  }
  return undefined;
}
