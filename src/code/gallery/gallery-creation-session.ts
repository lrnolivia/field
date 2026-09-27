import { holdHistoryCoalescing, releaseHistoryCoalescing } from '@/code/mutation/history';
import { GALLERY_VIEW_STYLE_PROPERTY, isGalleryViewId } from './gallery-views';

const UNCLAIMED_TIMEOUT_MS = 5000;

interface GalleryCreationSession {
  timeout: ReturnType<typeof globalThis.setTimeout> | null;
}

const sessions = new Map<string, GalleryCreationSession>();
let historyHeld = false;

export interface GalleryInsertionPayloadNode {
  styles?: Record<string, string>;
  children?: readonly string[];
}

function ensureHistoryHold(): void {
  if (historyHeld) return;
  holdHistoryCoalescing();
  historyHeld = true;
}

function releaseHistoryIfIdle(): void {
  if (!historyHeld || sessions.size > 0) return;
  historyHeld = false;
  releaseHistoryCoalescing();
}

function clearSessionTimeout(session: GalleryCreationSession): void {
  if (session.timeout === null) return;
  globalThis.clearTimeout(session.timeout);
  session.timeout = null;
}

function expireSession(galleryId: string): void {
  const session = sessions.get(galleryId);
  if (!session) return;
  clearSessionTimeout(session);
  sessions.delete(galleryId);
  releaseHistoryIfIdle();
}

export function isEmptyGalleryInsertionPayload(nodes: readonly GalleryInsertionPayloadNode[]): boolean {
  if (nodes.length !== 1) return false;
  const root = nodes[0];
  const view = root?.styles?.[GALLERY_VIEW_STYLE_PROPERTY];
  return isGalleryViewId(view) && (root.children?.length ?? 0) === 0;
}

export function registerFreshGalleryInsertion(galleryId: string): void {
  if (!galleryId || sessions.has(galleryId)) return;
  ensureHistoryHold();
  const session: GalleryCreationSession = { timeout: null };
  sessions.set(galleryId, session);
  session.timeout = globalThis.setTimeout(() => expireSession(galleryId), UNCLAIMED_TIMEOUT_MS);
}

export function claimGalleryCreationSession(galleryId: string): boolean {
  const session = sessions.get(galleryId);
  if (!session) return false;
  clearSessionTimeout(session);
  return true;
}

export function hasGalleryCreationSession(galleryId: string): boolean {
  return sessions.has(galleryId);
}

export function completeGalleryCreationSession(galleryId: string): void {
  const session = sessions.get(galleryId);
  if (!session) return;
  clearSessionTimeout(session);
  sessions.delete(galleryId);
  releaseHistoryIfIdle();
}
