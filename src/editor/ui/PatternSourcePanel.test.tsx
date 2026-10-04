import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PatternSourcePanel from './PatternSourcePanel';

vi.mock('./PatternLibraryPanel', () => ({
  default: ({ activePatternId, onSelect }: { activePatternId?: string; onSelect: (definition: object, config: object) => void }) => (
    <button onClick={() => onSelect({ slug: 'waves' }, { source: 'pattern-monster', patternId: 'waves' })} aria-pressed={activePatternId === 'waves'}>Existing wave pattern</button>
  ),
}));
afterEach(cleanup);
describe('Pattern source collection', () => {
  it('opens with existing patterns before the optional image import without applying anything', () => {
    const onSelect = vi.fn(), onChooseImage = vi.fn();
    render(<PatternSourcePanel activePatternId="waves" onSelect={onSelect} onChooseImage={onChooseImage} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map(button => button.textContent)).toEqual(['Existing wave pattern', 'Use an image…']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onChooseImage).not.toHaveBeenCalled();
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith({ slug: 'waves' }, { source: 'pattern-monster', patternId: 'waves' });
    expect(onChooseImage).not.toHaveBeenCalled();
  });
  it('keeps the secondary image route explicit and leaves the current fill intact', () => {
    const onSelect = vi.fn(), onChooseImage = vi.fn();
    render(<PatternSourcePanel onSelect={onSelect} onChooseImage={onChooseImage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use an image…' }));
    expect(onChooseImage).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
