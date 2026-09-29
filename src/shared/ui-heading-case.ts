// ui-heading-case.ts — canonical case grammar for field-owned editor chrome.
//
// Case management is a single boolean preference. When it is on, eligible
// field chrome follows the loew.fi lowercase editorial voice. When it is off,
// strings render exactly as authored.

const PROTECTED_NAMES = [
  'field.ENGINE','field.RUNTIME','field.BUILD','field.GLYPH','field.MOTION','field.GRAPH',
  'loew.fi','Open Graph','OpenAI','ChatGPT','GitHub','YouTube','LinkedIn','iPhone','iPad',
  'iOS','macOS','Next.js','TypeScript','JavaScript','Cloudflare','Figma','Revyme','Twitter',
  'X','Adobe','Apple','Google','Microsoft','Meta','Stripe','Supabase','Vercel','WordPress',
  'Shopify','Framer','Webflow','React','HTML','CSS','JSON','JSX','TSX','HTTP','HTTPS','API',
  'URL','SEO','MCP','CMS','UI','UX','AI','A/B',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function canonicalizeProtectedNames(value: string): string {
  let next = value;
  for (const name of PROTECTED_NAMES) {
    next = next.replace(new RegExp('\\b' + escapeRegExp(name) + '\\b', 'gi'), name);
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
    text = text.replace(new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g'), protect);
  }
  text = text.replace(/\b[A-Z]{2,}(?:\/[A-Z]{1,})*\b/g, protect);
  text = text.replace(/\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*)\b/g, protect);
  text = text.replace(/\b[a-z][a-z0-9-]*\.[A-Z]{2,}\b/g, protect);
  return { text, protectedValues };
}

function restoreProtectedNames(value: string, protectedValues: string[]): string {
  return value.replace(/§(\d+)§/g, (_, index: string) => protectedValues[Number(index)] ?? '');
}

export function formatUiChrome(value: string, enabled: boolean): string {
  if (!enabled || !value) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const { text, protectedValues } = maskProtectedNames(trimmed);
  return restoreProtectedNames(text.toLowerCase(), protectedValues);
}

export function formatUiHeading(value: string, enabled: boolean): string {
  return formatUiChrome(value, enabled);
}
