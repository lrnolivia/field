// autosave.ts — Debounced project save triggered after mutation queue flush.
// Uses getDefaultStore() to update saveStatusAtom outside of React.

import { getDefaultStore } from 'jotai';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { backend } from './index';
import { LocalBackend } from './local-backend';
import { getProjectId } from './project-id';
import { saveStatusAtom } from './save-store';
import type { ProjectData } from './types';
import { projectFS } from '../code/project/project-fs';
import { trace } from '@/shared/debug-trace';
import { consumeIntentionalNavigationBypass } from './intentional-navigation';

const DEBOUNCE_MS = 2000;
/** Bounded auto-retry after a failed save. */
const RETRY_MS = 5000;
const MAX_RETRIES = 3;
let saveFailures = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave = false;
let isSaving = false;
let currentSave: Promise<void> | null = null;
let changeGeneration = 0;
let persistenceConflict = false;
let lastSaveError: unknown = null;

function getStore() {
  return getDefaultStore();
}

function isFieldHostedBackend(): boolean {
  // Revyme Cloud is explicit. Outside that mode, only LocalBackend is safe to
  // treat as a synchronous unload write; the production FieldBackend is remote.
  return !CLOUD_ENABLED && !(backend instanceof LocalBackend);
}

function isConflictError(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && (error as { code?: unknown }).code === 'PERSISTENCE_CONFLICT';
}

/** Conflict writes are stale-by-definition and must never enter the transient
 * retry loop. Exported as a small pure seam for focused regression coverage. */
export function isRetryableSaveError(error: unknown): boolean {
  return !isConflictError(error);
}

/**
 * The ProjectData envelope for the current project state. MAIN's files are
 * `files` — the publish / export / backup truth — and non-main branches ride
 * beside them (`toEnvelope`: v1 while there is no branch, v2 once one exists).
 */
export function buildProjectData(): ProjectData {
  return projectFS.toEnvelope();
}

async function performSave(): Promise<void> {
  const store = getStore();
  const id = getProjectId();
  if (CLOUD_ENABLED && id === 'local') {
    trace.action('autosave:skipped-unresolved-project-id', { id });
    return;
  }
  if (persistenceConflict) {
    store.set(saveStatusAtom, 'error');
    trace.action('autosave:skipped-unresolved-conflict', { id });
    return;
  }

  const generation = changeGeneration;
  const data = buildProjectData();

  store.set(saveStatusAtom, 'saving');
  isSaving = true;
  trace.action('autosave:start', {
    id,
    generation,
    fileCount: Object.keys(data.files).length,
    branches: data.branches ? Object.keys(data.branches).length : 0,
  });

  try {
    await backend.saveProject(id, data);
    lastSaveError = null;
    saveFailures = 0;
    // Do not clear pendingSave when a newer mutation arrived while this
    // snapshot was in flight. The newer generation still needs persistence.
    if (generation === changeGeneration) pendingSave = false;
    store.set(saveStatusAtom, pendingSave ? 'unsaved' : 'saved');
    trace.action('autosave:success', { id, generation, pendingSave });
  } catch (err) {
    lastSaveError = err;
    store.set(saveStatusAtom, 'error');
    debounceTimer = null;

    if (!isRetryableSaveError(err)) {
      // A stale ETag is not a transient network failure. Freeze automatic
      // writes until reload/reconciliation so this tab can never hammer a
      // known-stale revision or silently replace newer R2 state.
      persistenceConflict = true;
      trace.error('autosave:conflict', { id, error: String(err) });
      return;
    }

    trace.error('autosave:error', err);
    saveFailures++;
    if (saveFailures <= MAX_RETRIES && !_disposed && !isHeld) {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void startSave();
      }, RETRY_MS);
      trace.action('autosave:retry-scheduled', { attempt: saveFailures, inMs: RETRY_MS });
    }
  } finally {
    isSaving = false;
  }
}

/** Queue saves behind any in-flight save. This matters for revision-aware
 * persistence: two same-tab PUTs must never race with the same If-Match ETag. */
function startSave(): Promise<void> {
  const previous = currentSave;
  let run: Promise<void>;
  if (previous) {
    run = previous.catch(() => undefined).then(() => performSave());
  } else {
    run = performSave();
  }
  const tracked = run.finally(() => {
    if (currentSave === tracked) currentSave = null;
  });
  currentSave = tracked;
  return tracked;
}

/** Flush any pending save NOW and resolve only when the current projectFS
 * snapshot is actually persisted. If the backend is in a conflict/error state,
 * propagate that to callers such as publish instead of pretending the flush
 * succeeded. */
