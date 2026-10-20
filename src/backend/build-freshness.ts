// build-freshness.ts — notice when the deployed build is newer than the one
// this tab is running, and update safely.
//
// A tab can run stale code for a long time: Safari restores the editor from
// its back/forward cache, a laptop wakes days later, a deploy lands while the
// editor is open. The About dialog reads the DEPLOYED build from /api/build,
// so it could report the new SHA while the old bundle kept running. We compare
// the bundle's compiled-in identity with /api/build when the tab returns
// (visibility, BFCache `pageshow`, coming back online, a failed lazy chunk)
// and on a slow interval.
//
// Updating never clears documents, preferences or offline edits: the reload
// waits for the project to be saved and refuses while changes are unsaved or
// in conflict.

import { atom, getDefaultStore } from 'jotai';
import { deployedBuildDiffers, fetchFieldBuildInfo, loadedFieldBuild, type FieldBuildInfo } from './build-info';
import { saveStatusAtom } from './save-store';
import { flushSaveNow } from './autosave';
import { armIntentionalNavigationBypass } from './intentional-navigation';
import { trace } from '@/shared/debug-trace';

/** The deployed build when it differs from the running bundle, else null. */
export const newerBuildAtom = atom<FieldBuildInfo | null>(null);

const INTERVAL_MS = 10 * 60 * 1000;

export function startBuildFreshnessWatch(opts: {
  fetchImpl?: typeof fetch;
  intervalMs?: number;
  store?: ReturnType<typeof getDefaultStore>;
} = {}): () => void {
  const store = opts.store ?? getDefaultStore();
  let inFlight = false;
  let disposed = false;

  const check = async (reason: string) => {
    if (inFlight || disposed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    inFlight = true;
    try {
      const deployed = await fetchFieldBuildInfo(opts.fetchImpl);
      if (disposed) return;
      const newer = deployedBuildDiffers(loadedFieldBuild, deployed);
      store.set(newerBuildAtom, newer ? deployed : null);
      trace.action('build-freshness:checked', { reason, loaded: loadedFieldBuild.shortSha, deployed: deployed.shortSha, newer });
    } catch (error) {
      trace.action('build-freshness:unavailable', { reason, error: String(error) });
    } finally {
      inFlight = false;
    }
  };

  const onVisible = () => { if (document.visibilityState === 'visible') void check('visible'); };
  const onPageShow = (e: PageTransitionEvent) => { void check(e.persisted ? 'bfcache-restore' : 'pageshow'); };
  const onOnline = () => { void check('online'); };
  // A stale tab lazy-loading a chunk that the newer deploy removed: check at
  // once so the update notice explains it instead of a feature silently failing.
  const onPreloadError = () => { void check('chunk-load-failed'); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('vite:preloadError', onPreloadError);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('online', onOnline);
  const timer = window.setInterval(() => { void check('interval'); }, opts.intervalMs ?? INTERVAL_MS);
  void check('start');

  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('vite:preloadError', onPreloadError);
    window.clearInterval(timer);
  };
}

export type SafeReloadResult = { ok: true } | { ok: false; reason: 'offline' | 'unsaved' };

/** Reload into the newest build only once the project is safely persisted. */
export async function reloadToLatestBuild(opts: {
  store?: ReturnType<typeof getDefaultStore>;
  flush?: () => Promise<void>;
  reload?: () => void;
  isOnline?: () => boolean;
} = {}): Promise<SafeReloadResult> {
  const store = opts.store ?? getDefaultStore();
  const flush = opts.flush ?? flushSaveNow;
  const online = opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  if (store.get(saveStatusAtom) !== 'saved') {
    if (!online()) {
      trace.action('build-freshness:reload-refused', { reason: 'offline' });
      return { ok: false, reason: 'offline' };
    }
    try {
      await flush();
    } catch (error) {
      trace.action('build-freshness:reload-refused', { reason: 'unsaved', error: String(error) });
      return { ok: false, reason: 'unsaved' };
    }
    if (store.get(saveStatusAtom) !== 'saved') {
      trace.action('build-freshness:reload-refused', { reason: 'unsaved', status: store.get(saveStatusAtom) });
      return { ok: false, reason: 'unsaved' };
    }
  }
  trace.action('build-freshness:reload');
  // The project is saved: let the unload guard pass without its prompt.
  armIntentionalNavigationBypass();
  (opts.reload ?? (() => window.location.reload()))();
  return { ok: true };
}
