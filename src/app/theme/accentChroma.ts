import type { AppColors } from './colors';
import type { ThemeSkin } from './themeSkins';

const VIBRANT_ROT = ['#297DE3', '#60C6B5', '#F9BA53', '#E74C3C', '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB', '#2C3E50', '#16A085'];

/**
 * Rotating accent for avatars, news tiles, gallery cards, etc.
 * Respects the current color story: professional / vector skins use theme primaries only.
 */
export function accentChroma(colors: AppColors, skin: ThemeSkin, index: number): string {
  if (skin.quickAccessStyle === 'professional' || skin.iconPresentation === 'vector') {
    const ring = [
      colors.primary,
      colors.success,
      colors.warning,
      colors.danger,
      colors.info,
      colors.textSecondary,
    ].filter(Boolean);
    return ring[index % ring.length];
  }
  return VIBRANT_ROT[index % VIBRANT_ROT.length];
}

/** Stable index from a string (category name, etc.) for accentChroma. */
function strToIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function accentChromaKey(colors: AppColors, skin: ThemeSkin, key: string): string {
  return accentChroma(colors, skin, strToIndex(key));
}
