import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import ToolInput from './ToolInput';
import FieldSelect from './FieldSelect';
import ToolPlusMinus from './ToolPlusMinus';

function supportPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => true);
  element.releasePointerCapture = vi.fn();
}

describe('pointer scrub on the right half of inspector fields', () => {
  it('scrubs a numeric field vertically and commits once on release', () => {
    const live = vi.fn();
    const commit = vi.fn();
    const { container } = render(<ToolInput value="10px" onChange={vi.fn()} onChangeLive={live} onCommit={commit} step={1} />);
    const surface = container.querySelector('[data-touch-scrub="number"]') as HTMLElement;
    supportPointerCapture(surface);
    fireEvent.pointerDown(surface, { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 30 });
    fireEvent.pointerMove(surface, { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 12 });
    fireEvent.pointerUp(surface, { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 12 });
    expect(live).toHaveBeenCalledWith('13px');
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('13px');
  });

  it('slides through enabled dropdown options and preserves tap-to-open', () => {
    const onChange = vi.fn();
    const { container } = render(<FieldSelect value="a" onChange={onChange} options={[
      { value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' },
    ]} />);
    const surface = container.querySelector('[data-touch-scrub="select"]') as HTMLElement;
    supportPointerCapture(surface);
    fireEvent.pointerDown(surface, { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: 30 });
    fireEvent.pointerMove(surface, { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: -10 });
    fireEvent.pointerUp(surface, { pointerType: 'touch', pointerId: 2, clientX: 100, clientY: -10 });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('lets a mouse drag scrub numeric and nonnumeric inspector fields', () => {
    const numericChange = vi.fn();
    const numeric = render(<ToolInput value="12px" onChange={numericChange} step={1} />);
    const numberSurface = numeric.container.querySelector('[data-touch-scrub="number"]') as HTMLElement;
    supportPointerCapture(numberSurface);
    fireEvent.pointerDown(numberSurface, { pointerType: 'mouse', button: 0, pointerId: 3, clientX: 100, clientY: 30 });
    fireEvent.pointerMove(numberSurface, { pointerType: 'mouse', pointerId: 3, clientX: 100, clientY: 12 });
    fireEvent.pointerUp(numberSurface, { pointerType: 'mouse', pointerId: 3, clientX: 100, clientY: 12 });
    expect(numericChange).toHaveBeenCalledWith('15px');

    const selectChange = vi.fn();
    const select = render(<FieldSelect value="regular" onChange={selectChange} options={[
      { value: 'regular', label: 'Regular' }, { value: 'medium', label: 'Medium' }, { value: 'bold', label: 'Bold' },
    ]} />);
    const selectSurface = select.container.querySelector('[data-touch-scrub="select"]') as HTMLElement;
    supportPointerCapture(selectSurface);
    fireEvent.pointerDown(selectSurface, { pointerType: 'mouse', button: 0, pointerId: 4, clientX: 100, clientY: 30 });
    fireEvent.pointerMove(selectSurface, { pointerType: 'mouse', pointerId: 4, clientX: 100, clientY: -10 });
    fireEvent.pointerUp(selectSurface, { pointerType: 'mouse', pointerId: 4, clientX: 100, clientY: -10 });
    expect(selectChange).toHaveBeenCalledWith('bold');
  });


  it('uses a vertical cursor and consumes wheel gestures on numeric/select controls', () => {
    const numericChange = vi.fn();
    const numeric = render(<ToolInput value="10px" onChange={numericChange} step={1} />);
    const numberSurface = numeric.container.querySelector('[data-touch-scrub="number"]') as HTMLElement;
    expect(numberSurface.className).toContain('cursor-ns-resize');
    expect(numberSurface.className).not.toContain('cursor-ew-resize');
    expect(numberSurface.hasAttribute('data-field-no-canvas-input')).toBe(true);

    const numberWheel = new WheelEvent('wheel', { deltaY: -24, bubbles: true, cancelable: true });
    numberSurface.dispatchEvent(numberWheel);
    expect(numberWheel.defaultPrevented).toBe(true);
    expect(numericChange).toHaveBeenCalledWith('11px');

    const selectChange = vi.fn();
    const select = render(<FieldSelect value="a" onChange={selectChange} options={[
      { value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' },
    ]} />);
    const trigger = select.container.querySelector('[data-field-select-trigger]') as HTMLButtonElement;
    const selectSurface = select.container.querySelector('[data-touch-scrub="select"]') as HTMLElement;
    expect(trigger.className).toContain('cursor-ns-resize');
    expect(selectSurface.className).toContain('cursor-ns-resize');
    expect(trigger.hasAttribute('data-field-no-canvas-input')).toBe(true);

    const selectWheel = new WheelEvent('wheel', { deltaY: 24, bubbles: true, cancelable: true });
    trigger.dispatchEvent(selectWheel);
    expect(selectWheel.defaultPrevented).toBe(true);
    expect(selectChange).toHaveBeenCalledWith('b');
  });

  it('lets the plus/minus stepper own a two-finger wheel gesture', () => {
    const onChange = vi.fn();
    const { container } = render(<ToolPlusMinus value={5} onChange={onChange} min={0} max={10} step={1} />);
    const stepper = container.querySelector('[data-value-wheel="vertical"]') as HTMLElement;
    expect(stepper.hasAttribute('data-field-no-canvas-input')).toBe(true);
    expect(stepper.className).toContain('cursor-ns-resize');

    const event = new WheelEvent('wheel', { deltaY: -24, bubbles: true, cancelable: true });
    stepper.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith(6);
  });
});
