import { describe, expect, it, vi } from 'vitest';
import {
  createFieldProjectEventTransport,
  fieldProjectReconnectDelay,
  parseFieldProjectEvent,
} from './project-events';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public readonly url: string) {
    FakeSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({ data });
  }

  disconnect() {
    this.readyState = 3;
    this.onclose?.();
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

const validEvent = {
  type: 'project-change' as const,
  projectId: 'local',
  kind: 'document' as const,
  changedAt: '2026-09-26T04:00:00.000Z',
  revision: '"r2"',
  sourceSessionId: null,
};

describe('field project event transport', () => {
  it('validates the stable project event contract', () => {
    expect(parseFieldProjectEvent(validEvent)).toEqual(validEvent);
    expect(parseFieldProjectEvent({ ...validEvent, kind: 'wat' })).toBeNull();
    expect(parseFieldProjectEvent({ ...validEvent, changedAt: 'not-a-date' })).toBeNull();
    expect(parseFieldProjectEvent({ ...validEvent, projectId: '' })).toBeNull();
  });

  it('shares one connection across subscribers and closes after the last unsubscribe', () => {
    FakeSocket.instances = [];
    const transport = createFieldProjectEventTransport({
      WebSocketCtor: FakeSocket,
      urlFactory: () => 'wss://field.loew.fi/api/field/realtime',
    });
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = transport.subscribe(a);
    const unsubB = transport.subscribe(b);
    expect(FakeSocket.instances).toHaveLength(1);

    const socket = FakeSocket.instances[0];
    socket.open();
    socket.message(JSON.stringify(validEvent));
    expect(a).toHaveBeenCalledWith(validEvent);
    expect(b).toHaveBeenCalledWith(validEvent);

    unsubA();
    expect(socket.closed).toBe(false);
    unsubB();
    expect(socket.closed).toBe(true);
  });

  it('ignores malformed messages without crashing listeners', () => {
    FakeSocket.instances = [];
    const listener = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const transport = createFieldProjectEventTransport({ WebSocketCtor: FakeSocket });
    transport.subscribe(listener);
    const socket = FakeSocket.instances[0];
    socket.message('{bad json');
    socket.message(JSON.stringify({ nope: true }));
    expect(listener).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses one bounded reconnect loop after accidental disconnects', () => {
    FakeSocket.instances = [];
    const scheduled: Array<{ callback: () => void; delay: number }> = [];
    const transport = createFieldProjectEventTransport({
      WebSocketCtor: FakeSocket,
      setTimeoutFn: ((callback: () => void, delay: number) => {
        scheduled.push({ callback, delay });
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      }),
      clearTimeoutFn: () => {},
    });

    transport.subscribe(() => {});
    const first = FakeSocket.instances[0];
    first.disconnect();
    first.disconnect();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].delay).toBe(250);

    scheduled.shift()!.callback();
    expect(FakeSocket.instances).toHaveLength(2);
    const second = FakeSocket.instances[1];
    second.disconnect();
    expect(scheduled[0].delay).toBe(500);
    expect(fieldProjectReconnectDelay(99)).toBe(5000);
  });
});
