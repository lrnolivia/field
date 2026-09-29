// FIELD_SCROLL_INTEGRITY_SETTINGS_20260925
// SettingsOverlay.tsx — Full-screen settings takeover.
//
// Replaces the entire editor surface with a standard settings UI: a top
// bar with a back arrow (returns to the canvas), a left section nav, and a
// scrollable content area. No backdrop click-out — only the back arrow / Esc
// close the overlay. Cloud sections (Domain, Plans, Analytics, Submit) are
// registered via plugin-registry.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { SettingsWebsiteIcon, PageHomeIcon, PageDocumentIcon, GlobeInternationalIcon } from '@/shared/icons';
import LocalePanel from '@/editor/left-toolbar/panels/LocalePanel';
import Button from '@/design-system/Button';
import { LogoButton } from '@/editor/header/LeftHeader';
import DropdownMenu, { type DropdownMenuEntry } from '@/design-system/DropdownMenu';
import { projectFS } from '@/code/project/project-fs';
import { getSettingsCategories, type SettingsSectionDef } from '@/plugins/plugin-registry';
import {
  websiteSettingsAtom,
  settingsOverlayOpenAtom,
  settingsSectionAtom,
  selectedAbTestPageAtom,
  selectedSeoPageAtom,
  loadSettingsFromLayout,
} from '@/code/stores/website-settings-store';
import { pageFilePathToSlug, pageSlugToFilePath } from '@/code/project/page-slug-utils';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { getProjectId } from '@/backend/project-id';
import { trace } from '@/shared/debug-trace';
import {
  SettingsGroup,
  SettingsRow,
  ROW_INPUT_CLS,
  SaveButton,
  RowButton,
  RowSelect,
  LANGUAGE_OPTIONS,
  ConfirmModal,
  Toggle,
} from './settings-shared';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { setWebsiteWatermark } from '@/backend/revyme-backend';
import {
  lowercaseHeadingsAtom,
  autoPanSpeedAtom,
  autoFocusLayersAtom,
  showRulersAtom,
  useSmoothZoomAtom,
  showPixelGridAtom,
  builderThemeAtom,
  editorThemeModeAtom,
  editorNeutralLevelAtom,
  websitePreviewThemeAtom,
  type AutoPanSpeed,
} from '@/code/stores/user-preferences-store';
import { BUILDER_THEMES, getBuilderThemeById } from '@/shared/builder-themes';
import {
  EDITOR_NEUTRAL_SWATCHES,
  type EditorNeutralLevel,
  type EditorThemeMode,
} from '@/shared/editor-neutral-theme';
import {
  leftContentWidthAtom,
  rightPaneWidthAtom,
  rightInspectorAutoHideAtom,
  rightPaneOpenAtom,
  rightInspectorTemporaryRevealAtom,
  rightInspectorExplicitCollapseAtom,
  MIN_LEFT_CONTENT_WIDTH,
  MAX_LEFT_CONTENT_WIDTH,
  MIN_RIGHT_PANE_WIDTH,
  MAX_RIGHT_PANE_WIDTH,
} from '@/code/stores/workspace-panels-store';
import {
  workspaceModeAtom,
  setWorkspaceModeAtom,
  workspaceAutoHideAtom,
  type WorkspaceMode,
} from '@/editor/workspace-mode-store';
import { refreshCanvasTokens } from '@/canvas/node-ops';
import UiHeadingText from '@/design-system/UiHeadingText';

// ─── Inline SVG icons ──────────────────────────────────────────────────────

const BackIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const UploadIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const Trash2Icon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const MoreVerticalIcon = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);

const ChevronDownIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Types ──────────────────────────────────────────────────────────────────

/** Minimal slice of an A/B test row the sidebar needs — `id` + `name`
 *  for the row ellipsis's Rename / Delete actions. Mirrors the backend
 *  shape but typed locally so the overlay doesn't pull a dep on the
 *  cloud bundle just for this. */
interface AbTestSidebarRow {
  id: string;
  page_path: string;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a stored `page_path` (e.g. `page`, `about/page`, `page-copy/page`)
 *  into a friendly display label for the sidebar child rows.
 *    `page`            → "Home"
 *    `about/page`      → "about"
 *    `page-copy/page`  → "page-copy" */
function formatAbTestPageLabel(pagePath: string): string {
  if (pagePath === 'page') return 'Home';
  if (pagePath.endsWith('/page')) return pagePath.slice(0, -'/page'.length);
  return pagePath;
}

// ─── Build menu categories from registry ────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  /** A/B-test-only: which page_path the item drills into. Click sets
   *  both activeSection='ab-tests' and selectedAbTestPageAtom=pagePath. */
  pagePath?: string;
}

export function buildMenuCategories(
  registered: Array<{ title: string; items: SettingsSectionDef[] }>,
  abTestPages: string[],
): Array<{ title: string; items: MenuItem[] }> {
  // Website is always first in General
  const result: Array<{ title: string; items: MenuItem[] }> = [
    { title: 'General', items: [
      { id: 'website', label: 'General', icon: SettingsWebsiteIcon },
      { id: 'localization', label: 'Localization', icon: GlobeInternationalIcon },
    ] },
  ];

  for (const cat of registered) {
    // Strip the registry's ab-tests item when we're going to synthesize a
    // category from the pages instead — keeps the sidebar from showing
    // both an "A/B Tests" parent AND its child pages.
    const items = cat.items
      .filter(s => s.id !== 'pages' && !(s.id === 'ab-tests' && abTestPages.length > 0))
      .map<MenuItem>(s => ({ id: s.id, label: s.label, icon: s.icon }));
    if (items.length === 0) continue;

    const existing = result.find(c => c.title === cat.title);
    if (existing) {
      existing.items.push(...items);
    } else {
      result.push({ title: cat.title, items });
    }
  }

  // Synthesize an "A/B Tests" category whose ITEMS are the actual pages
  // with tests. Matches the reference's sidebar: pages float as first-class nav
  // entries rather than living under a clickable "A/B Tests" index that
  // shows a flat all-tests list.
  //
  // Icons + ordering mirror the Pages panel: the home page (`page`) uses
  // the home glyph and pins to the top of the list, every other page
  // uses the document glyph and sorts alphabetically below it.
  if (abTestPages.length > 0) {
    const sorted = [...abTestPages].sort((a, b) => {
      if (a === 'page') return -1;
      if (b === 'page') return 1;
      return a.localeCompare(b);
    });
    // Right after Insights (its parent topic), not at the end — the AI
    // category comes after Insights and would otherwise split the two.
    const abTests = {
      title: 'A/B Tests',
      items: sorted.map<MenuItem>(p => ({
        id: `ab-tests:${p}`,
        label: formatAbTestPageLabel(p),
        icon: p === 'page' ? PageHomeIcon : PageDocumentIcon,
        pagePath: p,
      })),
    };
    const insights = result.findIndex(c => c.title === 'Insights');
    if (insights >= 0) result.splice(insights + 1, 0, abTests);
    else result.push(abTests);
  }

  return result;
}

