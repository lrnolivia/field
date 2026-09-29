// ui-heading-case.ts — semantic case policy for field-owned editor chrome.
//
// The persisted preference intentionally has only two user-facing modes:
//   brand    — loew.fi editorial casing across eligible field chrome.
//   original — render strings exactly as authored.
//
// Brand lowercases ordinary UI language while preserving deliberate technical
// tokens such as AI, SEO, CMS, API, A/B, and field.RUNTIME. Project/user/site
// content is never passed through this formatter.

export type UiHeadingCase = 'brand' | 'original';
export type UiHeadingRole = 'brand' | 'standard';

export const DEFAULT_UI_HEADING_CASE: UiHeadingCase = 'brand';

export function normalizeUiHeadingCase(value: unknown): UiHeadingCase {
  // Migrate the short-lived third "lowercase" option to Brand.
  return value === 'original' ? 'original' : DEFAULT_UI_HEADING_CASE;
}

const TECHNICAL_TOKEN = /field\.[A-Z][A-Z0-9_]*|\b[A-Z](?:\/[A-Z])+\b|\b[A-Z]{2,}(?:\d+)?\b|\bX\s*\/\s*Twitter\b/g;

/**
 * Presentation-only field chrome formatter.
 *
 * "New project" -> "new project"
 * "AI Assistant" -> "AI assistant"
 * "SEO Settings" -> "SEO settings"
 * "A/B Tests" -> "A/B tests"
 * "field.RUNTIME Diagnostics" -> "field.RUNTIME diagnostics"
 */
export function formatUiChromeText(value: string, mode: UiHeadingCase): string {
  if (mode === 'original' || !value) return value;

  const preserved: string[] = [];
  const protectedValue = value.replace(TECHNICAL_TOKEN, token => {
    const index = preserved.push(token) - 1;
    return `\uE000${index}\uE001`;
  });

  const lowered = protectedValue.toLocaleLowerCase();
  return lowered.replace(/\uE000(\d+)\uE001/g, (_match, rawIndex: string) => preserved[Number(rawIndex)] ?? '');
}

/** Legacy CSS-only heading opt-ins keep this role helper. New controls should
 * prefer formatUiChromeText so mixed labels can lowercase around a token. */
export function getUiHeadingRole(value: string): UiHeadingRole {
  const text = value.trim();
  if (!text) return 'standard';
  const hasTechnicalToken = /field\.[A-Z][A-Z0-9_]*|\b[A-Z](?:\/[A-Z])+\b|\b[A-Z]{2,}(?:\d+)?\b|\bX\s*\/\s*Twitter\b/.test(text);
  return hasTechnicalToken ? 'standard' : 'brand';
}