export async function flushSaveNow(): Promise<void> {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (persistenceConflict) {
    throw lastSaveError instanceof Error ? lastSaveError : new Error('Project save is in conflict. Reload before saving again.');
  }

  // Drain the current serial queue. Another save may have been queued while we
  // awaited the first one, so follow the pointer until it stabilizes.
  while (currentSave) {
    const active = currentSave;
    await active.catch(() => undefined);
    if (currentSave === active) break;
  }

  trace.action('autosave:flush-now');
  await startSave();
  if (lastSaveError) {
    throw lastSaveError instanceof Error ? lastSaveError : new Error(String(lastSaveError));
  }
}

/** Save-leader gate. */
let isSaveLeader = true;
export function setIsSaveLeader(leader: boolean): void {
  if (isSaveLeader === leader) return;
  isSaveLeader = leader;
  trace.action('autosave:leader-changed', { isSaveLeader: leader });
}

let _disposed = false;

/** While held, saves are deferred instead of scheduled. */
let isHeld = false;
export function setAutosaveHeld(held: boolean): void {
  if (isHeld === held) return;
  isHeld = held;
  trace.action('autosave:held-changed', { held, pendingSave });
  if (!held && pendingSave && !_disposed && !persistenceConflict) {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void startSave();
    }, DEBOUNCE_MS);
  }
}

export function triggerAutosave(opts?: { force?: boolean }): void {
  if (_disposed) { trace.action('autosave:skipped-disposed-generation'); return; }
  if (isHeld) {
    changeGeneration++;
    pendingSave = true;
    getStore().set(saveStatusAtom, 'unsaved');
    trace.action('autosave:deferred-while-held');
    return;
  }

  if (!isSaveLeader && !opts?.force) {
    trace.action('autosave:skipped-non-leader');
    return;
  }

  changeGeneration++;
  pendingSave = true;
  saveFailures = 0;

  if (persistenceConflict) {
    // Preserve the user's in-memory edits but do not issue another stale PUT.
    getStore().set(saveStatusAtom, 'error');
    trace.action('autosave:deferred-after-conflict', { generation: changeGeneration });
    return;
  }

  getStore().set(saveStatusAtom, 'unsaved');

  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void startSave();
  }, DEBOUNCE_MS);

  trace.action('autosave:queued', { debounceMs: DEBOUNCE_MS, generation: changeGeneration });
}

/** Drop any queued save WITHOUT running it. */
export function cancelPendingAutosave(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingSave = false;
  persistenceConflict = false;
  lastSaveError = null;
  trace.action('autosave:cancelled-pending');
}

function kickLifecycleSave(reason: string): void {
  if (_disposed || isHeld || persistenceConflict) return;
  if (!pendingSave && !isSaving && !currentSave) return;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  trace.action('autosave:lifecycle-flush', { reason });
  void startSave();
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    // Visibility changes happen earlier than unload and give an async Worker/R2
    // PUT a real chance to finish before the page is torn down.
    kickLifecycleSave('visibility-hidden');
  }
}

function onPageHide(): void {
  // pagehide is not cancelable. This is a best-effort early flush only; the
  // cancelable beforeunload path below is still responsible for warning when
  // a remote save cannot be guaranteed.
  kickLifecycleSave('pagehide');
}

function kickFinalSaveIfUserStays(): void {
  setTimeout(() => {
    if (_disposed || isHeld || persistenceConflict) return;
    void (async () => {
      const active = currentSave;
      if (active) await active.catch(() => undefined);
      if (!_disposed && pendingSave && !isHeld && !persistenceConflict) {
        await startSave();
      }
    })();
  }, 0);
}

// beforeunload safety net. Large project bodies cannot rely on sendBeacon or
// fetch keepalive quotas. FieldBackend also requires an If-Match header, which
// sendBeacon cannot set, so hosted field must warn rather than falsely report
// an asynchronous final write as durable.
const UNLOAD_HOOK_KEY = '__revymeAutosaveUnloadHook';
const VISIBILITY_HOOK_KEY = '__fieldAutosaveVisibilityHook';
const PAGEHIDE_HOOK_KEY = '__fieldAutosavePagehideHook';

