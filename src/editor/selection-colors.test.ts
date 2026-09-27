import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { aggregateSelectionColors, buildColorReplacementStyles, collectSelectionScopeIds } from './selection-colors';

if (!('HTMLElement' in globalThis)) {
  Object.defineProperty(globalThis, 'HTMLElement', { value: class HTMLElement {} });
}

function node(id: string, styles: Record<string, string> = {}, children: string[] = []): CanvasNode {
  return { id, type: 'div', name: id, parentId: null, children, styles, textContent: '' } as CanvasNode;
}

describe('Selection colors Figma-parity scope', () => {
  it('walks a selected frame subtree and excludes expanded component internals', () => {
    const nodes = new Map<string, CanvasNode>([
      ['frame', node('frame', {}, ['title', 'card', 'instance:master-child'])],
      ['title', node('title', { color: '#fff' })],
      ['card', node('card', { backgroundColor: '#111' })],
      ['instance:master-child', node('instance:master-child', { color: '#f00' })],
    ]);
    expect(collectSelectionScopeIds(['frame'], nodes)).toEqual(['frame', 'title', 'card']);
  });

  it('aggregates solid fills/text fills/strokes across a selected subtree', () => {
    const nodes = new Map<string, CanvasNode>([
      ['frame', node('frame', { backgroundColor: '#111111' }, ['text', 'bordered'])],
      ['text', node('text', { color: '#111111' })],
      ['bordered', node('bordered', { borderColor: '#111111' })],
    ]);
    const groups = aggregateSelectionColors(['frame'], nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].targets).toHaveLength(3);
  });

  it('extracts gradient stops as individual selection colors', () => {
    const nodes = new Map<string, CanvasNode>([
      ['frame', node('frame', { backgroundImage: 'linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #ff0000 100%)' })],
    ]);
    const groups = aggregateSelectionColors(['frame'], nodes);
    const red = groups.find((group) => group.value.toLowerCase() === '#ff0000');
    const replacement = buildColorReplacementStyles(red!.targets, '#0000ff');
    expect(red?.targets).toHaveLength(2);
    expect(replacement.get('frame')?.backgroundImage).toBe('linear-gradient(90deg, #0000ff 0%, #00ff00 50%, #0000ff 100%)');
  });

  it('preserves variable/style bindings as distinct selection colors', () => {
    const nodes = new Map<string, CanvasNode>([
      ['frame', node('frame', { backgroundColor: 'var(--Brand)', color: 'var(--brand)' })],
    ]);
    expect(aggregateSelectionColors(['frame'], nodes).map((g) => g.value).sort()).toEqual(['var(--Brand)', 'var(--brand)']);
  });

  it('does not surface effect colors, image fills, or transparent paint', () => {
    const nodes = new Map<string, CanvasNode>([
      ['frame', node('frame', {
        boxShadow: '0 4px 8px #ff0000',
        filter: 'drop-shadow(0 1px 2px #00ff00)',
        backgroundImage: 'url(/image.png)',
        backgroundColor: 'transparent',
      })],
    ]);
    expect(aggregateSelectionColors(['frame'], nodes)).toEqual([]);
  });
});
