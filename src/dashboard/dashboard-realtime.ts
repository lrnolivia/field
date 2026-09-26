import {
  subscribeToFieldProjectEvents,
  type FieldProjectEvent,
  type FieldProjectEventListener,
} from '@/backend/project-events';

export const DASHBOARD_REALTIME_COALESCE_MS = 40;

export interface DashboardProjectRefreshRun {
  id: number;
  events: FieldProjectEvent[];
}

export interface DashboardProjectRefreshController<T> {
  refreshNow(): Promise<void>;
  schedule(event?: FieldProjectEvent): void;
  dispose(): void;
}

interface DashboardProjectRefreshOptions<T> {
  load: () => Promise<T>;
  apply: (value: T) => void;
  onError?: (error: unknown) => void;
  onBackgroundRefreshStart?: (run: DashboardProjectRefreshRun) => void;
  onBackgroundRefreshEnd?: (run: DashboardProjectRefreshRun) => void;
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
  const pendingEvents = new Map<string, FieldProjectEvent>();

  const clearTimer = () => {
    if (timer === null) return;
    clearTimeoutFn(timer);
    timer = null;
  };

  const takePendingEvents = (): FieldProjectEvent[] => {
    const events = [...pendingEvents.values()];
    pendingEvents.clear();
    return events;
  };

  const run = async (runEpoch: number, events: FieldProjectEvent[]) => {
    const runInfo: DashboardProjectRefreshRun = { id: runEpoch, events };
    if (events.length > 0) options.onBackgroundRefreshStart?.(runInfo);
    try {
      const value = await options.load();
      if (!disposed && runEpoch === epoch) options.apply(value);
    } catch (error) {
      if (!disposed && runEpoch === epoch) options.onError?.(error);
    } finally {
      if (events.length > 0) options.onBackgroundRefreshEnd?.(runInfo);
    }
  };

  return {
    refreshNow() {
      if (disposed) return Promise.resolve();
      clearTimer();
      pendingEvents.clear();
      const runEpoch = ++epoch;
      return run(runEpoch, []);
    },
    schedule(event) {
      if (disposed) return;
      if (event) pendingEvents.set(`${event.projectId}:${event.kind}`, event);
      clearTimer();
      const runEpoch = ++epoch;
      timer = setTimeoutFn(() => {
        timer = null;
        void run(runEpoch, takePendingEvents());
      }, delayMs);
    },
    dispose() {
      disposed = true;
      epoch += 1;
      pendingEvents.clear();
      clearTimer();
    },
  };
}

export function bindDashboardProjectEvents(
  controller: Pick<DashboardProjectRefreshController<unknown>, 'schedule'>,
  subscribe: (listener: FieldProjectEventListener) => () => void = subscribeToFieldProjectEvents,
): () => void {
  return subscribe((event: FieldProjectEvent) => controller.schedule(event));
}
