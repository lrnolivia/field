// camera-intent.ts — explicit semantic camera intent.
//
// Transform deltas cannot tell whether a camera move came from the user or from
// focus/session/system behavior. User-facing camera command surfaces emit here
// before they move the camera so temporary assistants can yield immediately.

export type CameraIntentOrigin = 'user' | 'system' | 'focus-session';

export interface CameraIntent {
  origin: CameraIntentOrigin;
  source?: string;
}

type Listener = (intent: CameraIntent) => void;
const listeners = new Set<Listener>();

export const cameraIntentOps = {
  emit(intent: CameraIntent): void {
    for (const listener of listeners) listener(intent);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function signalUserCameraIntent(source?: string): void {
  cameraIntentOps.emit({ origin: 'user', source });
}
