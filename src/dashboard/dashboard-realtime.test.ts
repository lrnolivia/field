import { describe, expect, it, vi } from 'vitest';
import {
  bindDashboardProjectEvents,
  createDashboardProjectRefreshController,
} from './dashboard-realtime';

const event = {
  type: 'project-change' as const,
  projectId: 'local',
  kind: 'thumbnail' as const,
  changedAt: '2026-09-26T04:00:00.000Z',
};

describe('Dashboard realtime refresh', () => {
  it('project events schedule an authoritative Dashboard refresh', () => {
    const schedule = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((next: (value: typeof event) => void) => {
      next(event);
      return unsubscribe;
    });

    const stop = bindDashboardProjectEvents({ schedule }, subscribe);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(stop).toBe(unsubscribe);
  });

  it('coalesces bursts into one refresh', () => {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    const load = vi.fn(async () => ['latest']);
    const apply = vi.fn();
    const controller = createDashboardProjectRefreshController({
      load,
      apply,
      setTimeoutFn: ((callback, delay) => {
        timers.splice(0, timers.length, { callback, delay });
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    controller.schedule();
    controller.schedule();
    controller.schedule();
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBe(40);
    timers[0].callback();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('never lets an older slow refresh overwrite a newer response', async () => {
    let resolveOld!: (value: string[]) => void;
    let resolveNew!: (value: string[]) => void;
    const oldPromise = new Promise<string[]>((resolve) => { resolveOld = resolve; });
    const newPromise = new Promise<string[]>((resolve) => { resolveNew = resolve; });
    const load = vi.fn()
      .mockReturnValueOnce(oldPromise)
      .mockReturnValueOnce(newPromise);
    const apply = vi.fn();
    const controller = createDashboardProjectRefreshController({ load, apply, delayMs: 0 });

    const oldRun = controller.refreshNow();
    const newRun = controller.refreshNow();
    resolveNew(['new']);
    await newRun;
    resolveOld(['old']);
    await oldRun;

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(['new']);
  });
});
