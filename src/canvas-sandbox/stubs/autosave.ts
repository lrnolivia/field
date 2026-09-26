// Canvas sandbox persistence stub.
//
// The sandbox is a render/interaction process. It does not own ProjectFS,
// revision state, R2 persistence, or project identity. All durable saves are
// performed by the parent field editor.
//
// Keeping this as an explicit Vite alias also prevents parent autosave module
// side effects (lifecycle hooks / ProjectFS subscriptions) from running inside
// canvas.field.loew.fi.

export function triggerAutosave(_opts?: { force?: boolean }): void {}

export async function flushSaveNow(): Promise<void> {}

export function setIsSaveLeader(_leader: boolean): void {}

export function setAutosaveHeld(_held: boolean): void {}

export function cancelPendingAutosave(): void {}

export function isRetryableSaveError(_error: unknown): boolean {
  return false;
}

export function buildProjectData() {
  return {
    format: 'revyme-v1' as const,
    files: {},
  };
}
