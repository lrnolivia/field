// RightHeader.tsx — Top-right header bar above the properties panel.
// Exact port from old builder: 52px height, 260px width.
// Contains: Settings, Export, Preview (play icon), Live buttons.
//
// The Live button does NOT publish on click — it opens `LiveDropdown`
// (port of `../../builder/src/builder/view/header/RightHeader.tsx` ~lines
// 759–910) which shows the live URL, last-published timestamp, and a
// primary button that reads "Publish" on first publish or "Update live
// site" once already published. Clicking that button kicks off the
// actual deploy + drives a fake-monotonic progress bar inside the
// dropdown so the 25 s deploy doesn't feel dead.

import { useCallback, useEffect, useState } from 'react';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { useSetAtom, useAtomValue, useAtom } from 'jotai';
import { exportDropdownOpenAtom } from '@/code/stores/editor-store';
import { PlayIcon } from '@/shared/icons';
import { trace } from '@/shared/debug-trace';
import ConfirmDialog from '@/design-system/ConfirmDialog';
import { settingsOverlayOpenAtom, settingsSectionAtom, websiteMetaAtom } from '@/code/stores/website-settings-store';
import { isComponentFileAtom } from '@/code/stores/store';
import { LiveDropdown } from './LiveDropdown';
import { ExportDropdown, type ExportFormat } from './ExportDropdown';
import ExportConfirmModal, { TRANSFORMATIVE_FORMATS } from '../ui/ExportConfirmModal';
import { exportProject } from './export-project';
import { useIsClosedSource } from '@/code/stores/closed-source-store';
import { parseWebsiteMeta } from './publish-utils';
import { useSigmoidProgress } from '@/editor/hooks/useSigmoidProgress';
import type { WebsiteMeta } from '@/backend/types';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { leftPaneOpenAtom, rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { deriveWorkspaceLayout } from '@/editor/workspace-layout';
import InspectorCollaborators from '@/editor/collab/InspectorCollaborators';

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  previewMode: boolean;
  onTogglePreview: () => void;
}

