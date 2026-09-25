// ProjectChip.tsx — Figma-style two-line project/page identity for the left header.
//
// Project title is primary; current page is quiet secondary context.
// The title chevron opens only real field commands.

import { useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { projectNameAtom, setProjectName } from '@/code/stores/project-store';
import { activeFilePathAtom, getFileDisplayName } from '@/code/project/active-file-store';
import { settingsOverlayOpenAtom, settingsSectionAtom } from '@/code/stores/website-settings-store';
import { exportDropdownOpenAtom } from '@/code/stores/editor-store';
import NameInputModal from '@/editor/ui/NameInputModal';
import DropdownMenu, { type DropdownMenuEntry } from '@/design-system/DropdownMenu';
import { FigmaChevronDownIcon } from '@/shared/loew-figma-icons';
import { trace } from '@/shared/debug-trace';
import { useIsViewer } from '@/code/stores/viewer-mode-store';
import { backend } from '@/backend';
import { getProjectId } from '@/backend/project-id';
import { leaveBuilderTo } from '@/backend/leave-builder';
import { getHeaderPageLabel } from './project-chip-label';

export default function ProjectChip() {
  const name = useAtomValue(projectNameAtom);
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const setSettingsOpen = useSetAtom(settingsOverlayOpenAtom);
  const setSettingsSection = useSetAtom(settingsSectionAtom);
  const setExportOpen = useSetAtom(exportDropdownOpenAtom);
  const isViewer = useIsViewer();
  const [renameOpen, setRenameOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayName = name || 'Untitled';
  const rawLabel = activeFilePath ? getFileDisplayName(activeFilePath) : '';
  const pageLabel = getHeaderPageLabel(rawLabel);
  const fullTitle = rawLabel && rawLabel !== pageLabel
    ? `${displayName} / ${rawLabel}`
    : pageLabel ? `${displayName} / ${pageLabel}` : displayName;

  const menuItems = useMemo<DropdownMenuEntry[]>(() => [
    {
      id: 'website-settings',
      label: 'Website settings…',
      onClick: () => {
        trace.action('project-chip:website-settings');
        setSettingsSection('website');
        setSettingsOpen(true);
      },
    },
    {
      id: 'export-code',
      label: 'Export code…',
      onClick: () => {
        trace.action('project-chip:export-code');
        setExportOpen(true);
      },
    },
    { type: 'separator' },
    {
      id: 'rename-project',
      label: 'Rename project',
      disabled: isViewer,
      onClick: () => {
        if (isViewer) return;
        trace.action('project-chip:open-rename');
        setRenameOpen(true);
      },
    },
    { type: 'separator' },
    {
      id: 'go-dashboard',
      label: 'Go to Dashboard',
      onClick: () => {
        trace.action('project-chip:dashboard');
        void leaveBuilderTo('/', 'project-chip-dashboard');
      },
    },
  ], [isViewer, setExportOpen, setSettingsOpen, setSettingsSection]);

  trace.fn('ProjectChip.render', { name: displayName, pageLabel, renameOpen, menuOpen });

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] overflow-hidden" title={fullTitle}>
        <div className="flex min-w-0 items-center">
          <button
            ref={triggerRef}
            type="button"
            aria-label={`Project menu for ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              const rect = triggerRef.current?.getBoundingClientRect();
              if (rect) {
                // UI3-style: anchor the menu at the END of the title control
                // so it opens into the canvas instead of covering the left pane.
                setMenuAnchor({ x: rect.right - 12, y: rect.bottom });
              }
              setMenuOpen(v => !v);
            }}
            className="group flex min-w-0 max-w-full items-center gap-1 rounded-[4px] border-none bg-transparent px-0 py-[2px] text-left text-xs font-semibold leading-none text-[var(--text-primary)] outline-none transition-colors"
            data-field-project-title
          >
            <span className="min-w-0 truncate">{displayName}</span>
            <FigmaChevronDownIcon
              size={11}
              className="shrink-0 text-[var(--text-disabled)] transition-colors group-hover:text-[var(--text-secondary)]"
            />
          </button>
        </div>

        {pageLabel && (
          <span className="truncate text-[10px] font-normal leading-none text-[var(--text-secondary)]" data-field-current-page>
            {pageLabel}
          </span>
        )}
      </div>

      <DropdownMenu
        isOpen={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          setMenuAnchor(null);
        }}
        items={menuItems}
        anchorRef={triggerRef}
        anchorPoint={menuAnchor}
        position="bottom-left"
        minWidth={176}
        hoverStyle="subtle"
        density="compact"
      />

      <NameInputModal
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        onSubmit={(newName) => {
          trace.action('project-chip:rename-submit', { name: newName });
          setProjectName(newName);
          const trimmed = newName.trim();
          if (trimmed) {
            void backend.renameWebsite(getProjectId(), trimmed).catch((err) =>
              trace.error('project-chip:rename-persist-failed', { error: String(err) }),
            );
          }
        }}
        title="Rename Project"
        placeholder="Project name"
        defaultValue={name}
        submitLabel="Save"
      />
    </>
  );
}
