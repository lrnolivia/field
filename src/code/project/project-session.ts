// project-session.ts — hard boundary between same-document field projects.
//
// FieldShell intentionally keeps one JS document alive while Dashboard swaps the
// mounted project. ProjectFS, Jotai atoms, and the mutation queue are module
// singletons, so a React remount alone is not a document boundary.

import { getDefaultStore } from 'jotai';
import { activeFilePathAtom, componentBreadcrumbAtom } from './active-file-store';
import { projectVersionAtom, stableProjectVersionAtom } from './project-fs';
import { selectedIdsAtom } from '@/code/stores/store';
import { interactingViewportIdAtom } from '@/code/stores/viewport-store';
import { overlayEditingIdAtom } from '@/code/stores/overlay-store';
import {
  activeContainerIdAtom,
  groupEditingIdAtom,
  selectedPointAtom,
  shapeEditCallbackAtom,
  shapeEditCommitPendingAtom,
  shapeEditCreatedNodeAtom,
  shapeEditingIdAtom,
  shapeEditPenModeAtom,
} from '@/code/stores/shape-edit-store';
import { resetMutationQueueForProject } from '@/code/mutation/mutation-queue';
import { trace } from '@/shared/debug-trace';

export function resetProjectSession(bootFile: string, bootCode: string): number {
  const store = getDefaultStore();

  store.set(activeFilePathAtom, bootFile);
  store.set(componentBreadcrumbAtom, []);
  store.set(selectedIdsAtom, []);
  store.set(interactingViewportIdAtom, 'desktop');
  store.set(overlayEditingIdAtom, null);

  store.set(shapeEditingIdAtom, null);
  store.set(groupEditingIdAtom, null);
  store.set(activeContainerIdAtom, null);
  store.set(selectedPointAtom, null);
  store.set(shapeEditPenModeAtom, false);
  store.set(shapeEditCreatedNodeAtom, null);
  store.set(shapeEditCommitPendingAtom, false);
  store.set(shapeEditCallbackAtom, null);

  resetMutationQueueForProject(bootFile, bootCode);

  // activeCodeAtom + nodesAtom are version-gated ProjectFS views. The file path
  // is usually identical across projects (app/page.client.tsx), so the version
  // bump is the signal that the underlying document identity changed.
  const version = store.get(projectVersionAtom) + 1;
  store.set(projectVersionAtom, version);
  store.set(stableProjectVersionAtom, version);

  trace.action('project-session:reset', {
    bootFile,
    codeLength: bootCode.length,
    version,
  });
  return version;
}
