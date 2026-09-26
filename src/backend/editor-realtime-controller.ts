import type { ProjectData } from './types';
import type { FieldProjectEvent } from './project-events';

export type EditorRealtimeStatus = 'idle' | 'refreshing' | 'conflict';

export interface EditorRealtimeRemoteSnapshot {
  data: ProjectData;
  revision: string;
}

export interface EditorRealtimeControllerOptions {
  projectId: string;
  sessionId: string;
  getKnownRevision: () => string | null | undefined;
  peekRemoteProject: () => Promise<EditorRealtimeRemoteSnapshot | null>;
  isDirty: () => boolean;
  applyRemoteProject: (data: ProjectData, revision: string) => void;
  enterConflict: () => void;
  refreshMetadata?: () => Promise<void> | void;
  setStatus?: (status: EditorRealtimeStatus) => void;
  onError?: (error: unknown) => void;
}

export interface EditorRealtimeController {
  handleEvent(event: FieldProjectEvent): Promise<void>;
  reconcile(): Promise<void>;
  dispose(): void;
}

export function createEditorRealtimeController(
  options: EditorRealtimeControllerOptions,
): EditorRealtimeController {
  let disposed = false;
  let epoch = 0;

  const setStatus = (status: EditorRealtimeStatus) => {
    if (!disposed) options.setStatus?.(status);
  };

  const enterConflict = () => {
    if (disposed) return;
    epoch += 1;
    options.enterConflict();
    setStatus('conflict');
  };

  const fetchAndReconcile = async (knownRemoteChange: boolean): Promise<void> => {
    if (disposed) return;

    if (knownRemoteChange && options.isDirty()) {
      enterConflict();
      return;
    }

    const runEpoch = ++epoch;
    setStatus('refreshing');

    try {
      const remote = await options.peekRemoteProject();
      if (disposed || runEpoch !== epoch) return;

      if (!remote) {
        if (knownRemoteChange) enterConflict();
        else setStatus('idle');
        return;
      }

      const knownRevision = options.getKnownRevision();
      if (knownRevision === remote.revision) {
        setStatus('idle');
        return;
      }

      // Local work may have started while the authoritative GET was in flight.
      // Never replace it with the remote snapshot.
      if (options.isDirty()) {
        enterConflict();
        return;
      }

      options.applyRemoteProject(remote.data, remote.revision);
      if (!disposed && runEpoch === epoch) setStatus('idle');
    } catch (error) {
      if (disposed || runEpoch !== epoch) return;
      options.onError?.(error);
      // A document event is proof that a newer durable revision exists. If we
      // cannot retrieve it, fail closed rather than leaving this editor able
      // to write against the now-stale revision.
      if (knownRemoteChange) enterConflict();
      else setStatus('idle');
    }
  };

  return {
    async handleEvent(event) {
      if (disposed || event.projectId !== options.projectId) return;
      if (event.sourceSessionId && event.sourceSessionId === options.sessionId) return;

      if (event.kind === 'document') {
        if (event.revision && event.revision === options.getKnownRevision()) return;
        await fetchAndReconcile(true);
        return;
      }

      if (event.kind === 'metadata') {
        try {
          await options.refreshMetadata?.();
        } catch (error) {
          options.onError?.(error);
        }
        return;
      }

      if (event.kind === 'deleted') {
        enterConflict();
      }
    },

    async reconcile() {
      await fetchAndReconcile(false);
    },

    dispose() {
      disposed = true;
      epoch += 1;
    },
  };
}
