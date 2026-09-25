import { useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectedIdsAtom, nodesAtom, updatingFromCanvasAtom, componentToolRevealAtom } from '@/code/stores/store';
import { useNodesComputed } from '@/code/stores/node-family';
import { activeFilePathAtom, componentBreadcrumbAtom, isComponentFilePath } from '@/code/project/active-file-store';
import { pageVariablesModalOpenAtom } from '@/code/stores/page-variables-store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { suppressSelectionOverlayAtom } from '@/code/stores/editor-store';
import { enterComponentFile } from '@/canvas/component-navigation';

interface InspectorObjectHeaderProps {
  title: string;
  kind: string;
  isMultiSelect?: boolean;
  componentFile?: string | null;
  canGoToMainComponent?: boolean;
  sourceTitle?: string;
}

function IconButton({ title, onClick, children, active = false, disabled = false }: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`h-7 w-7 shrink-0 flex items-center justify-center rounded-[7px] transition-colors disabled:opacity-30 disabled:cursor-default ${active ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
    >
      {children}
    </button>
  );
}

function MatchingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden>
      <path d="M3 1.8H1.8V3M13 1.8h1.2V3M3 14.2H1.8V13M13 14.2h1.2V13" />
      <circle cx="5" cy="5" r="1.05" /><circle cx="11" cy="5" r="1.05" />
      <circle cx="5" cy="11" r="1.05" /><circle cx="11" cy="11" r="1.05" />
    </svg>
  );
}

function VariablesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden>
      <circle cx="4" cy="4" r="1.35" /><circle cx="12" cy="4" r="1.35" />
      <circle cx="4" cy="12" r="1.35" /><circle cx="12" cy="12" r="1.35" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" aria-hidden>
      <path d="M3 2v12M8 2v12M13 2v12" />
      <path d="M1.5 5h3M6.5 10h3M11.5 6.5h3" />
    </svg>
  );
}

function DiamondIcon() {
  return <span className="block w-3.5 h-3.5 border border-current rotate-45 rounded-[2px]" aria-hidden />;
}

function OverflowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="3.2" cy="8" r="1.15" /><circle cx="8" cy="8" r="1.15" /><circle cx="12.8" cy="8" r="1.15" />
    </svg>
  );
}

function componentLabel(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return 'Linked component';
  const file = path.split('/').pop() || path;
  return file.replace(/\.(tsx?|jsx?)$/i, '').replace(/[-_]+/g, ' ');
}

export default function InspectorObjectHeader({
  title,
  kind,
  isMultiSelect = false,
  componentFile,
  canGoToMainComponent = false,
  sourceTitle,
}: InspectorObjectHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const activeFile = useAtomValue(activeFilePathAtom);
  const setActiveFile = useSetAtom(activeFilePathAtom);
  const setBreadcrumb = useSetAtom(componentBreadcrumbAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const setUpdatingFromCanvas = useSetAtom(updatingFromCanvasAtom);
  const setInteractingViewport = useSetAtom(interactingViewportIdAtom);
  const setVariablesOpen = useSetAtom(pageVariablesModalOpenAtom);
  const revealComponentTool = useSetAtom(componentToolRevealAtom);

  const matchingIds = useNodesComputed((nodes) => {
    if (!componentFile || isMultiSelect) return [] as string[];
    const ids: string[] = [];
    for (const node of nodes.values()) {
      if (node.componentFile === componentFile && (node.isComponentInstance || !node.componentInstanceId)) ids.push(node.id);
    }
    ids.sort();
    return ids;
  }, [componentFile, isMultiSelect]);

  const variablesAvailable = !isComponentFilePath(activeFile);
  const isRemote = !!componentFile && componentFile.startsWith('http');
  const canNavigate = !!componentFile && canGoToMainComponent && !isRemote;
  const sourceLabel = useMemo(() => componentLabel(componentFile), [componentFile]);

  const selectMatching = () => {
    if (matchingIds.length > 0) setSelectedIds(matchingIds);
    setMenuOpen(false);
  };

  const revealComponent = () => {
    revealComponentTool((v) => v + 1);
    setMenuOpen(false);
  };

  const openVariables = () => {
    if (variablesAvailable) setVariablesOpen(true);
    setMenuOpen(false);
  };

  const goToMain = () => {
    if (!componentFile || !canNavigate) return;
    enterComponentFile(
      {
        fromFilePath: activeFile,
        componentFilePath: componentFile,
      },
      {
        setActiveFile,
        setBreadcrumb,
        setSelectedIds,
        setUpdatingFromCanvas,
        setInteractingViewport,
        getNodes: () => store.get(nodesAtom),
        setSuppressSelectionOverlay: (value) => store.set(suppressSelectionOverlayAtom, value),
      },
    );
    setMenuOpen(false);
  };

  const hasMenu = !!componentFile || variablesAvailable;

  return (
    <div
      data-properties-context
      data-inspector-object-header
      data-inspector-object-kind={kind}
      className="relative shrink-0 border-b border-[var(--border-light)]"
      title={sourceTitle || title}
    >
      <div className="min-h-9 px-3 flex items-center gap-1">
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          {componentFile ? (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="min-w-0 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)]"
              aria-expanded={menuOpen}
            >
              <span className="truncate">{title}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden><path d="M2.3 3.7 5 6.3l2.7-2.6" /></svg>
            </button>
          ) : (
            <div className="min-w-0 text-[13px] font-semibold text-[var(--text-primary)] truncate">{title}</div>
          )}
        </div>

        {!!componentFile && matchingIds.length > 0 && (
          <IconButton title="Select matching layers" onClick={selectMatching}>
            <MatchingIcon />
          </IconButton>
        )}
        {!!componentFile && (
          <IconButton title="Edit component properties" onClick={revealComponent}>
            <SlidersIcon />
          </IconButton>
        )}
        {variablesAvailable && (
          <IconButton title="Variables" onClick={openVariables}>
            <VariablesIcon />
          </IconButton>
        )}
        {hasMenu && (
          <button
            ref={menuButtonRef}
            type="button"
            data-inspector-header-overflow
            title="More actions"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className={`h-7 w-7 shrink-0 flex items-center justify-center rounded-[7px] transition-colors ${menuOpen ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
          >
            <OverflowIcon />
          </button>
        )}
      </div>

      {!!componentFile && (
        <div className="px-3 pb-2 flex items-center">
          <button
            type="button"
            data-inspector-component-source
            disabled={!canNavigate}
            onClick={goToMain}
            title={canNavigate ? 'Go to main component' : isRemote ? 'Linked component' : 'Main component navigation is unavailable for this component type'}
            className={`h-7 max-w-full inline-flex items-center gap-2 px-2 rounded-[7px] text-xs transition-colors ${canNavigate ? 'text-[var(--text-primary)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] cursor-pointer' : 'text-[var(--text-secondary)] cursor-default'}`}
          >
            <span className="truncate">From this file</span>
            <span className="shrink-0 text-[var(--text-secondary)]"><DiamondIcon /></span>
            <span className="sr-only">{sourceLabel}</span>
          </button>
        </div>
      )}

      {menuOpen && hasMenu && (
        <>
          <div className="fixed inset-0 z-[10028]" onClick={() => setMenuOpen(false)} />
          <div
            data-inspector-header-menu
            className="absolute right-3 top-8 z-[10029] min-w-[220px] py-1.5 bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-[12px] shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {canNavigate && (
              <button type="button" onClick={goToMain} className="w-full h-8 px-3 flex items-center gap-2 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                <DiamondIcon />
                <span className="flex-1">Go to main component</span>
              </button>
            )}
            {!!componentFile && matchingIds.length > 0 && (
              <button type="button" onClick={selectMatching} className="w-full h-8 px-3 flex items-center gap-2 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                <MatchingIcon />
                <span className="flex-1">Select matching layers</span>
                <span className="text-[10px] text-[var(--text-disabled)]">{matchingIds.length}</span>
              </button>
            )}
            {!!componentFile && (
              <button type="button" onClick={revealComponent} className="w-full h-8 px-3 flex items-center gap-2 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                <SlidersIcon />
                <span className="flex-1">Component properties</span>
              </button>
            )}
            {variablesAvailable && (
              <button type="button" onClick={openVariables} className="w-full h-8 px-3 flex items-center gap-2 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                <VariablesIcon />
                <span className="flex-1">Variables</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
