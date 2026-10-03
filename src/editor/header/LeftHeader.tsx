// LeftHeader.tsx — Top-left header bar above the left panel.
// 52 px height, spans the rail + the user's resizable panel width. Two slots:
//   1. field icon (left) — opens an account/menubar dropdown
//   2. Project name chip (right) — shows the website title, opens
//      a project-scoped menu (rename, site settings, dashboard)
//
// The File / Edit / Insert / View menubar that used to live in the
// right slot was folded into the logo dropdown as right-opening
// submenus (under "Go to Dashboard" / "Your Account"), freeing the
// 256 px slot for the project name. The original menubar's `MenuTabs`
// component is gone; its menu definitions live in `menu-builders.tsx`
// and are consumed verbatim by the logo dropdown.

import { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { FieldGlyph } from '@/editor/glyph';
import { FigmaCodeIcon, FigmaCursorIcon, FigmaFrameIcon, FigmaHandIcon, FigmaCommentIcon, FigmaTextIcon, FigmaRowsIcon, FigmaColumnsIcon, FigmaGridIcon, FigmaSquareIcon, FigmaCircleIcon, FigmaTriangleIcon, FigmaPathIcon, FigmaPencilIcon, FigmaPlayIcon, FigmaSunIcon, FigmaSearchIcon, FigmaPlusIcon, FigmaReloadIcon, FigmaCloseIcon, FigmaLibraryIcon } from '@/shared/loew-figma-icons';
import { PageHomeIcon, PageDocumentIcon, SettingsWebsiteIcon, SettingsPlansIcon, ChainLinkIcon, LightningBoltIcon } from '@/shared/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { previewModeAtom } from '@/code/stores/editor-store';
import { leftPaneOpenAtom, leftContentWidthAtom, LEFT_RAIL_WIDTH } from '@/code/stores/workspace-panels-store';
import WorkspaceModeButton from '@/editor/WorkspaceModeButton';
import { leftRailVisibleAtom, workspaceModeAtom } from '@/editor/workspace-mode-store';
import { workspaceTitlePresentation } from '@/editor/workspace-title-presentation';
import {
  autoPanSpeedAtom,
  autoFocusLayersAtom,
  showRulersAtom,
  useSmoothZoomAtom,
  showPixelGridAtom,
} from '@/code/stores/user-preferences-store';
import { trace } from '@/shared/debug-trace';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import { buildTabs, buildPreferencesSubmenu } from './menu-builders';
import ProjectChip from './ProjectChip';
import AppearancePopover from '@/editor/AppearancePopover';
import KeyboardShortcutsModal from '@/editor/ui/KeyboardShortcutsModal';
import AboutFieldModal from '@/editor/ui/AboutFieldModal';
import ProjectSettingsModal from '@/editor/overlays/ProjectSettingsModal';
import DropdownMenu, { type DropdownMenuEntry } from '@/design-system/DropdownMenu';
import Button from '@/design-system/Button';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { settingsOverlayOpenAtom, settingsSectionAtom, hasActiveSubscriptionAtom } from '@/code/stores/website-settings-store';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { leaveBuilderTo } from '@/backend/leave-builder';
import { showFieldDashboard } from '@/backend/field-navigation';

// Use Field's existing glyph family for every built-in command. Nested menus
// keep their actions, shortcut text and state; only their icon presentation changes.
function commandGlyph(id: string) {
  const Icon = id.includes('zoom') || id === 'view-fit' ? FigmaSearchIcon
    : id.includes('duplicate') || id.includes('copy') ? PageDocumentIcon
    : id.includes('delete') ? FigmaCloseIcon
    : id.includes('undo') || id.includes('redo') ? FigmaReloadIcon
    : id.includes('code') ? FigmaCodeIcon
    : id.includes('theme') ? FigmaSunIcon
    : id.includes('settings') || id.includes('preferences') ? SettingsWebsiteIcon
    : id.includes('upgrade') ? SettingsPlansIcon
    : id.includes('dashboard') ? PageHomeIcon
    : id.includes('remix') ? ChainLinkIcon
    : id.includes('quick') ? LightningBoltIcon
    : id.includes('preview') ? FigmaPlayIcon
    : id.includes('frame') ? FigmaFrameIcon
    : id.includes('text') ? FigmaTextIcon
    : id.includes('rows') ? FigmaRowsIcon
    : id.includes('columns') ? FigmaColumnsIcon
    : id.includes('grid') ? FigmaGridIcon
    : id.includes('rect') ? FigmaSquareIcon
    : id.includes('ellipse') ? FigmaCircleIcon
    : id.includes('triangle') ? FigmaTriangleIcon
    : id.includes('path') || id.includes('line') ? FigmaPathIcon
    : id.includes('sketch') ? FigmaPencilIcon
    : id.includes('hand') ? FigmaHandIcon
    : id.includes('comment') ? FigmaCommentIcon
    : id.includes('select') || id === 'logo-edit' ? FigmaCursorIcon
    : id.includes('insert') || id.includes('new') ? FigmaPlusIcon
    : id.includes('plugin') ? FigmaLibraryIcon
    : PageDocumentIcon;
  return <Icon size={14} />;
}

function withCommandGlyphs(entries: DropdownMenuEntry[]): DropdownMenuEntry[] {
  return entries.map(entry => 'type' in entry ? entry : {
    ...entry,
    icon: entry.icon ?? commandGlyph(entry.id),
    submenuItems: entry.submenuItems ? withCommandGlyphs(entry.submenuItems) : undefined,
  });
}

// ─── Back chevron — same glyph the settings overlay uses for its
// "Back to canvas" affordance. Inline so we don't pull a third-
// party icon for one button.

function BackChevronIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ─── field icon ─────────────────────────────────────────────────────────────

function FieldIcon() {
  return (
    <span
      aria-hidden
      className="block w-[26px] h-[26px] bg-center bg-contain bg-no-repeat"
      style={{ backgroundImage: 'var(--field-app-icon)' }}
    />
  );
}

// ─── Logo button — account-level actions + the entire File/Edit/Insert/View
// menubar as right-opening submenus. Used to be a 2-item menu (Dashboard,
// Account) plus a separate `MenuTabs` chip strip; the strip was folded into
// this dropdown to free the panel-width slot for the project name. Order
// follows the user-confirmed structure: account actions on top, divider,
// File / Edit / Insert / View below.

export function LogoButton() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  // Viewers keep "Go to Dashboard" + "Your Account" (account-level,
  // harmless) but every menubar tab (File / Edit / Insert / View) is
  // disabled — they all open write paths.
  const isViewer = useIsViewer();
  // Upgrade nudge — moved here from the bottom toolbar, where it was a
  // permanent accent pill floating over the canvas. Sites already on a paid
  // plan have nothing to upgrade to, so the row collapses out entirely.
  const hasActiveSubscription = useAtomValue(hasActiveSubscriptionAtom);
  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const setSettingsSection = useSetAtom(settingsSectionAtom);

  // Preference atoms — `buildPreferencesSubmenu` needs them so the toggle
  // rows can render their current state + flip atoms on click. Subscribing
  // here means the submenu re-renders correctly when the user flips a
  // preference (Edit → Preferences → toggle). The atoms are
  // `atomWithStorage`-backed; the new value persists across reloads.
  const [autoPanSpeed, setAutoPanSpeed] = useAtom(autoPanSpeedAtom);
  const [autoFocusLayers, setAutoFocusLayers] = useAtom(autoFocusLayersAtom);
  const [showRulers, setShowRulers] = useAtom(showRulersAtom);
  const [useSmoothZoom, setUseSmoothZoom] = useAtom(useSmoothZoomAtom);
  const [showPixelGrid, setShowPixelGrid] = useAtom(showPixelGridAtom);
  // Builder chrome accent — the top-level "Theme" entry below. In the deps so
  // the submenu's checkmark re-renders on selection.

  const items: DropdownMenuEntry[] = useMemo(() => {
    const preferencesSubmenu = buildPreferencesSubmenu(
      { autoPanSpeed, autoFocusLayers, showRulers, useSmoothZoom, showPixelGrid },
      { setAutoPanSpeed, setAutoFocusLayers, setShowRulers, setUseSmoothZoom, setShowPixelGrid },
    );
    const tabs = buildTabs(preferencesSubmenu);
    // Each tab becomes a single dropdown entry with `submenuItems` —
    // DropdownMenu's submenu machinery (used elsewhere by Site Settings,
    // Plugins, Preferences) flips open on hover. Same flush-before-hard-
    // nav dance the old account entries used: any pending mutation queue
    // must commit to local/cloud before the route swap, otherwise the
    // autosave races the navigation and drops the most recent edit.
    return [
      {
        id: 'logo-dashboard',
        label: 'home',
        onClick: () => {
          trace.action('left-header:logo-dashboard');
          // field's Dashboard is now a persistent layer in FieldShell, not a
          // separate page. Route through the shared navigation seam so the
          // editor can animate its physical chrome out first and Dashboard can
          // slide back over the still-live Canvas.
          void showFieldDashboard();
        },
      },
      {
        id: 'logo-account',
        label: 'account',
        onClick: async () => {
          trace.action('left-header:logo-account');
          // Route to the workspace-scoped account settings in the cloud
          // dashboard: `/dashboard?ws=<workspaceId>&view=settings:account`.
          // `/dashboard` is owned by revyme-cloud, reached via the
          // dispatcher (same hard-nav as "Go to Dashboard" above).
          //
          // workspaceId is fetched per-click. Local mode (or any fetch
          // error) → null → the `ws` param is omitted and the cloud app
          // lands on the user's default workspace. leaveBuilderTo below
          // commits + saves before the route swap, so this await can't
          // race autosave.
          const projectId = getProjectId();
          let workspaceId: string | null = null;
          if (projectId !== 'local') {
            workspaceId = await backend.getWebsiteWorkspaceId(projectId).catch(() => null);
          }
          const params = new URLSearchParams();
          if (workspaceId) params.set('ws', workspaceId);
          params.set('view', 'settings:account');
          await leaveBuilderTo(`/dashboard?${params.toString()}`, 'logo-account');
        },
      },
      // Sits directly under "Your Account" — a billing action belongs with
      // the other account actions. `accent: true` gives it the one coloured
      // label in an otherwise neutral menu so it still stands out, without
      // needing a filled button competing with Publish.
      ...(CLOUD_ENABLED && !isViewer && !hasActiveSubscription ? [{
        id: 'logo-upgrade',
        label: 'Upgrade your plan',
        accent: true,
        onClick: () => {
          trace.action('left-header:upgrade');
          setSettingsSection('plans');
          setSettingsOpen(true);
        },
      }] : []),
      { type: 'separator' },
      // The menubar — flattened into 4 submenu entries. Each `tab.items`
      // is a `DropdownMenuEntry[]` straight from menu-builders.tsx; no
      // shape adaptation needed. The hover-to-open behaviour comes for
      // free from DropdownMenu's submenu support.
      ...tabs.map((tab) => ({
        id: `logo-${tab.id}`,
        label: tab.label,
        // Viewer: disable the tab entirely. DropdownMenu blocks the
        // click AND the hover-to-open for disabled entries, so the
        // File/Edit/Insert/View submenus never fly out.
        disabled: isViewer,
        submenuItems: tab.items,
        onClick: () => {}, // parent items with submenus need a no-op
      })),
      { type: 'separator' as const },
      {
        id: 'logo-settings',
        label: 'Settings…',
        disabled: isViewer,
        onClick: () => {
          if (isViewer) return;
          trace.action('left-header:settings');
          setSettingsSection('website');
          setSettingsOpen(true);
        },
      },
      // Builder chrome accent — a top-level entry rather than a row inside
      // View, because it's a personal appearance preference, not a document
      // command like the File/Edit/Insert/View group above.
      //
      // NOT gated on `isViewer`: recolouring your own editor changes nothing
      // about the project, so a read-only collaborator can still use it.
      {
        id: 'logo-theme',
        label: 'appearance',
        onClick: () => {},
        submenuContent: <AppearancePopover embedded anchorRef={ref} onClose={() => setOpen(false)} />,
      },
      { type: 'separator' as const },
      {
        id: 'logo-about',
        label: 'About field',
        onClick: () => {
          trace.action('left-header:about');
          setOpen(false);
          setAboutOpen(true);
        },
      },
    ];
  }, [
    isViewer, hasActiveSubscription, setSettingsOpen, setSettingsSection,
    autoPanSpeed, autoFocusLayers, showRulers, useSmoothZoom, showPixelGrid,
    setAutoPanSpeed, setAutoFocusLayers, setShowRulers, setUseSmoothZoom, setShowPixelGrid,
  ]);

  return (
    <>
      <motion.button
        ref={ref}
        type="button"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 cut-corners cursor-pointer border-none bg-transparent hover:bg-white/[0.10] transition-colors"
      >
        <FieldGlyph behavior="generic"><FieldIcon /></FieldGlyph>
      </motion.button>
      <DropdownMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        items={withCommandGlyphs(items)}
        anchorRef={ref}
        position="bottom-left"
        minWidth={200}
        hoverStyle="accent"
        searchable
        fitContentHeight
      />
      <AboutFieldModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LeftHeader() {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const leftPaneOpen = useAtomValue(leftPaneOpenAtom);
  const workspaceMode = useAtomValue(workspaceModeAtom);
  const railVisible = useAtomValue(leftRailVisibleAtom);
  const titlePresentation = workspaceTitlePresentation(workspaceMode, leftPaneOpen, railVisible);
  const embeddedTitle = titlePresentation === 'embedded';
  const compactTitle = titlePresentation === 'compact-pill';
  const fullTitle = titlePresentation === 'full-pill';
  const leftContentWidth = useAtomValue(leftContentWidthAtom);
  trace.fn('LeftHeader:render', { previewMode, presentation: titlePresentation });

  return (
    <>
      <div
      data-workspace-left-header
      data-visible="true"
      data-title-presentation={titlePresentation}
      className="h-[52px] bg-[var(--bg-panel)] fixed top-0 left-0 z-[9999] flex transition-[left,top,width,height,border-radius,box-shadow] duration-300 ease-out"
      // One persistent title surface owns project/page identity in every
      // workspace preset. Layout changes only morph this shell's geometry;
      // they never swap to a second ProjectChip/WorkspaceModeButton tree.
      style={{
        width: fullTitle ? LEFT_RAIL_WIDTH + leftContentWidth : leftContentWidth,
        left: embeddedTitle ? LEFT_RAIL_WIDTH : compactTitle ? LEFT_RAIL_WIDTH + 12 : 12,
        top: embeddedTitle ? 0 : 12,
        height: embeddedTitle ? 52 : 44,
        borderRadius: embeddedTitle ? 0 : 8,
        boxShadow: embeddedTitle ? 'none' : 'var(--shadow-lg)',
      }}
    >
      {/* Logo column — 51 px wide so the rule at its right edge lands
          at x=51 (1 px left of the LeftMenu's internal rule at x=52).
          Logo button is 32×32 (matches the VIBE / + buttons in
          LeftMenu) and centered inside. */}
      {fullTitle && <div className="w-[51px] h-full flex items-center justify-center flex-shrink-0">
        <LogoButton />
      </div>}

      {/* Vertical rule at x=51 — visually adjacent to LeftMenu's own
          rule below the header. `paddingTop/Bottom` create breathing
          room so it doesn't touch the header's `border-b` or top edge.
          Wrapper carries the padding; the inner div is the actual rule
          (full-height inside the wrapper). */}
      {fullTitle && <div
        aria-hidden
        style={{
          width: 1,
          paddingTop: 15,
          paddingBottom: 15,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      >
        <div style={{ width: 1, height: '100%', backgroundColor: 'transparent' }} />
      </div>}

      {/* In preview mode we swap the project chip for a single "Back"
          affordance — matches the settings-overlay top-left back
          button. Reads as "you're in preview, here's the way out"
          without the project chip competing for attention. */}
      <div className="flex-1 min-w-0 flex items-center gap-1" style={{ paddingLeft: 10, paddingRight: 35 }}>
        <div data-title-identity className="flex-1 min-w-0 flex items-center">
          {previewMode ? (
            <Button
              variant="secondary"
              size="sm"
              tabIndex={-1}
              className="cut-corners"
              icon={<BackChevronIcon />}
              onClick={() => {
                trace.action('left-header:exit-preview');
                setPreviewMode(false);
              }}
              title="Exit preview"
            >
              Back
            </Button>
          ) : (
            <ProjectChip />
          )}
        </div>

        <WorkspaceModeButton />
      </div>

    </div>

      {/* Keyboard Shortcuts overview — opened via the logo menu's
          View → "Keyboard shortcuts" item (shortcutsModalOpenAtom).
          It stays mounted while the persistent title surface morphs between
          embedded, compact-pill and full-pill workspace presentations. */}
      <KeyboardShortcutsModal />
      <ProjectSettingsModal />
    </>
  );
}
