import type { DashboardProjectRefreshRun } from './dashboard-realtime';

export const DASHBOARD_LOADING_REVEAL_MS = 160;
export const DASHBOARD_LOADING_MIN_VISIBLE_MS = 180;

export interface DashboardLoadingController {
  begin(run: DashboardProjectRefreshRun): void;
  end(run: DashboardProjectRefreshRun): void;
  dispose(): void;
}

interface DashboardLoadingOptions {
  show: (projectIds: Set<string>) => void;
  hide: () => void;
  revealMs?: number;
  minVisibleMs?: number;
  now?: () => number;
  setTimeoutFn?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

export function projectIdsForDashboardRefresh(run: DashboardProjectRefreshRun): Set<string> {
  return new Set(run.events.map((event) => event.projectId));
}

export function createDashboardLoadingController(options: DashboardLoadingOptions): DashboardLoadingController {
  const revealMs = options.revealMs ?? DASHBOARD_LOADING_REVEAL_MS;
  const minVisibleMs = options.minVisibleMs ?? DASHBOARD_LOADING_MIN_VISIBLE_MS;
  const now = options.now ?? Date.now;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  let disposed = false;
  let activeRunId = 0;
  let revealTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let shownAt: number | null = null;

  const clearReveal = () => {
    if (revealTimer === null) return;
    clearTimeoutFn(revealTimer);
    revealTimer = null;
  };

  const clearHide = () => {
    if (hideTimer === null) return;
    clearTimeoutFn(hideTimer);
    hideTimer = null;
  };

  const hideNow = () => {
    shownAt = null;
    options.hide();
  };

  return {
    begin(run) {
      if (disposed) return;
      activeRunId = run.id;
      clearReveal();
      clearHide();
      const projectIds = projectIdsForDashboardRefresh(run);

      if (shownAt !== null) {
        options.show(projectIds);
        return;
      }

      revealTimer = setTimeoutFn(() => {
        revealTimer = null;
        if (disposed || activeRunId !== run.id) return;
        shownAt = now();
        options.show(projectIds);
      }, revealMs);
    },
    end(run) {
      if (disposed || activeRunId !== run.id) return;
      clearReveal();
      if (shownAt === null) {
        options.hide();
        return;
      }

      const remaining = minVisibleMs - (now() - shownAt);
      if (remaining <= 0) {
        hideNow();
        return;
      }

      clearHide();
      hideTimer = setTimeoutFn(() => {
        hideTimer = null;
        if (disposed || activeRunId !== run.id) return;
        hideNow();
      }, remaining);
    },
    dispose() {
      disposed = true;
      activeRunId += 1;
      clearReveal();
      clearHide();
      hideNow();
    },
  };
}
