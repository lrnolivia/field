// ui-heading-case.ts — semantic case policy for editor chrome headings.
//
// Casing is a presentation preference, not a string mutation. Components opt
// headings into one of two semantic roles:
//   brand    — human/editorial headings that may lowercase in Brand mode.
//   standard — functional/technical headings that Brand mode preserves.
// "lowercase" lowers both roles. Unmarked text (user content, filenames,
// controls, data, etc.) is never touched.

export type UiHeadingCase = 'brand' | 'original' | 'lowercase';
export type UiHeadingRole = 'brand' | 'standard';

export const DEFAULT_UI_HEADING_CASE: UiHeadingCase = 'brand';

export function normalizeUiHeadingCase(value: unknown): UiHeadingCase {
  return value === 'brand' || value === 'original' || value === 'lowercase'
    ? value
    : DEFAULT_UI_HEADING_CASE;
}

/** Preserve deliberate functional casing in Brand mode.
 *  Examples: SEO, AI, A/B Tests, X / Twitter, field.ENGINE. */
export function getUiHeadingRole(value: string): UiHeadingRole {
  const text = value.trim();
  if (!text) return 'standard';

  const hasAcronym = /\b[A-Z]{2,}\b/.test(text);
  const hasSlashInitialism = /\b[A-Z](?:\/[A-Z])+\b/.test(text);
  const hasFunctionalSuffix = /[a-z0-9]\.[A-Z]{2,}\b/.test(text);
  const hasSingleLetterBrand = /^[A-Z]\s*\/\s*/.test(text);

  return hasAcronym || hasSlashInitialism || hasFunctionalSuffix || hasSingleLetterBrand
    ? 'standard'
    : 'brand';
}
