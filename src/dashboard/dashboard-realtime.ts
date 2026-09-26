import {
  subscribeToFieldProjectEvents,
  type FieldProjectEvent,
  type FieldProjectEventListener,
} from '@/backend/project-events';

export const DASHBOARD_REALTIME_COALESCE_MS = 40;

export interface DashboardProjectRefreshController<T> {
  refreshNow(): Promise<void>;
  schedule(): void;
  dispose(): void;
}

interface DashboardProjectRefreshOptions<T> {
  load: () => Promise<T>;
  apply: (value: T) => void;
  onError?: (error: unknown) => void;
  delayMs?: number;
  setTimeoutFn?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

export function createDashboardProjectRefreshController<T>(
  options: DashboardProjectRefreshOptions<T>,
): DashboardProjectRefreshController<T> {
  const delayMs = options.delayMs ?? DASHBOARD_REALTIME_COALESCE_MS;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let epoch = 0;
  let disposed = false;

  const clearTimer = () => {
    if (timer === null) return;
    clearTimeoutFn(timer);
    timer = null;
  };

  const run = async (runEpoch: number) => {
    try {
      const value = await options.load();
      if (!disposed && runEpoch === epoch) options.apply(value);
    } catch (error) {
      if (!disposed && runEpoch === epoch) options.onError?.(error);
    }
  };

  return {
    refreshNow() {
      if (disposed) return Promise.resolve();
      clearTimer();
      const runEpoch = ++epoch;
      return run(runEpoch);
    },
    schedule() {
      if (disposed) return;
      clearTimer();
      const runEpoch = ++epoch;
      timer = setTimeoutFn(() => {
        timer = null;
        void run(runEpoch);
      }, delayMs);
    },
    dispose() {
      disposed = true;
      epoch += 1;
      clearTimer();
    },
  };
}

export function bindDashboardProjectEvents(
  controller: Pick<DashboardProjectRefreshController<unknown>, 'schedule'>,
  subscribe: (listener: FieldProjectEventListener) => () => void = subscribeToFieldProjectEvents,
): () => void {
  return subscribe((_event: FieldProjectEvent) => controller.schedule());
}