export default function RightHeader({ previewMode, onTogglePreview }: Props) {
  const isViewer = useIsViewer();
  const isClosedSource = useIsClosedSource();
  const leftPaneOpen = useAtomValue(leftPaneOpenAtom);
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);
  const workspace = deriveWorkspaceLayout(leftPaneOpen, rightPaneOpen);
  trace.fn('RightHeader:render', { previewMode, presentation: workspace.right.presentation });
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  // Publish failures used to go through window.alert(), which is unstyled,
  // blocks the tab, and gives a plan-limit rejection no way to act on itself.
  // `upgradable` marks the PAYMENT_REQUIRED case so the dialog can offer the
  // plans overlay instead of a dead OK button.
  const [publishError, setPublishError] = useState<{ message: string; upgradable: boolean; retryable?: boolean } | null>(null);
  const [meta, setMeta] = useState<WebsiteMeta | null>(null);
  const [open, setOpen] = useState(false);
  // ─── Fake progress ticker ────────────────────────────────────────────
  // 0 → 0.95 over ~25 s on a sigmoid curve so the bar moves fast at the
  // start and decelerates as it approaches the asymptote — "looks like
  // it's working hard." Real success snaps it to 1.0; real failure snaps
  // it to 0. We don't model deploy progress because vinext doesn't expose
  // any. Shared RAF harness — see useSigmoidProgress.
  const { progress, setProgress, startProgress, stopProgress } = useSigmoidProgress();

  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const setWebsiteMeta = useSetAtom(websiteMetaAtom);
  const setSettingsSection = useSetAtom(settingsSectionAtom);
  // Component-master files swap the editor's accent color from blue
  // (`--accent`) to purple (`--accent-secondary`). Mirror that on the
  // header's primary buttons (Play when active, Live) so the user has a
  // consistent visual signal that they're editing a component, not a
  // page. Inline `style.backgroundColor` overrides the variant class's
  // `bg-[var(--accent)]` (specificity: inline > class).
  const isComponentFile = useAtomValue(isComponentFileAtom);
  const primaryBg = isComponentFile ? { backgroundColor: 'var(--accent-secondary)' } : undefined;

  // ─── Meta fetch ──────────────────────────────────────────────────────
  // Pulls publish state on mount + after every successful publish so the
  // dropdown stays in sync with the backend (subdomain, published_at,
  // custom_domain, etc.). Fire-and-forget — failures just leave `meta`
  // null and the dropdown shows "Not published yet".
  const fetchMeta = useCallback(async () => {
    if (!CLOUD_ENABLED) return;
    try {
      const id = (await import('@/backend/project-id')).getProjectId();
      const res = await fetch(`/api/websites/${id}`);
      if (!res.ok) return;
      const w = await res.json();
      const parsed = parseWebsiteMeta(w);
      setMeta(parsed);
      // Mirror into the shared atom so non-header chrome (the bottom
      // toolbar's Upgrade button) can react to the site's plan.
      setWebsiteMeta(parsed);
    } catch (err) {
      trace.error('header:meta-fetch', err);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Re-pull meta when the Domain settings tab adds/removes a custom
  // subdomain or domain — the publish dropdown's live URL derives from
  // custom_domain → custom_subdomain → subdomain, so it must re-sync.
  useEffect(() => {
    const onChange = () => fetchMeta();
    window.addEventListener('website-meta-changed', onChange);
    return () => window.removeEventListener('website-meta-changed', onChange);
  }, [fetchMeta]);

  // ─── Export ──────────────────────────────────────────────────────────
  // Click "Export" → opens ExportDropdown (mirrors LiveDropdown's
  // pattern). The dropdown lists format options (Source / Tailwind /
  // …) and a primary "Export project" button. Format selection is
  // persisted across opens; the button flips to "Upgrade to export
  // in X" when the selected format requires a higher plan tier.
  const [exporting, setExporting] = useState(false);
  // Atom, not local state — File ▸ Export code… in the left-header menu opens
  // this same dropdown, so the user picks a format in one place instead of
  // the menu duplicating the picker or exporting a format it guessed.
  const [exportOpen, setExportOpen] = useAtom(exportDropdownOpenAtom);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('source');
  const setSettingsOpenAtom = useSetAtom(settingsOverlayOpenAtom);
  const setSettingsSectionAtom = useSetAtom(settingsSectionAtom);

  // The fetch → blob → download sequence lives in `export-project.ts` so
  // the cmd+K "Export Code" row runs the same path rather than a second
  // copy. Only the spinner and dropdown state are the component's job.
  // Transformative formats (Vite project, HTML + CSS) confirm first — the
  // output goes through a rewrite / prerender step and may not match the
  // source project exactly. Source export downloads straight away.
  const [confirmFormat, setConfirmFormat] = useState<ExportFormat | null>(null);
  const runExport = useCallback(async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      if (await exportProject(format)) { setExportOpen(false); setConfirmFormat(null); }
    } finally {
      setExporting(false);
    }
  }, [exporting]);
  const handleExport = useCallback(() => {
    if (TRANSFORMATIVE_FORMATS.has(exportFormat)) {
      trace.action('header:export-confirm-open', { format: exportFormat });
      setConfirmFormat(exportFormat);
      return;
    }
    void runExport(exportFormat);
  }, [exportFormat, runExport]);

  // Open Settings → Plans tab when the user clicks the upgrade
  // affordance inside the export dropdown.
  const handleExportUpgrade = useCallback(() => {
    trace.action('header:export-upgrade-click', { format: exportFormat });
    setExportOpen(false);
    setSettingsSectionAtom('plans');
    setSettingsOpenAtom(true);
  }, [exportFormat, setSettingsSectionAtom, setSettingsOpenAtom]);

  useEffect(() => {
    if (!exportOpen || (!isViewer && !isClosedSource)) return;
    trace.action('header:export-blocked', { isViewer, isClosedSource });
    setExportOpen(false);
  }, [exportOpen, isViewer, isClosedSource, setExportOpen]);

  // ─── Publish ─────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!CLOUD_ENABLED || publishing) return;
    const id = (await import('@/backend/project-id')).getProjectId();
    setPublishing(true);
    setPublishSuccess(false);
    startProgress();
    trace.action('header:publish-start', { id });
    try {
      // Publish builds from the STORED DB row — flush any queued mutations
      // and the debounced autosave first, or a publish clicked within ~2s of
      // an edit deploys the previous save (the "added a frame, published,
      // live site doesn't have it" report).
      const { flushNow } = await import('@/code/mutation/mutation-queue');
      flushNow();
      // Tier-3 pre-flight: the backend ships the source verbatim (no oracle at
      // publish), so a file that parses but crashes React — a string style
      // attribute, an undeclared identifier — used to reach production as a
      // white page (bug-hunt 22). Refuse here, with file + line.
      const { runPublishPreflight, formatPreflightIssues } = await import('@/code/oracle/publish-preflight');
      const preflight = runPublishPreflight();
      if (preflight.length > 0) {
        trace.error('header:publish-preflight-blocked', { issues: preflight });
        setProgress(0);
        setPublishError({ message: formatPreflightIssues(preflight), upgradable: false });
        return;
      }
      const { flushSaveNow } = await import('@/backend/autosave');
      await flushSaveNow();
      const res = await fetch(`/api/websites/${id}/publish`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.url) {
        trace.action('header:publish-success', { url: json.url });
        setProgress(1);
        setPublishSuccess(true);
        await fetchMeta();
        setTimeout(() => setPublishSuccess(false), 2000);
      } else {
        trace.error('header:publish-failed', json);
        setProgress(0);
        // The API serializes failures as `{ error: { code, message, details } }`.
        // Older paths return a bare string, hence the typeof check.
        const e = json?.error;
        // Plan-limit rejections carry a structured `violations` array — render
        // those one per line instead of the flattened sentence, so a site over
        // on three axes reads as three lines rather than a paragraph.
        const violations = e?.details?.violations;
        const body = Array.isArray(violations) && violations.length > 0
          ? violations.map((v: { message: string }) => v.message).join('\n')
          : (typeof e === 'string' ? e : e?.message) || json?.details || 'Publish failed';
        setPublishError({ message: body, upgradable: e?.code === 'PAYMENT_REQUIRED' });
      }
    } catch (err) {
      trace.error('header:publish-error', err);
      setProgress(0);
      const isSaveConflict = typeof err === 'object' && err !== null
        && 'code' in err && (err as { code?: unknown }).code === 'PERSISTENCE_CONFLICT';
      setPublishError({
        message: isSaveConflict
          ? 'Resolve the save conflict before publishing. Your edits are still in this tab.'
          : 'Something went wrong while publishing. Check the console for details.',
        upgradable: false,
        retryable: !isSaveConflict,
      });
    } finally {
      stopProgress();
      setPublishing(false);
    }
  }, [publishing, startProgress, stopProgress, fetchMeta]);

  // Toggle dropdown — clicks on the Live button itself open/close it.
  // The dropdown's outside-click handler skips clicks on
  // `[data-live-trigger]` so this toggle wins cleanly.
  const handleLiveClick = useCallback(() => {
    if (!CLOUD_ENABLED) return;
    setOpen((prev) => !prev);
    trace.action('header:live-toggle');
  }, []);

  return (
    <>
      {rightPaneOpen && (
        <div
          data-workspace-right-header
          className="fixed z-[9999] flex h-[52px] items-center px-2"
          style={{
            width: workspace.right.width,
            top: workspace.right.top,
            right: workspace.right.inset,
            isolation: 'isolate',
          }}
        >
          <InspectorCollaborators disabled={isViewer} />
          <div className="flex-1" />

          <button
            type="button"
            aria-label={previewMode ? 'Exit preview' : 'Preview'}
            title={previewMode ? 'Exit preview' : 'Preview'}
            data-tutorial="header-preview-button"
            onClick={onTogglePreview}
            className={`flex h-7 w-7 items-center justify-center rounded-[4px] border-none transition-colors ${
              previewMode
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--button-secondary-bg,rgba(255,255,255,0.06))] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`}
            style={previewMode ? primaryBg : undefined}
          >
            <PlayIcon size={14} />
          </button>

          <div className="relative ml-1">
            <button
              type="button"
              onClick={handleLiveClick}
              disabled={isViewer}
              data-live-trigger
              data-tutorial="header-publish-button"
              className="relative flex h-7 min-w-[72px] items-center justify-center overflow-hidden rounded-[4px] border-none bg-[var(--accent)] px-2.5 text-[11px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={primaryBg}
            >
              {publishing && !open && (
                <span
                  className="absolute inset-y-0 left-0 transition-[width] duration-150 ease-out pointer-events-none"
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: 'color-mix(in srgb, var(--accent-fg) 24%, transparent)',
                  }}
                />
              )}
              <span className="relative tabular-nums">
                {publishing && !open ? `${Math.round(progress * 100)}%` : 'Publish'}
              </span>
            </button>
            <LiveDropdown
              open={open}
              meta={meta}
              publishing={publishing}
              publishSuccess={publishSuccess}
              progress={progress}
              onPublish={handlePublish}
              onClose={() => setOpen(false)}
              onOpenBackups={() => {
                trace.action('header:open-backups-from-dropdown');
                setSettingsSection('backups');
                setSettingsOpen(true);
              }}
              onAddDomain={() => {
                trace.action('header:add-domain-from-dropdown');
                setSettingsSection('domain');
                setSettingsOpen(true);
              }}
              onOpenStaging={() => {
                trace.action('header:open-staging-from-dropdown');
                setSettingsSection('staging');
                setSettingsOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Project/source export remains menu-driven. This host exists even when
          the right inspector is collapsed, so File → Export code… never points
          at a missing header control. */}
      <div
        data-project-export-host
        aria-hidden={!exportOpen && !confirmFormat}
        className="fixed z-[10001] h-8 w-[230px]"
        style={{ left: 8, top: 8, pointerEvents: exportOpen || confirmFormat ? 'auto' : 'none' }}
      >
        <div className="relative h-full w-full">
          <ExportConfirmModal
            format={confirmFormat}
            exporting={exporting}
            onConfirm={() => { if (confirmFormat) void runExport(confirmFormat); }}
            onClose={() => setConfirmFormat(null)}
          />
          <ExportDropdown
            open={exportOpen}
            meta={meta}
            format={exportFormat}
            onFormatChange={setExportFormat}
            exporting={exporting}
            onExport={handleExport}
            onUpgrade={handleExportUpgrade}
            onClose={() => setExportOpen(false)}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!publishError}
        onClose={() => setPublishError(null)}
        onConfirm={() => {
          const upgrade = publishError?.upgradable;
          const retryable = publishError?.retryable !== false;
          setPublishError(null);
          if (upgrade) {
            trace.action('header:publish-blocked-upgrade');
            setSettingsSection('plans');
            setSettingsOpen(true);
          } else if (retryable) {
            void handlePublish();
          }
        }}
        title={publishError?.upgradable ? 'Upgrade to publish' : 'Publish failed'}
        message={publishError?.message ?? ''}
        confirmLabel={publishError?.upgradable ? 'See plans' : publishError?.retryable === false ? 'Close' : 'Try again'}
        cancelLabel={publishError?.upgradable ? 'Not now' : publishError?.retryable === false ? 'Keep editing' : 'Close'}
      />
    </>
  );
}
