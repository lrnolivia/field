import { describe, expect, it, vi } from 'vitest';
import { createDashboardLoadingController } from './dashboard-loading';
import type { DashboardProjectRefreshRun } from './dashboard-realtime';

const run = (id: number, projectId = 'local'): DashboardProjectRefreshRun => ({
  id,
  events: [{
    type: 'project-change',
    projectId,
    kind: 'metadata',
    changedAt: '2026-09-26T05:30:00.000Z',
  }],
});

describe('Dashboard loading feedback', () => {
  it('does not reveal a skeleton for a refresh that settles before the reveal threshold', () => {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    const show = vi.fn();
    const hide = vi.fn();
    const controller = createDashboardLoadingController({
      show,
      hide,
      setTimeoutFn: ((callback, delay) => {
        timers.push({ callback, delay });
        return timers.length as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    controller.begin(run(1));
    controller.end(run(1));

    expect(show).not.toHaveBeenCalled();
    expect(hide).toHaveBeenCalledTimes(1);
    expect(timers[0]?.delay).toBe(160);
  });

  it('reveals only affected project ids after the threshold', () => {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    const show = vi.fn();
    const controller = createDashboardLoadingController({
      show,
      hide: vi.fn(),
      setTimeoutFn: ((callback, delay) => {
        timers.push({ callback, delay });
        return timers.length as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    controller.begin({
      id: 2,
      events: [
        { type: 'project-change', projectId: 'one', kind: 'document', changedAt: '2026-09-26T05:30:00.000Z' },
        { type: 'project-change', projectId: 'two', kind: 'thumbnail', changedAt: '2026-09-26T05:30:01.000Z' },
      ],
    });
    timers[0].callback();

    expect(show).toHaveBeenCalledTimes(1);
    expect([...show.mock.calls[0][0]]).toEqual(['one', 'two']);
  });

  it('keeps a revealed skeleton visible briefly so it cannot flash for one frame', () => {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    let clock = 1000;
    const hide = vi.fn();
    const controller = createDashboardLoadingController({
      show: vi.fn(),
      hide,
      now: () => clock,
      setTimeoutFn: ((callback, delay) => {
        timers.push({ callback, delay });
        return timers.length as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    controller.begin(run(3));
    timers[0].callback();
    clock = 1080;
    controller.end(run(3));

    expect(hide).not.toHaveBeenCalled();
    expect(timers[1]?.delay).toBe(100);
    timers[1].callback();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
