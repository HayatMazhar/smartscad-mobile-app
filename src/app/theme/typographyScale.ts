import type { typography } from './spacing';

type T = typeof typography;

export function scaleTypography(input: T, scale: number): T {
  const out: Record<string, unknown> = {};
  (Object.keys(input) as (keyof T)[]).forEach((k) => {
    const token = input[k] as { fontSize: number; lineHeight: number; fontWeight?: string; textTransform?: 'uppercase'; letterSpacing?: number; includeFontPadding?: boolean };
    out[k as string] = {
      ...token,
      fontSize: Math.round(token.fontSize * scale * 10) / 10,
      lineHeight: Math.round(token.lineHeight * scale * 10) / 10,
    };
  });
  return out as T;
}
