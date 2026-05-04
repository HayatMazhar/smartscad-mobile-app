/** Three themes: original SCAD vibrant + two government palettes (same home layout). */

export type ColorPaletteId = 'scadVibrant' | 'govSoft' | 'govAbuDhabi';

export const COLOR_PALETTE_OPTIONS: { id: ColorPaletteId; label: string; hint: string }[] = [
  {
    id: 'scadVibrant',
    label: 'Default',
    hint: 'Original SCAD brand blues',
  },
  {
    id: 'govSoft',
    label: 'Government — soft',
    hint: 'Cool grey canvas, soft cards, restrained red accent',
  },
  {
    id: 'govAbuDhabi',
    label: 'Government — Abu Dhabi blue',
    hint: 'Professional Abu Dhabi blue primaries (same layout as soft)',
  },
];

export type FontSizeStep = 'smaller' | 'default' | 'larger' | 'largest';

export const FONT_SIZE_STEPS: { key: FontSizeStep; label: string; scale: number }[] = [
  { key: 'smaller', label: 'Smaller', scale: 0.9 },
  { key: 'default', label: 'Default', scale: 1 },
  { key: 'larger', label: 'Larger', scale: 1.1 },
  { key: 'largest', label: 'Largest', scale: 1.2 },
];

export type FontFamilyId = 'system' | 'sans' | 'serif';

export const FONT_FAMILY_OPTIONS: { id: FontFamilyId; label: string; hint: string }[] = [
  { id: 'system', label: 'System', hint: 'Platform default (SF / Roboto)' },
  { id: 'sans', label: 'Sans', hint: 'Clean modern sans' },
  { id: 'serif', label: 'Serif', hint: 'More formal body text' },
];
