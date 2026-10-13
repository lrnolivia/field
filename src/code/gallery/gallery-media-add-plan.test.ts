import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { buildGalleryMediaAddPlan } from './gallery-media-add-plan';

function gallery(styles: Record<string, string> = {}): CanvasNode {
  return {
    id: 'gallery',
    type: 'div',
    name: 'Gallery',
    parentId: null,
    children: [],
    styles: { '--field-gallery-view': 'grid', ...styles },
    attrs: {},
    textContent: '', hasMixedContent: false, order: 0, isCanvasNode: false,
    componentFile: null, componentInstanceId: null, isComponentRoot: false,
    motionVariants: null, motionVariantsRef: null, responsiveVariantMap: null,
    conditionalStyles: null, motionProps: null,
  };
}

describe('buildGalleryMediaAddPlan', () => {
  it('deduplicates media and appends canonical Gallery items', () => {
    const root = gallery();
    const plan = buildGalleryMediaAddPlan({
      gallery: root,
      nodes: new Map([['gallery', root]]),
      media: [{ url: 'a.jpg' }, { url: 'a.jpg' }, { url: 'b.jpg' }],
    });
    expect(plan.itemNodes).toHaveLength(2);
    expect(plan.mutations.filter((mutation) => mutation.type === 'addNode')).toHaveLength(2);
  });

  it('writes provided intrinsic ratios in Source mode', () => {
    const root = gallery({ '--field-gallery-frame-sizing': 'source' });
    const plan = buildGalleryMediaAddPlan({
      gallery: root,
      nodes: new Map([['gallery', root]]),
      media: [{ url: 'wide.jpg', sourceRatio: 2 }],
    });
    expect(plan.missingSourceRatios).toBe(0);
    expect(plan.itemNodes[0].styles?.['--field-gallery-source-ratio']).toBe('2');
  });

  it('reports missing Source ratios instead of hiding the information', () => {
    const root = gallery({ '--field-gallery-frame-sizing': 'source' });
    const plan = buildGalleryMediaAddPlan({
      gallery: root,
      nodes: new Map([['gallery', root]]),
      media: [{ url: 'unknown.jpg' }],
    });
    expect(plan.missingSourceRatios).toBe(1);
  });

  it('adds Strip hover behavior for every appended item', () => {
    const root = gallery({ '--field-gallery-view': 'strip' });
    const plan = buildGalleryMediaAddPlan({
      gallery: root,
      nodes: new Map([['gallery', root]]),
      media: [{ url: 'a.jpg' }, { url: 'b.jpg' }],
    });
    expect(plan.mutations.filter((mutation) => mutation.type === 'updateCssHover')).toHaveLength(2);
  });

  it('regenerates Carousel semantics after adding media', () => {
    const root = gallery({ '--field-gallery-view': 'carousel' });
    const plan = buildGalleryMediaAddPlan({
      gallery: root,
      nodes: new Map([['gallery', root]]),
      media: [{ url: 'a.jpg' }, { url: 'b.jpg' }],
    });
    expect(plan.mutations.some((mutation) => mutation.type === 'updateHtmlAttrs')).toBe(true);
    expect(plan.mutations.some(
      (mutation) => mutation.type === 'addNode' && mutation.parentId !== 'gallery',
    )).toBe(true);
  });
});
