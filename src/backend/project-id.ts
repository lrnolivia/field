// project-id.ts — active field project identity.
//
// The field URL is `/work/[id]` (legacy `/builder/[id]` still resolves), but Dashboard is a same-document
// layer over a live editor. While that layer owns `/`, autosave/realtime still
// need the mounted Canvas project's id. The shell therefore pins the active id
// here until a different project is intentionally mounted.

let activeProjectIdOverride: string | null = null;

export function setFieldProjectIdOverride(id: string | null): void {
  const normalized = id?.trim() ?? '';
  activeProjectIdOverride = normalized || null;
}

export function getFieldProjectIdOverride(): string | null {
  return activeProjectIdOverride;
}

/**
 * Returns the active project id.
 * - A live shell override wins while Dashboard is layered over Canvas.
 * - Otherwise `/work/abc123` or `/builder/abc123` resolves to `abc123`.
 * - `/` or a bare editor path falls back to `local` for standalone/dev mode.
 */
export function getProjectId(): string {
  if (activeProjectIdOverride) return activeProjectIdOverride;
  if (typeof window === 'undefined') return 'local';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const builderIdx = parts.findIndex(part => part === 'work' || part === 'builder');
  if (builderIdx !== -1 && parts[builderIdx + 1]) {
    try {
      return decodeURIComponent(parts[builderIdx + 1]);
    } catch {
      return parts[builderIdx + 1];
    }
  }
  return 'local';
}
