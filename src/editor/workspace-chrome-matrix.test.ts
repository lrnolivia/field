import { describe, expect, it } from 'vitest';
import { deriveWorkspaceCameraInsets } from './workspace-layout';
import { workspaceTitlePresentation } from './workspace-title-presentation';
import type { WorkspaceMode } from './workspace-mode-store';

type Case = {
  name: string;
  mode: WorkspaceMode;
  leftExpanded: boolean;
  rightExpanded: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  leftInset: number;
  rightInset: number;
  title: 'embedded' | 'compact-pill' | 'full-pill';
};

const cases: Case[] = [
  { name: 'Default both expanded', mode: 'docked', leftExpanded: true, rightExpanded: true, leftVisible: true, rightVisible: true, leftInset: 308, rightInset: 328, title: 'embedded' },
  { name: 'Default left compact', mode: 'docked', leftExpanded: false, rightExpanded: true, leftVisible: true, rightVisible: true, leftInset: 52, rightInset: 328, title: 'compact-pill' },
  { name: 'Default right compact', mode: 'docked', leftExpanded: true, rightExpanded: false, leftVisible: true, rightVisible: true, leftInset: 308, rightInset: 60, title: 'embedded' },
  { name: 'Default both compact', mode: 'docked', leftExpanded: false, rightExpanded: false, leftVisible: true, rightVisible: true, leftInset: 52, rightInset: 60, title: 'compact-pill' },
  { name: 'Default left auto-hide', mode: 'docked', leftExpanded: false, rightExpanded: true, leftVisible: false, rightVisible: true, leftInset: 0, rightInset: 328, title: 'full-pill' },
  { name: 'Default right auto-hide', mode: 'docked', leftExpanded: true, rightExpanded: false, leftVisible: true, rightVisible: false, leftInset: 308, rightInset: 0, title: 'embedded' },
  { name: 'Compact both compact', mode: 'compact-docked', leftExpanded: false, rightExpanded: false, leftVisible: true, rightVisible: true, leftInset: 52, rightInset: 60, title: 'compact-pill' },
  { name: 'Compact left expanded', mode: 'compact-docked', leftExpanded: true, rightExpanded: false, leftVisible: true, rightVisible: true, leftInset: 308, rightInset: 60, title: 'embedded' },
  { name: 'Compact right expanded', mode: 'compact-docked', leftExpanded: false, rightExpanded: true, leftVisible: true, rightVisible: true, leftInset: 52, rightInset: 328, title: 'compact-pill' },
  { name: 'Compact both expanded', mode: 'compact-docked', leftExpanded: true, rightExpanded: true, leftVisible: true, rightVisible: true, leftInset: 308, rightInset: 328, title: 'embedded' },
  { name: 'Compact left auto-hide', mode: 'compact-docked', leftExpanded: false, rightExpanded: false, leftVisible: false, rightVisible: true, leftInset: 0, rightInset: 60, title: 'full-pill' },
  { name: 'Compact right auto-hide', mode: 'compact-docked', leftExpanded: false, rightExpanded: false, leftVisible: true, rightVisible: false, leftInset: 52, rightInset: 0, title: 'compact-pill' },
  { name: 'Floating normal', mode: 'floating', leftExpanded: false, rightExpanded: false, leftVisible: true, rightVisible: true, leftInset: 0, rightInset: 0, title: 'full-pill' },
  { name: 'Floating left auto-hide', mode: 'floating', leftExpanded: false, rightExpanded: false, leftVisible: false, rightVisible: true, leftInset: 0, rightInset: 0, title: 'full-pill' },
  { name: 'Floating right auto-hide', mode: 'floating', leftExpanded: false, rightExpanded: false, leftVisible: true, rightVisible: false, leftInset: 0, rightInset: 0, title: 'full-pill' },
];

describe('workspace chrome matrix', () => {
  it.each(cases)('$name keeps identity and camera geometry coherent', (state) => {
    const title = workspaceTitlePresentation(state.mode, state.leftExpanded, state.leftVisible);
    const insets = deriveWorkspaceCameraInsets(
      state.mode, state.leftExpanded, state.rightExpanded, state.leftVisible, state.rightVisible,
      { leftContentWidth: 256, rightPaneWidth: 328, rightCollapsedWidth: 60 },
    );
    expect(title).toBe(state.title);
    expect(insets.left).toBe(state.leftInset);
    expect(insets.right).toBe(state.rightInset);
    // The rail supplies Menu for embedded/compact; the full pill supplies it otherwise.
    expect(state.leftVisible || title === 'full-pill').toBe(true);
  });
});