function onBeforeUnloadSave(e: BeforeUnloadEvent): void {
  if (consumeIntentionalNavigationBypass()) {
    trace.action('autosave:unload-bypassed-intentional-navigation');
    return;
  }
  if (_disposed) return;
  if (!pendingSave && !isSaving && !currentSave) return;
  if (isHeld) {
    trace.action('autosave:beacon-skipped', { reason: 'held for template prompt' });
    return;
  }

  const id = getProjectId();
  if (CLOUD_ENABLED && id === 'local') {
    trace.action('autosave:beacon-skipped', { reason: 'unresolved project id' });
    return;
  }
  const data = buildProjectData();

  if (!CLOUD_ENABLED && backend instanceof LocalBackend) {
    void backend.saveProject(id, data);
    trace.action('autosave:unload-local-save', { id });
    return;
  }

  if (isFieldHostedBackend()) {
    // There is no honest unload-safe transport for a multi-MB conditional PUT.
    // Prompt whenever remote work is pending/in-flight. If the user stays, the
    // queued normal fetch gets time to finish and a final serialized save runs.
    e.preventDefault();
    e.returnValue = '';
    trace.action('autosave:unload-field-confirm', { id });
    kickFinalSaveIfUserStays();
    return;
  }

  // Revyme Cloud retains its existing beacon endpoint/shape. If the browser
  // refuses the beacon (commonly due to the ~64KB keepalive quota), warn and
  // run a normal save if the user cancels navigation.
  const payload = JSON.stringify({ json: JSON.stringify(data) });
  const blob = new Blob([payload], { type: 'application/json' });
  const sent = navigator.sendBeacon(`/api/websites/${id}`, blob);
  trace.action('autosave:beacon', { id, sent, bytes: blob.size });
  if (!sent) {
    e.preventDefault();
    e.returnValue = '';
    kickFinalSaveIfUserStays();
  }
}

function installLifecycleHooks(): void {
  if (typeof window === 'undefined') return;

  const prevUnload = (window as any)[UNLOAD_HOOK_KEY] as EventListener | undefined;
  if (prevUnload) window.removeEventListener('beforeunload', prevUnload);
  (window as any)[UNLOAD_HOOK_KEY] = onBeforeUnloadSave;
  window.addEventListener('beforeunload', onBeforeUnloadSave);

  const prevVisibility = (window as any)[VISIBILITY_HOOK_KEY] as EventListener | undefined;
  if (prevVisibility) document.removeEventListener('visibilitychange', prevVisibility);
  (window as any)[VISIBILITY_HOOK_KEY] = onVisibilityChange;
  document.addEventListener('visibilitychange', onVisibilityChange);

  const prevPagehide = (window as any)[PAGEHIDE_HOOK_KEY] as EventListener | undefined;
  if (prevPagehide) window.removeEventListener('pagehide', prevPagehide);
  (window as any)[PAGEHIDE_HOOK_KEY] = onPageHide;
  window.addEventListener('pagehide', onPageHide);
}

function removeLifecycleHooks(): void {
  if (typeof window === 'undefined') return;
  if ((window as any)[UNLOAD_HOOK_KEY] === onBeforeUnloadSave) {
    window.removeEventListener('beforeunload', onBeforeUnloadSave);
    delete (window as any)[UNLOAD_HOOK_KEY];
  }
  if ((window as any)[VISIBILITY_HOOK_KEY] === onVisibilityChange) {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    delete (window as any)[VISIBILITY_HOOK_KEY];
  }
  if ((window as any)[PAGEHIDE_HOOK_KEY] === onPageHide) {
    window.removeEventListener('pagehide', onPageHide);
    delete (window as any)[PAGEHIDE_HOOK_KEY];
  }
}

// ProjectFS is the authored-document persistence boundary.
//
// Canvas mutations already schedule autosave through the mutation queue, but
// several legitimate field operations write ProjectFS directly — including
// Page appearance/background state. Listen here as well so those writes cannot
// remain browser-session-only.
//
// The existing 2s debounce coalesces this with the mutation-queue autosave, so
// ordinary canvas edits still result in one durable save rather than duplicate
// R2 writes.
let projectFsAutosaveUnsubscribe: (() => void) | null = null;

function installProjectFsAutosaveHook(): void {
  projectFsAutosaveUnsubscribe?.();

  projectFsAutosaveUnsubscribe = projectFS.subscribeWrites((event) => {
    // Never echo collaboration-originated writes back through persistence.
    if (event.origin !== 'local') return;

    trace.action('autosave:project-fs-write', {
      kind: event.kind,
      path: event.path,
      oldPath: event.oldPath,
      newPath: event.newPath,
    });

    triggerAutosave();
  });
}

function removeProjectFsAutosaveHook(): void {
  projectFsAutosaveUnsubscribe?.();
  projectFsAutosaveUnsubscribe = null;
}

installLifecycleHooks();
installProjectFsAutosaveHook();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _disposed = true;
    if (debounceTimer !== null) { clearTimeout(debounceTimer); debounceTimer = null; }
    removeLifecycleHooks();
    removeProjectFsAutosaveHook();
    trace.action('autosave:hmr-disposed', {});
  });
}
