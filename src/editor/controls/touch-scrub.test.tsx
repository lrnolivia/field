import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import ToolInput from './ToolInput';
import FieldSelect from './FieldSelect';

function supportPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => true);
  element.releasePointerCapture = vi.fn();
}

describe('touch scrub on the right half of inspector fields', () => {
  it('scrubs a numeric field horizontally and commits once on release', () => {
    const live = vi.fn();
    const commit = vi.fn();
    const { container } = render(<ToolInput value="10px" onChange={vi.fn()} onChangeLive={live} onCommit={commit} step={1} />);
    const surface = container.querySelector('[data-touch-scrub="number"]') as HTMLElement;
    supportPointerCapture(surface);
    fireEvent.pointerDown(surface, { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 30 });
    fireEvent.pointerMove(surface, { pointerType: 'touch', pointerId: 1, clientX: 118, clientY: 30 });
    fireEvent.pointerUp(surface, { pointerType: 'touch', pointerId: 1, clientX: 118, clientY: 30 });
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
});
