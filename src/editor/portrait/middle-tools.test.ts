import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachMiddleMousePan } from '@/canvas/transform/InputHandler';
import { transformManager } from '@/canvas/transform/TransformManager';
import { QUICK_TOOLS_EVENT } from './interaction';

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(f => f()); vi.restoreAllMocks(); document.body.innerHTML = ''; });
function setup() {
  const element = document.createElement('div'); document.body.append(element);
  element.setPointerCapture = vi.fn(); element.releasePointerCapture = vi.fn();
  const pan = vi.spyOn(transformManager, 'pan').mockImplementation(() => {});
  const opened = vi.fn(); window.addEventListener(QUICK_TOOLS_EVENT, opened);
  cleanups.push(() => window.removeEventListener(QUICK_TOOLS_EVENT, opened));
  cleanups.push(attachMiddleMousePan(element, vi.fn()));
  const send = (type: string, x: number, y: number, button = 1) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { clientX: x, clientY: y, button, pointerId: 7 });
    element.dispatchEvent(event);
  };
  return { send, opened, pan };
}
describe('middle-button tools share native camera ownership', () => {
  it('opens on release without depending on compatibility mouse events', () => {
    const { send, opened } = setup(); send('pointerdown', 100, 100);
    expect(opened).not.toHaveBeenCalled(); send('pointerup', 100, 100);
    expect(opened).toHaveBeenCalledTimes(1);
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual({ x:100, y:100 });
  });
  it('latches movement even if the pointer returns to its starting point', () => {
    const { send, opened, pan } = setup(); send('pointerdown', 100, 100);
    send('pointermove', 130, 115); send('pointermove', 100, 100); send('pointerup', 100, 100);
    expect(pan).toHaveBeenCalledWith(30, 15); expect(opened).not.toHaveBeenCalled();
  });
  it.each(['pointercancel', 'lostpointercapture'])('cancels on %s', type => {
    const { send, opened } = setup(); send('pointerdown', 100, 100); send(type, 100, 100); send('pointerup', 100, 100);
    expect(opened).not.toHaveBeenCalled();
  });
  it('leaves secondary click unchanged', () => {
    const { send, opened, pan } = setup(); send('pointerdown', 100, 100, 2); send('pointerup', 100, 100, 2);
    expect(opened).not.toHaveBeenCalled(); expect(pan).not.toHaveBeenCalled();
  });
});
