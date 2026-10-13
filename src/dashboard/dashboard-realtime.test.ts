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
  it('project events schedule an authoritative Dashboard refresh with event context', () => {
    const schedule = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((next: (value: typeof event) => void) => {
      next(event);
      return unsubscribe;
    });

    const stop = bindDashboardProjectEvents({ schedule }, subscribe);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(event);
    expect(stop).toBe(unsubscribe);
  });

  it('coalesces bursts into one refresh while preserving affected event kinds', () => {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    const load = vi.fn(async () => ['latest']);
    const apply = vi.fn();
    const onBackgroundRefreshStart = vi.fn();
    const controller = createDashboardProjectRefreshController({
      load,
      apply,
      onBackgroundRefreshStart,
      setTimeoutFn: ((callback, delay) => {
        timers.splice(0, timers.length, { callback, delay });
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    controller.schedule(event);
    controller.schedule({ ...event, kind: 'document', revision: '"r2"' });
    controller.schedule({ ...event, changedAt: '2026-09-26T04:00:01.000Z' });
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBe(40);
    timers[0].callback();
    expect(load).toHaveBeenCalledTimes(1);
    expect(onBackgroundRefreshStart).toHaveBeenCalledTimes(1);
    expect(onBackgroundRefreshStart.mock.calls[0][0].events).toEqual([
      { ...event, changedAt: '2026-09-26T04:00:01.000Z' },
      { ...event, kind: 'document', revision: '"r2"' },
    ]);
  });

  it('marks only background refreshes as start/end loading work', async () => {
    let scheduled: (() => void) | null = null;
    const onBackgroundRefreshStart = vi.fn();
    const onBackgroundRefreshEnd = vi.fn();
    const controller = createDashboardProjectRefreshController({
      load: vi.fn(async () => ['latest']),
      apply: vi.fn(),
      delayMs: 0,
      onBackgroundRefreshStart,
      onBackgroundRefreshEnd,
      setTimeoutFn: ((callback) => {
        scheduled = callback;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    await controller.refreshNow();
    expect(onBackgroundRefreshStart).not.toHaveBeenCalled();
    expect(onBackgroundRefreshEnd).not.toHaveBeenCalled();

    controller.schedule(event);
    const runScheduled = scheduled as (() => void) | null;
    if (!runScheduled) throw new Error('expected scheduled refresh callback');
    runScheduled();
    await Promise.resolve();
    await Promise.resolve();
    expect(onBackgroundRefreshStart).toHaveBeenCalledTimes(1);
    expect(onBackgroundRefreshEnd).toHaveBeenCalledTimes(1);
    expect(onBackgroundRefreshEnd.mock.calls[0][0].id).toBe(onBackgroundRefreshStart.mock.calls[0][0].id);
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
