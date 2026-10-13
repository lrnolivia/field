// bridge-host-camera.test.ts — one-way camera fast-path transport.
//
// Camera transforms are frame-rate state. They must not use Comlink's
// request/reply path when the iframe is available, because queued RPC traffic
// makes continuous pan/zoom paint in visible bursts.

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/shared/debug-trace', () => ({
  trace: { action: vi.fn(), fn: vi.fn(), error: vi.fn(), dom: vi.fn(), state: vi.fn() },
}));

import { PostMessageBridge } from './bridge-host';
import { isCanvasHostMessage, SANDBOX_ORIGIN } from './protocol';

describe('PostMessageBridge — camera fast path', () => {
  const bridges: PostMessageBridge[] = [];

  const makeBridge = () => {
    const bridge = new PostMessageBridge();
    bridges.push(bridge);
    return bridge;
  };

  afterEach(() => {
    for (const bridge of bridges.splice(0)) bridge.destroy();
  });

  it('uses one-way postMessage instead of Comlink when the iframe window exists', () => {
    const bridge = makeBridge();
    const postMessage = vi.fn();
    const rpcTransform = vi.fn();

    (bridge as any).iframe = { contentWindow: { postMessage } };
    (bridge as any).remote = { setViewportTransform: rpcTransform };

    bridge.setViewportTransform(120, -45, 0.75);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message, targetOrigin] = postMessage.mock.calls[0];
    expect(isCanvasHostMessage(message)).toBe(true);
    expect(message).toEqual({
      __fieldHost: true,
      type: 'viewportTransform',
      x: 120,
      y: -45,
      scale: 0.75,
    });
    expect(targetOrigin).toBe(SANDBOX_ORIGIN);
    expect(rpcTransform).not.toHaveBeenCalled();
  });

  it('keeps the Comlink transform as a compatibility fallback without an iframe window', () => {
    const bridge = makeBridge();
    const rpcTransform = vi.fn();
    (bridge as any).remote = { setViewportTransform: rpcTransform };

    bridge.setViewportTransform(10, 20, 1.25);

    expect(rpcTransform).toHaveBeenCalledTimes(1);
    expect(rpcTransform).toHaveBeenCalledWith(10, 20, 1.25);
  });

  it('updates the host-side current transform before transport', () => {
    const bridge = makeBridge();
    const postMessage = vi.fn();
    (bridge as any).iframe = { contentWindow: { postMessage } };

    bridge.setViewportTransform(-12, 88, 2);

    expect((bridge as any).currentTransform).toEqual({ x: -12, y: 88, scale: 2 });
  });
});