// ─── General settings visual controls ───────────────────────────────────────

function ChoiceTile({
  active,
  title,
  description,
  onClick,
  children,
  compact = false,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group min-w-0 text-left cut-corners cut-border border transition-colors ${
        active
          ? 'border-[var(--accent)] [--cut-border-color:var(--accent)] bg-[var(--accent-surface)]'
          : 'border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-surface)]/65 hover:bg-[var(--bg-hover)]/55'
      } ${compact ? 'px-2.5 py-2' : 'px-3 py-3'}`}
    >
      {children}
      <div className={children ? 'mt-2' : ''}>
        <div className="text-[12px] font-medium text-[var(--text-primary)]">{title}</div>
        {description && (
          <div className="mt-0.5 text-[10px] leading-4 text-[var(--text-tertiary)]">{description}</div>
        )}
      </div>
    </button>
  );
}

function WorkspaceChoiceGlyph({ mode }: { mode: Exclude<WorkspaceMode, 'compact'> }) {
  return (
    <div className="h-12 w-full overflow-hidden rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-panel)] p-1.5">
      <div className="flex h-full gap-1">
        {mode === 'floating' ? (
          <>
            <div className="w-2 rounded-[2px] bg-[var(--bg-active)]" />
            <div className="relative flex-1 rounded-[2px] bg-[var(--canvas-bg,var(--bg-surface))]">
              <div className="absolute left-1 top-1 bottom-1 w-4 rounded-[2px] border border-[var(--border-light)] bg-[var(--bg-panel)]" />
              <div className="absolute right-1 top-1 bottom-1 w-5 rounded-[2px] border border-[var(--border-light)] bg-[var(--bg-panel)]" />
            </div>
          </>
        ) : (
          <>
            <div className={`${mode === 'docked' ? 'w-7' : 'w-3'} rounded-[2px] bg-[var(--bg-active)]`} />
            <div className="flex-1 rounded-[2px] bg-[var(--canvas-bg,var(--bg-surface))]" />
            <div className={`${mode === 'docked' ? 'w-8' : 'w-3'} rounded-[2px] bg-[var(--bg-active)]`} />
          </>
        )}
      </div>
    </div>
  );
}

function SegmentedChoice({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-panel)] p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-7 min-w-[64px] rounded-[3px] px-2.5 text-[11px] font-medium transition-colors ${
            value === option.value
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SettingsOverlay
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsOverlay() {
  // ─── Atoms ───────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useAtom(settingsOverlayOpenAtom);
  const [websiteSettings, setWebsiteSettings] = useAtom(websiteSettingsAtom);
  const [activeSection, setActiveSection] = useAtom(settingsSectionAtom);
  const [lowercaseHeadings, setLowercaseHeadings] = useAtom(lowercaseHeadingsAtom);
  const [autoPanSpeed, setAutoPanSpeed] = useAtom(autoPanSpeedAtom);
  const [autoFocusLayers, setAutoFocusLayers] = useAtom(autoFocusLayersAtom);
  const [showRulers, setShowRulers] = useAtom(showRulersAtom);
  const [useSmoothZoom, setUseSmoothZoom] = useAtom(useSmoothZoomAtom);
  const [showPixelGrid, setShowPixelGrid] = useAtom(showPixelGridAtom);
  const [builderTheme, setBuilderTheme] = useAtom(builderThemeAtom);
  const [editorThemeMode, setEditorThemeMode] = useAtom(editorThemeModeAtom);
  const [editorNeutralLevel, setEditorNeutralLevel] = useAtom(editorNeutralLevelAtom);
  const [websitePreviewTheme, setWebsitePreviewTheme] = useAtom(websitePreviewThemeAtom);
  const workspaceMode = useAtomValue(workspaceModeAtom);
  const setWorkspaceMode = useSetAtom(setWorkspaceModeAtom);
  const [workspaceAutoHide, setWorkspaceAutoHide] = useAtom(workspaceAutoHideAtom);
  const [rightInspectorAutoHide, setRightInspectorAutoHide] = useAtom(rightInspectorAutoHideAtom);
  const setRightPaneOpen = useSetAtom(rightPaneOpenAtom);
  const setRightInspectorTemporaryReveal = useSetAtom(rightInspectorTemporaryRevealAtom);
  const setRightInspectorExplicitCollapse = useSetAtom(rightInspectorExplicitCollapseAtom);
  const [leftContentWidth, setLeftContentWidth] = useAtom(leftContentWidthAtom);
  const [rightPaneWidth, setRightPaneWidth] = useAtom(rightPaneWidthAtom);

  // ─── Mobile nav dropdown (sidebar replacement on small screens) ─────
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ─── A/B test page children for the sidebar ────────────────────────
  // List of unique `page_path` values from the website's A/B tests. Shown
  // as nested children under the "A/B Tests" sidebar entry so the user
  // can drill into a specific page's tests with one click — same UX as
  // the reference's settings sidebar. Refreshed on overlay open + whenever the
  // tests change (the `ab-tests-changed` event the test rows dispatch
  // after create/update/delete).
  const [abTestPages, setAbTestPages] = useState<string[]>([]);
  // Keyed by `page_path` — full test rows so the sidebar's per-row
  // ellipsis menu can rename / delete without re-fetching. Kept in sync
  // with `abTestPages` by the same load() effect below.
  const [abTestsByPage, setAbTestsByPage] = useState<Map<string, AbTestSidebarRow[]>>(new Map());
  const [selectedAbTestPage, setSelectedAbTestPage] = useAtom(selectedAbTestPageAtom);
  const [selectedSeoPage, setSelectedSeoPage] = useAtom(selectedSeoPageAtom);

  // ─── A/B Tests sidebar row ellipsis state ──────────────────────────
  // Which row's ⋯ dropdown is currently open; which row is in rename
  // mode; which row is in delete-confirm. One-at-a-time is fine — the
  // sidebar is single-column. Refs keyed by page_path so each row's ⋯
  // button can be the popover/menu anchor.
  const [abMenuOpenFor, setAbMenuOpenFor] = useState<string | null>(null);
  const [abRenameTarget, setAbRenameTarget] = useState<AbTestSidebarRow | null>(null);
  const [abDeleteTarget, setAbDeleteTarget] = useState<string | null>(null);
  const [isAbDeleting, setIsAbDeleting] = useState(false);
  const abMenuRefs = useRef(new Map<string, HTMLButtonElement | null>());

  // ─── Mobile detection ──────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Project ID ─────────────────────────────────────────────────────
  const websiteId = getProjectId() || '';

  // ─── File input refs ────────────────────────────────────────────────
  const faviconLightInputRef = useRef<HTMLInputElement>(null);
  const socialShareInputRef = useRef<HTMLInputElement>(null);

  // ─── Upload loading states ──────────────────────────────────────────
  const [isUploadingFaviconLight, setIsUploadingFaviconLight] = useState(false);
  const [isUploadingSocialShare, setIsUploadingSocialShare] = useState(false);
  const [isDeletingFavicon, setIsDeletingFavicon] = useState(false);
  const [isDeletingSocialShare, setIsDeletingSocialShare] = useState(false);

  // ─── Confirm modal states ──────────────────────────────────────────
  const [showRemoveFaviconConfirm, setShowRemoveFaviconConfirm] = useState(false);
  const [showRemoveSocialShareConfirm, setShowRemoveSocialShareConfirm] = useState(false);

  // ─── Subdomain state (for Google Search Preview) ───────────────────
  const [subdomain, setSubdomain] = useState<string | null>(null);

  // ─── Local form state ──────────────────────────────────────────────
  const [siteName, setSiteName] = useState(websiteSettings.name || '');
  const [siteDescription, setSiteDescription] = useState(websiteSettings.description || '');
  const [defaultLanguage, setDefaultLanguage] = useState(websiteSettings.languageCode || 'en');
  const [customCodeHead, setCustomCodeHead] = useState(websiteSettings.customCodeHead || '');
  const [customCodeBody, setCustomCodeBody] = useState(websiteSettings.customCodeBody || '');
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark' | 'system'>(websiteSettings.defaultTheme || 'light');

  // ─── "Made in Revyme" badge opt-out ─────────────────────────────────
  // Available on EVERY plan (2026-08-19) — the badge is a user choice, not
  // a paid perk. Truth lives in `websites.hide_watermark` (the Worker reads
  // it via PLANS_KV), so this reads/writes the backend directly rather than
  // the project's siteConfig. Applies to the LIVE site within seconds — no
  // republish (for sites published on the hideWatermark-aware worker).
  const [showBadge, setShowBadge] = useState(true);
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  useEffect(() => {
    if (!CLOUD_ENABLED || !websiteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/websites/${websiteId}`, { credentials: 'include' });
        if (!res.ok) return;
        const row = await res.json() as { hide_watermark?: boolean };
        if (!cancelled) { setShowBadge(!(row.hide_watermark ?? false)); setBadgeLoaded(true); }
      } catch { /* toggle stays at default-on, disabled until loaded */ }
    })();
    return () => { cancelled = true; };
  }, [websiteId]);
  const handleToggleBadge = useCallback((show: boolean) => {
    setShowBadge(show); // optimistic — revert on failure
    void setWebsiteWatermark(websiteId, !show).catch(() => setShowBadge(!show));
    trace.action('settings:watermark-toggle', { websiteId, show });
  }, [websiteId]);

  // ─── Change tracking ───────────────────────────────────────────────
  const [hasMetadataChanges, setHasMetadataChanges] = useState(false);
  const [hasCustomCodeChanges, setHasCustomCodeChanges] = useState(false);
  const [hasThemeChanges, setHasThemeChanges] = useState(false);

  // ─── Change tracking effects ───────────────────────────────────────

  useEffect(() => {
    setHasMetadataChanges(
      siteName !== (websiteSettings.name || '') ||
      siteDescription !== (websiteSettings.description || '') ||
      defaultLanguage !== (websiteSettings.languageCode || 'en')
    );
  }, [siteName, siteDescription, defaultLanguage, websiteSettings]);

  useEffect(() => {
    setHasCustomCodeChanges(
      customCodeHead !== (websiteSettings.customCodeHead || '') ||
      customCodeBody !== (websiteSettings.customCodeBody || '')
    );
  }, [customCodeHead, customCodeBody, websiteSettings]);

  useEffect(() => {
    setHasThemeChanges(defaultTheme !== (websiteSettings.defaultTheme || 'light'));
  }, [defaultTheme, websiteSettings]);

  // ─── Open-time reset — reload fresh settings from the file when the
  // user opens the overlay. No fade — render is gated by `isOpen` alone
  // so it snaps in / snaps out.

  useEffect(() => {
    if (!isOpen) return;
    trace.action('settings:open');
    const fresh = loadSettingsFromLayout();
    setWebsiteSettings(fresh);
    setSiteName(fresh.name);
    setSiteDescription(fresh.description);
    setDefaultLanguage(fresh.languageCode);
    setCustomCodeHead(fresh.customCodeHead);
    setCustomCodeBody(fresh.customCodeBody);
    setDefaultTheme(fresh.defaultTheme);
    setHasMetadataChanges(false);
    setHasCustomCodeChanges(false);
    setHasThemeChanges(false);
    // NOTE: selectedAbTestPage is intentionally NOT reset here — the URL
    // restore effect + the auto-select-first-page effect together drive
    // that atom now, so wiping it on every open would clobber the page
    // a URL refresh just restored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── A/B tests pages fetch ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !websiteId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`/api/ab-tests?websiteId=${websiteId}`);
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const tests = (j.tests ?? []) as AbTestSidebarRow[];
        const pages: string[] = Array.from(new Set(tests.map(t => t.page_path))).sort();
        const byPage = new Map<string, AbTestSidebarRow[]>();
        for (const t of tests) {
          const list = byPage.get(t.page_path) ?? [];
          list.push({ id: t.id, page_path: t.page_path, name: t.name });
          byPage.set(t.page_path, list);
        }
        setAbTestPages(pages);
        setAbTestsByPage(byPage);
      } catch (e) {
        trace.error('settings:ab-test-pages', e);
      }
    };
    void load();
    window.addEventListener('ab-tests-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('ab-tests-changed', load);
    };
  }, [isOpen, websiteId]);

  // ─── URL sync — restore on mount + reflect open/section in ?settings= ────
  //
  // Refresh-safe: the modal state lives in the URL (?settings=plans), so a
  // reload from `/builder/<id>?settings=plans` lands the user right back at
  // the Plans tab. Uses replaceState so this doesn't pollute browser history
  // for every section click (back arrow still jumps out to wherever you
  // came from before opening Settings).

  // ?settings value encodes the section and (when applicable) the
  // sub-selection. Two prefixed forms supported today:
  //   ab-tests:<pagePath>  →  A/B Tests sub-page (e.g. ab-tests:page)
  //   pages:<slug>         →  Pages SEO sub-page (e.g. pages:about/page)
  // Anything else is a bare section id (`website`, `domain`, …).
  // No suffix on `pages:` means "no page chosen yet" — the section's
  // auto-select effect picks the first one.
  const applySettingsParam = (value: string) => {
    if (value.startsWith('ab-tests:')) {
      setActiveSection('ab-tests');
      setSelectedAbTestPage(decodeURIComponent(value.slice('ab-tests:'.length)));
      return;
    }
    if (value.startsWith('pages:')) {
      setActiveSection('pages');
      const slug = decodeURIComponent(value.slice('pages:'.length));
      setSelectedSeoPage(slug ? pageSlugToFilePath(slug) : null);
      return;
    }
    setActiveSection(value);
    if (value !== 'ab-tests') setSelectedAbTestPage(null);
    if (value !== 'pages') setSelectedSeoPage(null);
  };

  // Restore from URL on first mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('settings');
    if (section) {
      applySettingsParam(section);
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write to URL on every isOpen / activeSection / selectedAbTestPage /
  // selectedSeoPage change.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isOpen) {
      let value = activeSection;
      if (activeSection === 'ab-tests' && selectedAbTestPage) {
        value = `ab-tests:${encodeURIComponent(selectedAbTestPage)}`;
      } else if (activeSection === 'pages' && selectedSeoPage) {
        value = `pages:${encodeURIComponent(pageFilePathToSlug(selectedSeoPage))}`;
      }
      params.set('settings', value);
    } else {
      params.delete('settings');
    }
    const search = params.toString();
    const nextUrl =
      window.location.pathname +
      (search ? '?' + search : '') +
      window.location.hash;
    const currentUrl =
      window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [isOpen, activeSection, selectedAbTestPage, selectedSeoPage]);

  // Sync state ← URL on browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('settings');
      if (section) {
        applySettingsParam(section);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select the first page when the user lands on the A/B Tests
  // section without one chosen yet — the bare "index" view isn't a
  // useful destination once there are tests, so we always pin to a
  // concrete page. ALSO re-pick when the currently-selected page is
  // no longer in the list (e.g. user just deleted the last test on
  // it from the sidebar's ⋯ menu, so the page disappeared from the
  // A/B Tests sidebar). An empty list falls back to null + the
  // "no tests" placeholder content.
  useEffect(() => {
    if (activeSection !== 'ab-tests') return;
    if (abTestPages.length === 0) {
      if (selectedAbTestPage !== null) setSelectedAbTestPage(null);
      return;
    }
    if (selectedAbTestPage === null || !abTestPages.includes(selectedAbTestPage)) {
      setSelectedAbTestPage(abTestPages[0]!);
    }
  }, [activeSection, selectedAbTestPage, abTestPages, setSelectedAbTestPage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        trace.action('settings:close-escape');
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // ─── Fetch subdomain for Google Search Preview ─────────────────────

  useEffect(() => {
    if (!isOpen || !websiteId) return;
    const fetchSubdomain = async () => {
      try {
        const response = await fetch(`/api/websites/${websiteId}`);
        if (response.ok) {
          // GET /api/websites/:id returns the row flat — no `.website` wrapper.
          const data = await response.json();
          setSubdomain(data.subdomain || null);
        }
      } catch (error) {
        trace.error('settings:fetch-subdomain', error);
      }
    };
    fetchSubdomain();
  }, [isOpen, websiteId]);

  // ─── A/B Tests sidebar Rename / Delete handlers ────────────────────

  /** PATCH /api/ab-tests/:id with the new name, then re-fire the
   *  ab-tests-changed event so the sidebar (and the test-card detail
   *  view if it's open) both refresh. */
  const handleAbRename = useCallback(async (testId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    trace.action('settings:ab-rename', { testId, nextName: trimmed });
    try {
      const r = await fetch(`/api/ab-tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        alert(err?.error?.message ?? 'Rename failed');
        return;
      }
      window.dispatchEvent(new CustomEvent('ab-tests-changed'));
      setAbRenameTarget(null);
    } catch (e) {
      trace.error('settings:ab-rename', e);
    }
  }, []);

  /** DELETE every test on the page + their variant trees in ProjectFS.
   *  Backend only drops the DB row; the variant files under
   *  `_revyme/variants/<testId>/` are FE-owned, so we have to sweep
   *  them ourselves or the Pages panel keeps listing ghost variants. */
  const handleAbDeleteForPage = useCallback(async (pagePath: string) => {
    const tests = abTestsByPage.get(pagePath) ?? [];
    if (tests.length === 0) {
      setAbDeleteTarget(null);
      return;
    }
    trace.action('settings:ab-delete-page', { pagePath, testCount: tests.length });
    setIsAbDeleting(true);
    try {
      for (const t of tests) {
        const r = await fetch(`/api/ab-tests/${t.id}`, { method: 'DELETE' });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          alert(err?.error?.message ?? `Failed to delete "${t.name}"`);
          continue;
        }
        const prefix = `_revyme/variants/${t.id}/`;
        for (const path of projectFS.listFiles(prefix)) {
          projectFS.deleteFile(path);
        }
      }
      window.dispatchEvent(new CustomEvent('ab-tests-changed'));
      // The auto-select effect (below the URL sync) handles "the
      // selected page no longer exists in `abTestPages`" — once load()
      // updates the list it'll re-pick the first remaining page (or
      // null if the list is empty). No manual re-selection needed
      // here, and trying to do it synchronously hits a race because
      // load() is still in flight.
      setAbDeleteTarget(null);
    } catch (e) {
      trace.error('settings:ab-delete-page', e);
    } finally {
      setIsAbDeleting(false);
    }
  }, [abTestsByPage]);

  // ─── Save handlers ─────────────────────────────────────────────────

  const handleSaveSiteMetadata = useCallback(() => {
    if (!hasMetadataChanges) return;
    trace.action('settings:save-metadata', { siteName, siteDescription, defaultLanguage });
    setWebsiteSettings({
      ...websiteSettings,
      name: siteName,
      description: siteDescription,
      languageCode: defaultLanguage,
    });
    queueMutation({ type: 'updateMetadata', metadata: { title: siteName, description: siteDescription } });
    queueMutation({ type: 'updateSiteConfig', config: { language: defaultLanguage } });
    setHasMetadataChanges(false);
  }, [hasMetadataChanges, siteName, siteDescription, defaultLanguage, websiteSettings, setWebsiteSettings]);

  const handleSaveCustomCode = useCallback(() => {
    if (!hasCustomCodeChanges) return;
    trace.action('settings:save-custom-code');
    setWebsiteSettings({ ...websiteSettings, customCodeHead, customCodeBody });
    queueMutation({ type: 'updateSiteConfig', config: { customHead: customCodeHead, customBody: customCodeBody } });
    setHasCustomCodeChanges(false);
  }, [hasCustomCodeChanges, customCodeHead, customCodeBody, websiteSettings, setWebsiteSettings]);

  const handleSaveTheme = useCallback(() => {
    if (!hasThemeChanges) return;
    trace.action('settings:save-theme', { defaultTheme });
    setWebsiteSettings({ ...websiteSettings, defaultTheme });
    queueMutation({ type: 'updateSiteConfig', config: { theme: defaultTheme } });
    setHasThemeChanges(false);
  }, [hasThemeChanges, defaultTheme, websiteSettings, setWebsiteSettings]);

  // ─── Upload handler ────────────────────────────────────────────────

  const handleUploadMetadata = useCallback(async (
    file: File,
    source: string,
    setLoading: (loading: boolean) => void,
    onSuccess: (url: string) => void,
  ) => {
    if (!websiteId) return;
    setLoading(true);
    trace.action('settings:upload-start', { source, fileName: file.name });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'metadata');
      formData.append('source', source);
      formData.append('websiteId', websiteId);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      trace.action('settings:upload-success', { source, url: data.url });
      onSuccess(data.url);
    } catch (error) {
      trace.error('settings:upload-failed', error);
      alert('Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  // ─── Favicon handlers ──────────────────────────────────────────────

  const handleFaviconLightUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUploadMetadata(file, 'favicon-light', setIsUploadingFaviconLight, (url) => {
      setWebsiteSettings({ ...websiteSettings, faviconLight: url });
      queueMutation({ type: 'updateMetadata', metadata: { icons: { icon: url } } });
    });
    e.target.value = '';
  }, [handleUploadMetadata, websiteSettings, setWebsiteSettings]);

  const handleRemoveFavicon = () => {
    if (!websiteSettings.faviconLight) return;
    setShowRemoveFaviconConfirm(true);
  };

  const confirmRemoveFavicon = useCallback(async () => {
    setShowRemoveFaviconConfirm(false);
    setIsDeletingFavicon(true);
    trace.action('settings:remove-favicon');
    try {
      const deleteResponse = await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteSettings.faviconLight }),
      });
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete file from storage');
      }
      setWebsiteSettings({
        ...websiteSettings,
        faviconLight: '',
      });
      queueMutation({ type: 'updateMetadata', metadata: { icons: { icon: '' } } });
    } catch (error) {
      trace.error('settings:remove-favicon', error);
      alert('Failed to remove favicon. Please try again.');
    } finally {
      setIsDeletingFavicon(false);
    }
  }, [websiteSettings, setWebsiteSettings]);

  // ─── Social share handlers ─────────────────────────────────────────

  const handleSocialShareUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUploadMetadata(file, 'social-share-default', setIsUploadingSocialShare, (url) => {
      setWebsiteSettings({ ...websiteSettings, socialShareImage: url });
      queueMutation({ type: 'updateMetadata', metadata: { openGraph: { images: [url] } } });
    });
    e.target.value = '';
  }, [handleUploadMetadata, websiteSettings, setWebsiteSettings]);

  const handleRemoveSocialShare = () => {
    if (!websiteSettings.socialShareImage) return;
    setShowRemoveSocialShareConfirm(true);
  };

  const confirmRemoveSocialShare = useCallback(async () => {
    setShowRemoveSocialShareConfirm(false);
    setIsDeletingSocialShare(true);
    trace.action('settings:remove-social-share');
    try {
      const deleteResponse = await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteSettings.socialShareImage }),
      });
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete file from storage');
      }
      setWebsiteSettings({
        ...websiteSettings,
        socialShareImage: '',
      });
      queueMutation({ type: 'updateMetadata', metadata: { openGraph: { images: [] } } });
    } catch (error) {
      trace.error('settings:remove-social-share', error);
      alert('Failed to remove image. Please try again.');
    } finally {
      setIsDeletingSocialShare(false);
    }
  }, [websiteSettings, setWebsiteSettings]);

  // ─── Language change handler ───────────────────────────────────────

  const handleDefaultLanguageChange = (code: string) => {
    trace.action('settings:language-change', { from: defaultLanguage, to: code });
    setDefaultLanguage(code);
  };

  // ─── Menu categories (built from registry) ────────────────────────

  const menuCategories = buildMenuCategories(getSettingsCategories(), abTestPages);

  const activeBuilderTheme = getBuilderThemeById(builderTheme) ?? BUILDER_THEMES[0]!;
  const activeAccent = editorThemeMode === 'dark' ? activeBuilderTheme.dark.accent : activeBuilderTheme.light.accent;
  const activeNeutral = EDITOR_NEUTRAL_SWATCHES[editorThemeMode][editorNeutralLevel];
  const workspaceLabel = workspaceMode === 'floating'
    ? 'Float'
    : workspaceMode === 'compact-docked' || workspaceMode === 'compact'
      ? 'Focus'
      : 'Full';

  const handleWebsitePreviewTheme = (mode: EditorThemeMode) => {
    setWebsitePreviewTheme(mode);
    requestAnimationFrame(() => refreshCanvasTokens());
    trace.action('general-settings:preview-theme', { mode });
  };

  const handleInspectorAutoHide = (enabled: boolean) => {
    if (enabled) {
      setRightPaneOpen(false);
      setRightInspectorTemporaryReveal(false);
      setRightInspectorExplicitCollapse(false);
    }
    setRightInspectorAutoHide(enabled);
    trace.action('general-settings:inspector-auto-hide', { enabled });
  };

  // ─── renderContent ─────────────────────────────────────────────────

  const renderContent = () => {
    if (activeSection === 'localization') {
      return <div className="h-[min(650px,calc(100vh-190px))] max-w-[520px] overflow-hidden rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-surface)]">
        <LocalePanel />
      </div>;
    }
    // General is field/editor-level. Project/site source configuration lives
    // in ProjectSettingsModal and is intentionally not rendered full-screen.
    if (activeSection === 'website') {
      return (
        <div data-general-settings className="space-y-5">
          <header className="flex flex-col gap-4 border-b border-[var(--border-light)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl leading-6 font-semibold tracking-[-0.01em] text-[var(--text-primary)]"><UiHeadingText>General</UiHeadingText></h1>
              <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[var(--text-secondary)]">
                Personalize how field looks, behaves, and arranges itself. These preferences follow you across projects.
              </p>
            </div>
            <div
              data-general-settings-summary
              className="flex w-fit items-center gap-2 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-hover)]/25 px-2.5 py-1.5 text-[10px] text-[var(--text-secondary)]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeAccent }} />
              <span>{editorThemeMode === 'dark' ? 'Dark' : 'Light'}</span>
              <span className="text-[var(--text-disabled)]">·</span>
              <span>{activeBuilderTheme.label}</span>
              <span className="text-[var(--text-disabled)]">·</span>
              <span>{workspaceLabel}</span>
            </div>
          </header>

          <SettingsGroup surface title="Appearance">
            <div data-general-appearance-preview className="p-4">
              <div
                className="relative h-[118px] overflow-hidden rounded-[7px] border border-[var(--border-light)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
                style={{ backgroundColor: activeNeutral }}
              >
                <div className="absolute inset-x-0 top-0 h-6 border-b border-black/10 bg-black/10" />
                <div className="absolute left-0 top-6 bottom-0 w-8 border-r border-black/10 bg-black/10">
                  <div className="mx-auto mt-2 h-4 w-4 rounded-[3px]" style={{ backgroundColor: activeAccent }} />
                  <div className="mx-auto mt-2 h-3 w-3 rounded-[2px] bg-black/15" />
                  <div className="mx-auto mt-1.5 h-3 w-3 rounded-[2px] bg-black/15" />
                </div>
                <div className="absolute left-8 right-24 top-6 bottom-0 bg-black/[0.035]">
                  <div className="absolute left-5 top-4 h-14 w-24 rounded-[3px] border border-black/10 bg-white/10" />
                  <div className="absolute left-9 top-8 h-2 w-14 rounded-full bg-black/15" />
                  <div className="absolute left-9 top-12 h-1.5 w-10 rounded-full bg-black/10" />
                </div>
                <div className="absolute right-0 top-6 bottom-0 w-24 border-l border-black/10 bg-black/[0.07] p-2">
                  <div className="h-2 w-12 rounded-full bg-black/15" />
                  <div className="mt-3 h-1.5 w-16 rounded-full bg-black/10" />
                  <div className="mt-1.5 h-1.5 w-12 rounded-full bg-black/10" />
                  <div className="mt-4 h-5 w-full rounded-[3px] border border-black/10 bg-white/[0.08]" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-[var(--text-primary)]">Editor chrome</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">Preview of your current field appearance.</div>
                </div>
                <div className="text-[10px] tabular-nums text-[var(--text-disabled)]">Neutral {editorNeutralLevel}</div>
              </div>
            </div>

            <SettingsRow label="Mode" align="top">
              <div className="grid max-w-md grid-cols-2 gap-2">
                {(['light', 'dark'] as EditorThemeMode[]).map((mode) => (
                  <ChoiceTile
                    key={mode}
                    compact
                    active={editorThemeMode === mode}
                    title={mode === 'dark' ? 'Dark' : 'Light'}
                    description={mode === 'dark' ? 'Low-light editor chrome' : 'Bright editor chrome'}
                    onClick={() => setEditorThemeMode(mode)}
                  >
                    <div
                      className="h-9 rounded-[4px] border border-black/10"
                      style={{ backgroundColor: EDITOR_NEUTRAL_SWATCHES[mode][editorNeutralLevel] }}
                    />
                  </ChoiceTile>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Neutral tone" align="top">
              <div className="flex flex-wrap gap-2">
                {(['1', '2', '3', '4', '5'] as EditorNeutralLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-label={`Neutral tone ${level}`}
                    aria-pressed={editorNeutralLevel === level}
                    onClick={() => setEditorNeutralLevel(level)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[5px] border transition-all ${
                      editorNeutralLevel === level
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border-light)] hover:border-[var(--text-disabled)]'
                    }`}
                    style={{ backgroundColor: EDITOR_NEUTRAL_SWATCHES[editorThemeMode][level] }}
                  >
                    <span className={`text-[9px] font-semibold ${
                      editorThemeMode === 'dark' ? 'text-white/60' : 'text-black/50'
                    }`}>{level}</span>
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Accent" align="top">
              <div className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {BUILDER_THEMES.map((theme) => {
                  const accent = editorThemeMode === 'dark' ? theme.dark.accent : theme.light.accent;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={activeBuilderTheme.id === theme.id}
                      onClick={() => setBuilderTheme(theme.id)}
                      className={`flex items-center gap-2.5 rounded-[5px] border px-2.5 py-2 text-left transition-colors ${
                        activeBuilderTheme.id === theme.id
                          ? 'border-[var(--accent)] bg-[var(--accent-surface)]'
                          : 'border-[var(--border-light)] bg-[var(--bg-surface)]/65 hover:bg-[var(--bg-hover)]/55'
                      }`}
                    >
                      <span className="h-5 w-5 shrink-0 rounded-[4px] border border-black/15" style={{ backgroundColor: accent }} />
                      <span className="truncate text-[11px] font-medium text-[var(--text-primary)]">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </SettingsRow>

            <SettingsRow label="Website preview" align="top">
              <div className="flex flex-col gap-1.5">
                <SegmentedChoice
                  value={websitePreviewTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  onChange={(value) => handleWebsitePreviewTheme(value as EditorThemeMode)}
                />
                <p className="text-[10px] leading-4 text-[var(--text-tertiary)]">
                  Changes how Canvas and Preview display an existing site theme. It never rewrites project source.
                </p>
              </div>
            </SettingsRow>

            <SettingsRow label="Lowercase headings" align="top">
              <div className="flex items-start justify-between gap-4 py-0.5">
                <p className="max-w-lg text-xs leading-relaxed text-[var(--text-tertiary)]">
                  Apply loew.fi lowercase styling to eligible interface headings and feature names. Acronyms, trademarks, product names, and structural names keep their intended case.
                </p>
                <div className="shrink-0 pt-0.5">
                  <Toggle value={lowercaseHeadings} onChange={setLowercaseHeadings} />
                </div>
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup surface title="Workspace">
            <SettingsRow label="Layout" align="top">
              <div className="grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { id: 'docked', title: 'Full', description: 'Expanded panels' },
                  { id: 'compact-docked', title: 'Focus', description: 'More canvas, slim panels' },
                  { id: 'floating', title: 'Float', description: 'Detached working panels' },
                ] as Array<{ id: Exclude<WorkspaceMode, 'compact'>; title: string; description: string }>).map((mode) => (
                  <ChoiceTile
                    key={mode.id}
                    active={workspaceMode === mode.id || (mode.id === 'compact-docked' && workspaceMode === 'compact')}
                    title={mode.title}
                    description={mode.description}
                    onClick={() => setWorkspaceMode(mode.id)}
                  >
                    <WorkspaceChoiceGlyph mode={mode.id} />
                  </ChoiceTile>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Panel behavior" align="top">
              <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 px-3 py-2.5">
                  <div>
                    <div className="text-[11px] font-medium text-[var(--text-primary)]">Auto-hide left panel</div>
                    <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">Keep the canvas clear until the rail is needed.</div>
                  </div>
                  <Toggle value={workspaceAutoHide} onChange={setWorkspaceAutoHide} />
                </div>
                <div className="flex items-center justify-between rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 px-3 py-2.5">
                  <div>
                    <div className="text-[11px] font-medium text-[var(--text-primary)]">Auto-hide Inspector</div>
                    <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">Reveal the Inspector only when context needs it.</div>
                  </div>
                  <Toggle value={rightInspectorAutoHide} onChange={handleInspectorAutoHide} />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow label="Panel widths" align="top">
              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>Pages & layers</span>
                    <span className="tabular-nums text-[var(--text-tertiary)]">{leftContentWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_LEFT_CONTENT_WIDTH}
                    max={MAX_LEFT_CONTENT_WIDTH}
                    step={4}
                    value={leftContentWidth}
                    onChange={(event) => setLeftContentWidth(Number(event.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>Inspector</span>
                    <span className="tabular-nums text-[var(--text-tertiary)]">{rightPaneWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_RIGHT_PANE_WIDTH}
                    max={MAX_RIGHT_PANE_WIDTH}
                    step={4}
                    value={rightPaneWidth}
                    onChange={(event) => setRightPaneWidth(Number(event.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup surface title="Canvas">
            <SettingsRow label="Selection">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-medium text-[var(--text-primary)]">Auto focus layers</div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">Reveal and scroll to the selected layer automatically.</div>
                </div>
                <Toggle value={autoFocusLayers} onChange={setAutoFocusLayers} />
              </div>
            </SettingsRow>
            <SettingsRow label="Guides">
              <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 px-3 py-2">
                  <span className="text-[11px] text-[var(--text-primary)]">Show rulers</span>
                  <Toggle value={showRulers} onChange={setShowRulers} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-surface)]/55 px-3 py-2">
                  <span className="text-[11px] text-[var(--text-primary)]">Pixel grid at high zoom</span>
                  <Toggle value={showPixelGrid} onChange={setShowPixelGrid} />
                </div>
              </div>
            </SettingsRow>
            <SettingsRow label="Zoom">
              <div className="flex max-w-xl items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-medium text-[var(--text-primary)]">Smooth zoom</div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">Animate wheel and shortcut zoom instead of snapping.</div>
                </div>
                <Toggle value={useSmoothZoom} onChange={setUseSmoothZoom} />
              </div>
            </SettingsRow>
            <SettingsRow label="Auto pan" align="top">
              <div className="flex flex-col gap-1.5">
                <SegmentedChoice
                  value={autoPanSpeed}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'mid', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                  onChange={(value) => setAutoPanSpeed(value as AutoPanSpeed)}
                />
                <p className="text-[10px] leading-4 text-[var(--text-tertiary)]">Controls edge-scrolling speed while dragging on the canvas.</p>
              </div>
            </SettingsRow>
          </SettingsGroup>
        </div>
      );
    }

    // Look up registered section from plugin registry
    const allSections = getSettingsCategories().flatMap(c => c.items);
    const section = allSections.find(s => s.id === activeSection);
    if (section) {
      const Component = section.component;
      return <Component websiteId={websiteId} />;
    }

    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--text-secondary)]">Section coming soon...</p>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const onClose = () => {
    trace.action('settings:close');
    setIsOpen(false);
  };

  const activeLabel = menuCategories
    .flatMap((cat) => cat.items)
    .find((item) => item.id === activeSection)?.label
    ?? (activeSection === 'pages' ? 'Page settings' : undefined);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* ─── Top bar (standard: back arrow left, title centered) ──
          The editor's RightHeader is bumped to z-[10001] when settings
          is open so it floats above this bar on the right. We reserve
          260px of right padding (RightHeader's width) so the centered
          title stays visually centered relative to the visible portion
          of this bar.

          Left side mirrors LeftHeader (51px logo column + vertical
          rule) so the chrome reads continuously with the editor — same
          treatment preview mode gets. The Back button sits where the
          File/Edit/Insert/View tabs would normally live.            */}
      <div
        className="relative flex items-center h-[52px] border-b border-[var(--control-border)] shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', paddingRight: 260 }}
      >
        <div className="w-[51px] h-full flex items-center justify-center flex-shrink-0">
          <LogoButton />
        </div>
        <div
          aria-hidden
          style={{
            width: 1,
            paddingTop: 15,
            paddingBottom: 15,
            flexShrink: 0,
            alignSelf: 'stretch',
          }}
        >
          <div style={{ width: 1, height: '100%', backgroundColor: 'var(--border-light)' }} />
        </div>
        {/* Back to canvas — same design-system Button + size + variant
            as the right-header Play button, just mirrored: icon on
            the left, "Back" label as the badge text. Reads as a peer
            of the Settings / Export / Play / Publish controls on the
            opposite side of the header. */}
        <div className="flex items-center" style={{ paddingLeft: 7 }}>
          <Button
            variant="secondary"
            size="sm"
            tabIndex={-1}
            className="cut-corners"
            icon={<BackIcon />}
            onClick={onClose}
            title="Back to canvas"
          >
            Back
          </Button>
        </div>
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-primary)] truncate"
          style={{ pointerEvents: 'none' }}
        >
          Settings
        </div>
      </div>

      {/* ─── Body: sidebar + content ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar -- desktop only */}
        {!isMobile && (
          <div
            className="w-[224px] border-r border-[var(--control-border)] flex flex-col overflow-y-auto overscroll-contain shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <nav className="flex-1 px-2.5 py-5 space-y-4">
              {menuCategories.map((category, index) => (
                <div key={index}>
                  {/* Category title — matches the property-panel ToolSection
                      header style (text-xs font-bold, primary color, mixed
                      case) so the settings sidebar and the right tool panel
                      read as the same visual language. */}
                  <div
                    className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
                  >
                    <UiHeadingText>{category.title}</UiHeadingText>
                  </div>
                  <div className="space-y-0.5">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      // Page-scoped A/B Tests items carry their own pagePath
                      // so we can highlight the exact row the user is on; all
                      // other items match purely on activeSection.
                      const isActive = item.pagePath
                        ? activeSection === 'ab-tests' && selectedAbTestPage === item.pagePath
                        : activeSection === item.id;
                      const tests = item.pagePath ? abTestsByPage.get(item.pagePath) ?? [] : [];
                      const showEllipsis = !!item.pagePath && tests.length > 0;
                      const menuOpen = showEllipsis && abMenuOpenFor === item.pagePath;
                      const isRenaming = !!item.pagePath && abRenameTarget?.page_path === item.pagePath;

                      // A/B Tests rows get a hover-revealed ellipsis on the
                      // right (Rename + Delete) — same pattern as the Pages
                      // panel. Wrapped in `group` so the ellipsis can react
                      // to hover ON THE ROW (not just on itself).
                      //
                      // Rename swaps the label `<span>` for an inline
                      // `<input>` (same row geometry — no popover). Save
                      // on Enter / blur; Esc cancels. Mirrors the Pages
                      // panel rename UX exactly.
                      return (
                        <div key={item.id} className="group relative flex items-center">
                          {isRenaming && abRenameTarget ? (
                            <div
                              className={`w-full flex items-center gap-2 pl-3 pr-3 h-8 cut-corners text-[11px] font-medium ${
                                isActive
                                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                                  : 'text-[var(--text-primary)] bg-[var(--bg-hover)]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <SidebarRenameInput
                                initial={abRenameTarget.name}
                                onCommit={(next) => handleAbRename(abRenameTarget.id, next)}
                                onCancel={() => setAbRenameTarget(null)}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (item.pagePath) {
                                  trace.action('settings:ab-test-page-change', { page: item.pagePath });
                                  setActiveSection('ab-tests');
                                  setSelectedAbTestPage(item.pagePath);
                                } else {
                                  trace.action('settings:section-change', { from: activeSection, to: item.id });
                                  setActiveSection(item.id);
                                  setSelectedAbTestPage(null);
                                }
                              }}
                              // `pr-9` reserves space so the row label never
                              // disappears behind the ellipsis on hover.
                              className={`w-full flex items-center gap-2 pl-3 ${showEllipsis ? 'pr-9' : 'pr-3'} h-8 cut-corners text-[11px] font-medium transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span className="truncate"><UiHeadingText>{item.label}</UiHeadingText></span>
                            </button>
                          )}
                          {showEllipsis && item.pagePath && !isRenaming && (
                            <button
                              ref={(el) => { abMenuRefs.current.set(item.pagePath!, el); }}
                              type="button"
                              aria-label="More actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAbMenuOpenFor((cur) => cur === item.pagePath ? null : item.pagePath!);
                              }}
                              // Hidden until row hover OR menu open OR row
                              // selected — matches the reference pages-panel
                              // ellipsis pattern: visible only when the user
                              // is hovering or interacting with the row.
                              className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cut-corners text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-opacity ${
                                menuOpen || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <circle cx="5" cy="12" r="1.6" />
                                <circle cx="12" cy="12" r="1.6" />
                                <circle cx="19" cy="12" r="1.6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        )}

        {/* Content Area */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Mobile: section picker dropdown above the content */}
          {isMobile && (
            <div
              className="flex items-center px-4 py-3 border-b border-[var(--control-border)] shrink-0"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="relative">
                <button
                  onClick={() => setMobileNavOpen((p) => !p)}
                  className="flex items-center gap-1.5 text-base font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  {activeLabel ? <UiHeadingText>{activeLabel}</UiHeadingText> : null}
                  <ChevronDownIcon />
                </button>
                {mobileNavOpen && (
                  <>
                    <div className="fixed inset-0 z-[1]" onClick={() => setMobileNavOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[var(--dropdown-bg)] border border-[var(--border-light)] cut-corners cut-lg cut-border [--cut-border-color:var(--border-light)] shadow-lg py-1.5 z-[2]">
                      {menuCategories.map((category, ci) => (
                        <div key={ci}>
                          <div
                            className="px-3 py-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider"
                          >
                            <UiHeadingText>{category.title}</UiHeadingText>
                          </div>
                          {category.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  trace.action('settings:section-change', { from: activeSection, to: item.id });
                                  setActiveSection(item.id);
                                  setMobileNavOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                                  activeSection === item.id
                                    ? 'text-[var(--text-primary)] bg-[var(--bg-active)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                <span><UiHeadingText>{item.label}</UiHeadingText></span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Scrollable content — wider max-width gives analytics/dashboards
              real estate while keeping form sections readable. Each section
              renders its own page heading (e.g. "Analytics", "A/B testing"),
              so we don't impose one here.

              The A/B-tests detail view + Pages SEO opt out of the
              max-w-4xl + outer scroll because they render their own
              inner sidebar flush against the outer settings sidebar.
              Each manages its own padding and scroll behaviour. */}
          {(activeSection === 'ab-tests' && selectedAbTestPage) || activeSection === 'pages' ? (
            <div className="flex-1 min-h-0">{renderContent()}</div>
          ) : (
            <div className={`flex-1 overflow-y-auto overscroll-contain ${isMobile ? 'px-4 py-5' : activeSection === 'website' ? 'px-12 py-10' : 'px-10 py-8'}`}>
              <div className={`mx-auto ${activeSection === 'website' ? 'max-w-[920px]' : 'max-w-4xl'}`}>
                {renderContent()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Remove Favicon Modal */}
      <ConfirmModal
        isOpen={showRemoveFaviconConfirm}
        onConfirm={confirmRemoveFavicon}
        onCancel={() => setShowRemoveFaviconConfirm(false)}
        title="Remove favicon"
        message="Are you sure you want to remove this favicon?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Confirm Remove Social Share Modal */}
      <ConfirmModal
        isOpen={showRemoveSocialShareConfirm}
        onConfirm={confirmRemoveSocialShare}
        onCancel={() => setShowRemoveSocialShareConfirm(false)}
        title="Remove social share image"
        message="Are you sure you want to remove this image?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />

      {/* ─── A/B Tests sidebar row ⋯ infrastructure ───────────────────
          DropdownMenu anchored to whichever row's ⋯ is currently open.
          Rename + Delete entries operate on the FIRST test of that
          page (1 test per page is the common flow — multi-test pages
          surface the per-test ellipsis in the test card itself). */}
      {abMenuOpenFor && (() => {
        const tests = abTestsByPage.get(abMenuOpenFor) ?? [];
        const primaryTest = tests[0];
        const anchorEl = abMenuRefs.current.get(abMenuOpenFor) ?? null;
        // anchorRef has to be a stable RefObject; fake one off the
        // current snapshot. DropdownMenu only reads `.current`.
        const anchorRef = { current: anchorEl } as React.RefObject<HTMLButtonElement>;
        const items: DropdownMenuEntry[] = [];
        if (primaryTest) {
          items.push({
            id: 'rename',
            label: tests.length > 1 ? `Rename "${primaryTest.name}"` : 'Rename',
            onClick: () => {
              setAbMenuOpenFor(null);
              setAbRenameTarget(primaryTest);
            },
          });
          items.push({ type: 'separator' });
        }
        items.push({
          id: 'delete',
          label: tests.length > 1 ? `Delete ${tests.length} tests` : 'Delete',
          onClick: () => {
            setAbMenuOpenFor(null);
            setAbDeleteTarget(abMenuOpenFor);
          },
        });
        return (
          <DropdownMenu
            isOpen
            onClose={() => setAbMenuOpenFor(null)}
            items={items}
            anchorRef={anchorRef}
            position="bottom-right"
            minWidth={160}
            hoverStyle="accent"
          />
        );
      })()}

      <ConfirmModal
        isOpen={abDeleteTarget !== null}
        onConfirm={() => { if (abDeleteTarget) void handleAbDeleteForPage(abDeleteTarget); }}
        onCancel={() => setAbDeleteTarget(null)}
        title="Delete A/B test"
        message={(() => {
          if (!abDeleteTarget) return '';
          const tests = abTestsByPage.get(abDeleteTarget) ?? [];
          if (tests.length === 1) {
            return `"${tests[0]!.name}" will be permanently removed along with its variant files. Conversion data already in your analytics stays put.`;
          }
          return `${tests.length} test(s) on this page will be permanently removed along with their variant files. Conversion data already in your analytics stays put.`;
        })()}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isAbDeleting}
      />
    </div>,
    document.body
  );
}

/** Inline rename input for an A/B Tests sidebar row. Replaces the
 *  row's label `<span>` while editing. Mirrors the Pages-panel rename
 *  UX exactly: auto-focus, auto-select on mount, commit on Enter or
 *  blur, cancel on Escape. Save target is the FIRST test on the page
 *  (the SettingsOverlay's `abRenameTarget` already carries that test). */
function SidebarRenameInput({
  initial, onCommit, onCancel,
}: {
  initial: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  // Track whether a commit has already fired so onBlur doesn't
  // double-commit after Enter / Escape (Enter calls onCommit then the
  // input loses focus → onBlur would re-fire).
  const committedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) {
      onCancel();
      return;
    }
    onCommit(trimmed);
  };

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); committedRef.current = true; onCancel(); }
      }}
      onBlur={commit}
      className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-[var(--text-primary)] p-0"
    />
  );
}
