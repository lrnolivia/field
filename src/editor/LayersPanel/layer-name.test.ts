import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { getLayerDisplayName } from './layer-name';

const textNode = (overrides: Partial<CanvasNode> = {}) => ({
  id: 'text-1', type: 'p', name: 'Text', textContent: 'A better heading',
  hasMixedContent: false, ...overrides,
} as CanvasNode);

describe('getLayerDisplayName', () => {
  it('follows plain text content for default text labels', () => {
    expect(getLayerDisplayName(textNode())).toBe('A better heading');
    expect(getLayerDisplayName(textNode({ name: 'Heading', textContent: 'Line one\n  line two' }))).toBe('Line one line two');
    expect(getLayerDisplayName(textNode({ name: 'p', textContent: 'hi!' }))).toBe('hi!');
  });

  it('preserves custom names and non-text layer names', () => {
    expect(getLayerDisplayName(textNode({ name: 'Hero title' }))).toBe('Hero title');
    expect(getLayerDisplayName(textNode({ type: 'div', name: 'Text' }))).toBe('Text');
  });

  it('does not expose JSX or bound text as a name', () => {
    expect(getLayerDisplayName(textNode({ hasMixedContent: true, textContent: '<span>Title</span>' }))).toBe('Text');
    expect(getLayerDisplayName(textNode({ textVariable: 'title' }))).toBe('Text');
    expect(getLayerDisplayName(textNode({ textContent: '<span>Title</span>' }))).toBe('Text');
  });

  it('keeps literal angle brackets as text', () => {
    expect(getLayerDisplayName(textNode({ textContent: '<Untitled>', textIsLiteral: true }))).toBe('<Untitled>');
  });

  it('lets the Layers option show original authored names', () => {
    expect(getLayerDisplayName(textNode(), false)).toBe('Text');
  });
});
