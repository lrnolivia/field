// pages-layers-split.ts — pure splitter geometry for the document panel.

export const DEFAULT_PAGES_RATIO = 0.275;
export const MIN_PAGES_RATIO = 0.12;
export const MAX_PAGES_RATIO = 0.62;

export function clampPagesRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGES_RATIO;
  return Math.min(MAX_PAGES_RATIO, Math.max(MIN_PAGES_RATIO, value));
}

export function ratioFromPointer(clientY: number, panelTop: number, panelHeight: number): number {
  if (!Number.isFinite(panelHeight) || panelHeight <= 0) return DEFAULT_PAGES_RATIO;
  return clampPagesRatio((clientY - panelTop) / panelHeight);
}

export function parseStoredPagesRatio(raw: string | null): number {
  if (raw == null || raw.trim() === '') return DEFAULT_PAGES_RATIO;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampPagesRatio(parsed) : DEFAULT_PAGES_RATIO;
}
