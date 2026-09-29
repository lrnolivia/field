// ui-heading-case.ts — canonical editor heading grammar.
//
// Source labels are not required to carry presentation casing. This formatter
// reconstructs normal sentence-case UI names when the lowercase preference is
// off, then derives loew.fi's lowercase presentation from that canonical form
// when the preference is on.
//
// Protected names keep their intentional casing in BOTH modes: acronyms,
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
  text = text.replace(/\b[a-z][a-z0-9-]*\.[A-Z]{2,}\b/g, protect);

  return { text, protectedValues };
}

function restoreProtectedNames(value: string, protectedValues: string[]): string {
  return value.replace(/§(\d+)§/g, (_, index: string) => protectedValues[Number(index)] ?? '');
}

function sentenceCase(value: string): string {
  const lower = value.toLowerCase();
  return lower.replace(/[a-z]/, (letter) => letter.toUpperCase());
}

export function formatUiHeading(value: string, lowercase: boolean): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const { text, protectedValues } = maskProtectedNames(trimmed);
  const formatted = lowercase ? text.toLowerCase() : sentenceCase(text);
  return restoreProtectedNames(formatted, protectedValues);
}
