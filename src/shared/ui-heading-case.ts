// ui-heading-case.ts — canonical field chrome casing grammar.
//
// Source labels are not required to carry presentation casing. Brand casing
// reconstructs normal sentence-case UI names when disabled, then derives
// loew.fi's lowercase presentation when enabled.
//
// Protected names keep their intentional casing in BOTH states: acronyms,
// trademarks/product names, and structural name.FUNCTION identifiers.

const PROTECTED_NAMES = [
  'field.ENGINE',
  'loew.fi',
  'Open Graph',
  'OpenAI',
  'ChatGPT',
  'GitHub',
  'YouTube',
  'LinkedIn',
  'iPhone',
  'iPad',
  'iOS',
  'macOS',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Cloudflare',
  'Figma',
  'Revyme',
  'Twitter',
  'X',
  'Adobe',
  'Apple',
  'Google',
  'Microsoft',
  'Meta',
  'Stripe',
  'Supabase',
  'Vercel',
  'WordPress',
  'Shopify',
  'Framer',
  'Webflow',
  'React',
  'HTML',
  'CSS',
  'JSON',
  'JSX',
  'TSX',
  'HTTP',
  'HTTPS',
  'API',
  'URL',
  'SEO',
  'MCP',
  'CMS',
  'UI',
  'UX',
  'AI',
  'A/B',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function canonicalizeProtectedNames(value: string): string {
  let next = value;
  for (const name of PROTECTED_NAMES) {
    const pattern = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'gi');
    next = next.replace(pattern, name);
  }
  return next;
}

function maskProtectedNames(value: string): { text: string; protectedValues: string[] } {
  let text = canonicalizeProtectedNames(value);
  const protectedValues: string[] = [];

  const protect = (match: string) => {
    const index = protectedValues.push(match) - 1;
    return '§' + index + '§';
  };

  for (const name of PROTECTED_NAMES) {
    const pattern = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g');
    text = text.replace(pattern, protect);
  }

  text = text.replace(/\b[A-Z]{2,}(?:\/[A-Z]{1,})*\b/g, protect);
  // Unknown trademarks with deliberate internal capitalization (e.g. iCloud)
  // keep their authored casing even when not yet in the explicit dictionary.
  text = text.replace(/\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*)\b/g, protect);
  text = text.replace(/\b[a-z][a-z0-9-]*\.[A-Z]{2,}\b/g, protect);

  return { text, protectedValues };
}

function restoreProtectedNames(value: string, protectedValues: string[]): string {
  return value.replace(/§(\d+)§/g, (_, index: string) => protectedValues[Number(index)] ?? '');
}

function sentenceCase(value: string): string {
  const lower = value.toLowerCase();
  // If a protected product/technical token leads the label (SEO, AI,
  // GitHub, field.RUNTIME), it already supplies the intentional initial
  // casing. Do not promote the following editorial word to title case.
  if (/^§\d+§/.test(lower)) return lower;
  return lower.replace(/[a-z]/, (letter) => letter.toUpperCase());
}

export function formatUiChromeText(value: string, brand: boolean): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const { text, protectedValues } = maskProtectedNames(trimmed);
  const formatted = brand ? text.toLowerCase() : sentenceCase(text);
  return restoreProtectedNames(formatted, protectedValues);
}

/** Backward-compatible name for existing heading-only callsites. */
export function formatUiHeading(value: string, lowercase: boolean): string {
  return formatUiChromeText(value, lowercase);
}
