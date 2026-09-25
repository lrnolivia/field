export const PAGE_APPEARANCE_FILE_PATH = '_meta/page-appearance.json';

export interface PageAppearance {
  /** Explicit editor-canvas background. Missing means follow editor theme. */
  background?: string;
  /** Paint opacity, 0..100. Missing means 100. */
  opacity?: number;
  /** False hides an explicit page paint and falls back to the neutral workspace. */
  visible?: boolean;
}

export interface PageAppearanceDocument {
  pages: Record<string, PageAppearance>;
}

export const EMPTY_PAGE_APPEARANCE_DOCUMENT: PageAppearanceDocument = { pages: {} };

function normalizeOpacity(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function normalizePageAppearance(value: unknown): PageAppearance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const background = typeof raw.background === 'string' && raw.background.trim()
    ? raw.background.trim()
    : undefined;
  const opacity = normalizeOpacity(raw.opacity);
  const visible = typeof raw.visible === 'boolean' ? raw.visible : undefined;
  if (background === undefined && opacity === undefined && visible === undefined) return null;
  return {
    ...(background !== undefined ? { background } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(visible !== undefined ? { visible } : {}),
  };
}

export function parsePageAppearanceDocument(json: string | null): PageAppearanceDocument {
  if (!json) return { pages: {} };
  try {
    const parsed = JSON.parse(json) as { pages?: unknown };
    if (!parsed || typeof parsed !== 'object' || !parsed.pages || typeof parsed.pages !== 'object' || Array.isArray(parsed.pages)) {
      return { pages: {} };
    }
    const pages: Record<string, PageAppearance> = {};
    for (const [filePath, raw] of Object.entries(parsed.pages as Record<string, unknown>)) {
      const appearance = normalizePageAppearance(raw);
      if (appearance) pages[filePath] = appearance;
    }
    return { pages };
  } catch {
    return { pages: {} };
  }
}

export function serializePageAppearanceDocument(document: PageAppearanceDocument): string {
  return JSON.stringify({ pages: document.pages ?? {} }, null, 2);
}

export function patchPageAppearance(
  document: PageAppearanceDocument,
  filePath: string,
  patch: Partial<PageAppearance>,
): PageAppearanceDocument {
  const current = document.pages[filePath] ?? {};
  const normalized = normalizePageAppearance({ ...current, ...patch });
  const pages = { ...document.pages };
  if (normalized) pages[filePath] = normalized;
  else delete pages[filePath];
  return { pages };
}

export function removePageAppearance(document: PageAppearanceDocument, filePath: string): PageAppearanceDocument {
  const pages = { ...document.pages };
  delete pages[filePath];
  return { pages };
}

export function hasPageAppearanceEntries(document: PageAppearanceDocument): boolean {
  return Object.keys(document.pages).length > 0;
}
