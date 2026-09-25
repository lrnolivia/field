// index.ts — Backend adapter factory.
// Revyme Cloud stays explicit. Normal Vite dev stays browser-local. A normal
// production field build uses the field-native Worker/R2 persistence backend.

import { LocalBackend } from './local-backend';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import { RevymeBackend } from './revyme-backend';
import { FieldBackend } from './field-backend';
import type { ProjectBackend } from './types';
export type { ProjectBackend, ProjectData, RevymeUser } from './types';

export type BackendKind = 'revyme' | 'field' | 'local';

export interface BackendSelectionOptions {
  cloudEnabled: boolean;
  isDev: boolean;
  forceLocal: boolean;
}

/** Pure selection seam so the hosted/dev/cloud contract is testable without
 * mutating import.meta.env. VITE_FIELD_LOCAL_BACKEND is an explicit escape
 * hatch for locally previewing a production build without Cloudflare. */
export function resolveBackendKind(options: BackendSelectionOptions): BackendKind {
  if (options.cloudEnabled) return 'revyme';
  if (options.isDev || options.forceLocal) return 'local';
  return 'field';
}

export function createBackend(kind: BackendKind): ProjectBackend {
  if (kind === 'revyme') return new RevymeBackend();
  if (kind === 'field') return new FieldBackend();
  return new LocalBackend();
}

export const BACKEND_KIND = resolveBackendKind({
  cloudEnabled: CLOUD_ENABLED,
  isDev: import.meta.env.DEV,
  forceLocal: import.meta.env.VITE_FIELD_LOCAL_BACKEND === 'true',
});

export const backend = createBackend(BACKEND_KIND);
