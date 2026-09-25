// builder-theme.ts — paints a BuilderTheme onto field's editor chrome.
//
// The selected theme owns BOTH:
//   1. field's editor accent palette
//   2. field's matching identity assets
//
// It does not theme the user's website.

import { getDefaultStore } from 'jotai';
import { builderThemeAtom, editorNeutralLevelAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import {
  DEFAULT_BUILDER_THEME_ID,
  DARK_ACCENT_TEXT_MIX,
  getBuilderThemeById,
  normalizeBuilderThemeId,
  type BuilderTheme,
} from '@/shared/builder-themes';
import { trace } from '@/shared/debug-trace';
import { normalizeEditorNeutralLevel, normalizeEditorThemeMode } from '@/shared/editor-neutral-theme';

const OWNED_VARS = [
  '--accent',
  '--accent-fg',
  '--accent-brand-fg',
  '--accent-text-fg',
  '--accent-strong-fg',
  '--rail-active-bg',
  '--rail-active-fg',
  '--accent-surface',
  '--accent-text',
] as const;

const FIELD_BRAND_VERSION = 11;

let observer: MutationObserver | null = null;
let suspended = false;

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}


function readStoredString(key: string): unknown {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    try { return JSON.parse(raw); } catch { return raw; }
  } catch {
    return undefined;
  }
}

function applyEditorChromePreferences(): void {
  const store = getDefaultStore();
  const mode = normalizeEditorThemeMode(store.get(editorThemeModeAtom));
  const level = normalizeEditorNeutralLevel(store.get(editorNeutralLevelAtom));
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.dataset.themeMode = mode;
  root.dataset.neutralLevel = level;
}

function currentTheme(): BuilderTheme {
  const raw = getDefaultStore().get(builderThemeAtom);

  return (
    getBuilderThemeById(raw) ??
    getBuilderThemeById(DEFAULT_BUILDER_THEME_ID)!
  );
}

function brandBase(theme: BuilderTheme): string {
  return `/field-brand/${theme.id}`;
}

function paintBrand(theme: BuilderTheme): void {
  const root = document.documentElement;
  const mode = isDarkMode() ? 'dark' : 'light';
  const base = brandBase(theme);

  const icon =
    `${base}/favicon-${mode}.png?v=${FIELD_BRAND_VERSION}`;

  const iconTransparent =
    `${base}/favicon-${mode}-trans.png?v=${FIELD_BRAND_VERSION}`;

  const wordmark =
    `${base}/logo-${mode}.png?v=${FIELD_BRAND_VERSION}`;

  const wordmarkTransparent =
    `${base}/logo-${mode}-trans.png?v=${FIELD_BRAND_VERSION}`;

  root.style.setProperty(
    '--field-app-icon',
    `url("${icon}")`,
  );

  root.style.setProperty(
    '--field-app-icon-trans',
    `url("${iconTransparent}")`,
  );

  root.style.setProperty(
    '--field-wordmark',
    `url("${wordmark}")`,
  );

  root.style.setProperty(
    '--field-wordmark-trans',
    `url("${wordmarkTransparent}")`,
  );

  root.dataset.fieldTheme = theme.id;

  const favicon =
    document.querySelector<HTMLLinkElement>('link[data-field-favicon]');

  if (favicon) {
    favicon.href = icon;
  }

  const apple =
    document.querySelector<HTMLLinkElement>('link[data-field-apple-icon]');

  if (apple) {
    apple.href =
      `${base}/apple-touch-icon.png?v=${FIELD_BRAND_VERSION}`;
  }
}

function paintAccent(theme: BuilderTheme): void {
  const root = document.documentElement;
  const c = isDarkMode() ? theme.dark : theme.light;

  const dark = isDarkMode();

  root.style.setProperty('--accent', c.accent);

  // Exact foreground used by field identity artwork.
  root.style.setProperty('--accent-fg', c.accentFg);
  root.style.setProperty('--accent-brand-fg', c.accentFg);

  // Normal-size copy on accent fills keeps its readable fallback.
  root.style.setProperty('--accent-text-fg', c.accentTextFg);
  root.style.setProperty('--accent-strong-fg', c.accentTextFg);

  // Left-rail active state intentionally inverts with editor mode:
  // light -> primary fill / light brand foreground
  // dark  -> light brand fill / primary foreground
  root.style.setProperty(
    '--rail-active-bg',
    dark ? c.accentFg : c.accent,
  );

  root.style.setProperty(
    '--rail-active-fg',
    dark ? c.accent : c.accentFg,
  );

  root.style.setProperty(
    '--accent-surface',
    'color-mix(in srgb, var(--accent) 12%, transparent)',
  );

  if (isDarkMode()) {
    root.style.setProperty(
      '--accent-text',
      `color-mix(in srgb, var(--accent) ${DARK_ACCENT_TEXT_MIX * 100}%, #fff)`,
    );
  } else {
    root.style.removeProperty('--accent-text');
  }
}

export function applyBuilderTheme(): void {
  const theme = currentTheme();

  // Branding is independent of component/master accent takeover.
  paintBrand(theme);

  if (suspended) return;

  paintAccent(theme);
}

export function suspendBuilderTheme(): void {
  suspended = true;
}

export function resumeBuilderTheme(): void {
  suspended = false;
  applyBuilderTheme();
}

export function subscribeBuilderTheme(): void {
  const store = getDefaultStore();

  // Restore editor mode + neutral tone before first paint. atomWithStorage is
  // still the persistence owner; this eager read prevents a Dark/neutral flash.
  const storedMode = normalizeEditorThemeMode(readStoredString('revyme:prefs:themeMode') ?? store.get(editorThemeModeAtom));
  const storedNeutral = normalizeEditorNeutralLevel(readStoredString('revyme:prefs:neutralLevel') ?? store.get(editorNeutralLevelAtom));
  if (store.get(editorThemeModeAtom) !== storedMode) store.set(editorThemeModeAtom, storedMode);
  if (store.get(editorNeutralLevelAtom) !== storedNeutral) store.set(editorNeutralLevelAtom, storedNeutral);
  applyEditorChromePreferences();

  // One-time compatibility migration:
  // graphite -> monochrome
  // amber    -> gold
  const stored = store.get(builderThemeAtom);
  const normalized = normalizeBuilderThemeId(stored);

  if (stored !== normalized) {
    store.set(builderThemeAtom, normalized);
  }

  applyBuilderTheme();

  store.sub(builderThemeAtom, () => {
    applyBuilderTheme();

    trace.action('builder-theme:changed', {
      id: store.get(builderThemeAtom),
    });
  });

  store.sub(editorThemeModeAtom, () => {
    applyEditorChromePreferences();
    applyBuilderTheme();
    trace.action('editor-theme-mode:changed', { mode: store.get(editorThemeModeAtom) });
  });

  store.sub(editorNeutralLevelAtom, () => {
    applyEditorChromePreferences();
    trace.action('editor-neutral-level:changed', { level: store.get(editorNeutralLevelAtom) });
  });

  if (observer || typeof MutationObserver === 'undefined') return;

  let wasDark = isDarkMode();

  observer = new MutationObserver(() => {
    const nowDark = isDarkMode();

    if (nowDark === wasDark) return;

    wasDark = nowDark;
    applyBuilderTheme();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}
