import { atom, getDefaultStore } from 'jotai';
import { backend } from './index';
import { FieldBackend } from './field-backend';
import { getProjectId } from './project-id';
import {
  getFieldSessionId,
  subscribeToFieldProjectEvents,
} from './project-events';
import {
  createEditorRealtimeController,
  type EditorRealtimeStatus,
} from './editor-realtime-controller';
import { saveStatusAtom } from './save-store';
import {
  createPersistenceConflictState,
  persistenceConflictAtom,
} from './persistence-conflict';
import { setAutosaveHeld } from './autosave';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import {
  activeFilePathAtom,
  componentBreadcrumbAtom,
  healBreadcrumbTrail,
} from '@/code/project/active-file-store';
import { isTextEditingAtom } from '@/code/stores/editor-store';
import { selectedIdsAtom } from '@/code/stores/store';
import { shapeEditingIdAtom } from '@/code/stores/shape-edit-store';
import {
  hasPendingDeferredFanOut,
  hasQueuedMutations,
  setActiveFilePath as setQueueActiveFile,
  syncQueueCode,
} from '@/code/mutation/mutation-queue';
import { dragStateOps } from '@/canvas/drag/drag-state-store';
import { setProjectName } from '@/code/stores/project-store';
import { trace } from '@/shared/debug-trace';
import type { ProjectData } from './types';

export const editorRealtimeStatusAtom = atom<EditorRealtimeStatus>('idle');

function fallbackActiveFile(): string | null {
  if (projectFS.exists('app/page.client.tsx')) return 'app/page.client.tsx';
  const files = projectFS.listFiles();
  return files.find((path) => path.endsWith('/page.client.tsx'))
    ?? files.find((path) => path.endsWith('.tsx'))
    ?? files[0]
    ?? null;
}

function applyRemoteProjectData(
  fieldBackend: FieldBackend,
  projectId: string,
  data: ProjectData,
  revision: string,
): void {
  const store = getDefaultStore();
  const previousActiveFile = store.get(activeFilePathAtom);
  const localActiveBranch = projectFS.getActiveBranchId();

  // Branch choice is editor-session state. Preserve this tab's active branch
  // when it still exists in the new envelope instead of jumping because a
  // different browser happened to save from another branch.
  const envelope: ProjectData = {
    ...data,
    activeBranchId: localActiveBranch,
  };

  const refusal = projectFS.fromEnvelope(envelope);
  if (refusal) throw new Error(refusal);

  let nextActiveFile = previousActiveFile;
  if (!projectFS.exists(nextActiveFile)) {
    nextActiveFile = fallbackActiveFile() ?? previousActiveFile;
    store.set(activeFilePathAtom, nextActiveFile);
    store.set(componentBreadcrumbAtom, []);
    store.set(selectedIdsAtom, []);
    setQueueActiveFile(nextActiveFile);
  } else {
    const healedTrail = healBreadcrumbTrail(
      store.get(componentBreadcrumbAtom),
      nextActiveFile,
      (path) => projectFS.exists(path),
    );
    store.set(componentBreadcrumbAtom, healedTrail);
  }

  // The mutation queue owns its own current-code pointer. Point it at the
  // newly adopted source BEFORE the project-version fan-out so the next local
  // mutation cannot start from pre-realtime code.
  syncQueueCode(projectFS.readFile(nextActiveFile) ?? '');
  fieldBackend.adoptProjectRevision(projectId, revision);
  store.set(projectVersionAtom, (value) => value + 1);

  trace.action('editor-realtime:remote-project-applied', {
    projectId,
    revision,
    activeFile: nextActiveFile,
    activeBranch: projectFS.getActiveBranchId(),
  });
}

function editorHasLocalWork(): boolean {
  const store = getDefaultStore();
  return (
    store.get(persistenceConflictAtom) !== null ||
    store.get(saveStatusAtom) !== 'saved' ||
    store.get(isTextEditingAtom) ||
    store.get(shapeEditingIdAtom) !== null ||
    dragStateOps.get() ||
    hasQueuedMutations() ||
    hasPendingDeferredFanOut()
  );
}

export function startEditorRealtimeSync(): () => void {
  if (!(backend instanceof FieldBackend)) return () => {};

  const fieldBackend = backend;
  const store = getDefaultStore();
  const projectId = getProjectId();
  const sessionId = getFieldSessionId();

  const enterConflict = () => {
    fieldBackend.markProjectRevisionStale(projectId);
    // Hold future autosave scheduling immediately. FieldBackend's stale guard
    // independently refuses a write even if an already-scheduled timer wakes.
    setAutosaveHeld(true);
    if (!store.get(persistenceConflictAtom)) {
      store.set(persistenceConflictAtom, createPersistenceConflictState(projectId));
    }
    store.set(saveStatusAtom, 'error');
    store.set(editorRealtimeStatusAtom, 'conflict');
    trace.action('editor-realtime:conflict', { projectId });
  };

  const controller = createEditorRealtimeController({
    projectId,
    sessionId,
    getKnownRevision: () => fieldBackend.getProjectRevision(projectId),
    peekRemoteProject: () => fieldBackend.peekRemoteProject(projectId),
    isDirty: editorHasLocalWork,
    applyRemoteProject: (data, revision) => {
      applyRemoteProjectData(fieldBackend, projectId, data, revision);
    },
    enterConflict,
    refreshMetadata: async () => {
      const name = await fieldBackend.getWebsiteName(projectId);
      if (name !== null) setProjectName(name);
    },
    setStatus: (status) => store.set(editorRealtimeStatusAtom, status),
    onError: (error) => {
      trace.error('editor-realtime:error', { projectId, error: String(error) });
    },
  });

  const unsubscribe = subscribeToFieldProjectEvents((event) => {
    void controller.handleEvent(event);
  });

  // The shared transport reconnects itself. Browser lifecycle reconciliation is
  // the no-event safety net: if a socket was interrupted while this page was
  // backgrounded/offline, compare authoritative revision as soon as the user
  // returns. Normal connected updates remain event-driven and immediate.
  const reconcile = () => {
    void controller.reconcile();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') reconcile();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) reconcile();
  };

  window.addEventListener('focus', reconcile);
  window.addEventListener('online', reconcile);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibilityChange);

  trace.action('editor-realtime:subscribed', { projectId, sessionId });

  return () => {
    unsubscribe();
    controller.dispose();
    window.removeEventListener('focus', reconcile);
    window.removeEventListener('online', reconcile);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    store.set(editorRealtimeStatusAtom, 'idle');
    trace.action('editor-realtime:unsubscribed', { projectId });
  };
}
