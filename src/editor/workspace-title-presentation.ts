import type { WorkspaceMode } from './workspace-mode-store';

export type WorkspaceTitlePresentation = 'embedded' | 'compact-pill' | 'full-pill';

/** Exactly one title surface owns project, page, menu and layout access. */
export function workspaceTitlePresentation(
  mode: WorkspaceMode,
  leftExpanded: boolean,
  railVisible: boolean,
): WorkspaceTitlePresentation {
  if (mode === 'floating' || mode === 'compact' || !railVisible) return 'full-pill';
  return leftExpanded ? 'embedded' : 'compact-pill';
}
