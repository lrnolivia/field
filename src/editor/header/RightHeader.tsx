// RightHeader.tsx — Top-right header bar above the properties panel.
// Compact 52px header whose width follows the resizable properties pane.
// Contains: Settings, Export, Preview (play icon), Live buttons.
//
// The Live button does NOT publish on click — it opens `LiveDropdown`
// (port of `../../builder/src/builder/view/header/RightHeader.tsx` ~lines
// 759–910) which shows the live URL, last-published timestamp, and a
// primary button that reads "Publish" on first publish or "Update live
// site" once already published. Clicking that button kicks off the
// actual deploy + drives a fake-monotonic progress bar inside the
// dropdown so the 25 s deploy doesn't feel dead.

import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { useSetAtom, useAtomValue, useAtom } from 'jotai';
import { exportDropdownOpenAtom } from '@/code/stores/editor-store';
import { PlayIcon } from '@/shared/icons';
import { trace } from '@/shared/debug-trace';
import ConfirmDialog from '@/design-system/ConfirmDialog';
import { settingsOverlayOpenAtom, settingsSectionAtom, websiteMetaAtom } from '@/code/stores/website-settings-store';
import { isComponentFileAtom, selectedIdsAtom } from '@/code/stores/store';
import { LiveDropdown } from './LiveDropdown';
import { ExportDropdown, type ExportFormat } from './ExportDropdown';
import ExportConfirmModal, { TRANSFORMATIVE_FORMATS } from '../ui/ExportConfirmModal';
import { exportProject } from './export-project';
import { useIsClosedSource } from '@/code/stores/closed-source-store';
import { parseWebsiteMeta } from './publish-utils';
import { useSigmoidProgress } from '@/editor/hooks/useSigmoidProgress';
import type { WebsiteMeta } from '@/backend/types';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { leftPaneOpenAtom, rightPaneOpenAtom, rightPaneWidthAtom, rightPaneDetachedAtom, rightPaneDragOffsetAtom } from '@/code/stores/workspace-panels-store';
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
  const [rightPaneOpen, setRightPaneOpen] = useAtom(rightPaneOpenAtom);
  const [rightDetached, setRightDetached] = useAtom(rightPaneDetachedAtom);
  const [rightDragOffset, setRightDragOffset] = useAtom(rightPaneDragOffsetAtom);
  const selectedCount = useAtomValue(selectedIdsAtom).length;
  const rightPaneWidth = useAtomValue(rightPaneWidthAtom);
  const workspace = deriveWorkspaceLayout(leftPaneOpen, rightPaneOpen, { rightPaneWidth, rightDetached });
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

  const beginRightDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rightDetached || event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = rightDragOffset;
    document.documentElement.dataset.workspaceResizing = 'true';
    const move = (next: PointerEvent) => {
      const baseLeft = window.innerWidth - 24 - rightPaneWidth;
      const x = Math.max(8 - baseLeft, Math.min(window.innerWidth - 8 - rightPaneWidth - baseLeft, startOffset.x + next.clientX - startX));
      const y = Math.max(-62, Math.min(window.innerHeight - 170, startOffset.y + next.clientY - startY));
      setRightDragOffset({ x, y });
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      delete document.documentElement.dataset.workspaceResizing;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

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
            transform: rightDetached ? `translate(${rightDragOffset.x}px, ${rightDragOffset.y}px)` : undefined,
          }}
        >
          {rightDetached && <div data-right-pane-drag-handle onPointerDown={beginRightDrag}
            aria-label="Move properties pane" title="Drag to move" className="mr-1 flex h-7 w-4 shrink-0 cursor-move touch-none items-center justify-center text-[var(--text-tertiary)]">⋮</div>}
          <button type="button" data-field-right-pane-collapse aria-label="Collapse properties pane"
            title="Collapse properties pane" onClick={() => setRightPaneOpen(false)}
            className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors hover:bg-[var(--button-secondary-bg)]">
            <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1" /><path d="M10.5 2.25v11.5" />
            </svg>
          </button>
          <button type="button" data-field-right-pane-detach
            aria-label={rightDetached ? 'Dock properties pane' : 'Detach properties pane'}
            title={rightDetached ? 'Dock properties pane' : 'Detach properties pane'}
            onClick={() => { setRightDetached(!rightDetached); setRightDragOffset({ x: 0, y: 0 }); }}
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
            <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <rect x="2" y="3" width="9" height="9" rx="1" /><path d={rightDetached ? 'M8 2h5v5M13 2 8 7' : 'M8 1.75h5.25a1 1 0 0 1 1 1V8M9.25 6.75l5-5'} />
            </svg>
          </button>
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
      {!rightPaneOpen && !previewMode && (
        <div data-workspace-right-toggle data-visible="true"
          className="fixed right-2 top-2 z-[9999] flex h-11 w-[264px] items-center gap-2 rounded-[8px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 shadow-[var(--shadow-lg)]">
          <button type="button" aria-label="Expand properties pane" title="Expand properties pane"
            onClick={() => setRightPaneOpen(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors hover:bg-[var(--button-secondary-bg)]">
            <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1" /><path d="M10.5 2.25v11.5" />
            </svg>
          </button>
          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[var(--bg-hover)] text-[11px] font-semibold text-[var(--text-secondary)]">D</span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-primary)]">Design</span>
          {selectedCount > 0 && <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-tertiary)]">{selectedCount} selected</span>}
          <button type="button" aria-label="Detach properties pane" title="Detach properties pane"
            onClick={() => { setRightDetached(true); setRightPaneOpen(true); setRightDragOffset({ x: 0, y: 0 }); }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
            <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="9" height="9" rx="1" /><path d="M8 1.75h5.25a1 1 0 0 1 1 1V8M9.25 6.75l5-5" /></svg>
          </button>
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
