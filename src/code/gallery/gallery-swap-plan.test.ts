import { describe, expect, it } from 'vitest';
import type { ContainerOverrideMap } from '@/code/stores/container-query-store';
import { buildGallerySwapPlan, swapGalleryItemOrder } from './gallery-swap-plan';

const emptyOverrides = new Map() as ContainerOverrideMap;

function items() {
  return [
    { itemId: 'a', controlIds: [], sourceRatio: '1' },
    { itemId: 'b', controlIds: [], sourceRatio: '1.5' },
    { itemId: 'c', controlIds: [], sourceRatio: '0.75' },
    { itemId: 'd', controlIds: [], sourceRatio: '2' },
  ];
}

describe('Gallery swap plan', () => {
  it('exchanges identities rather than insert-and-shifting siblings', () => {
    const result = swapGalleryItemOrder(items(), 'a', 'c');
    expect(result?.ordered.map((item) => item.itemId)).toEqual(['c', 'b', 'a', 'd']);
    expect(result?.fromIndex).toBe(0);
    expect(result?.toIndex).toBe(2);
  });

  it('recomputes Natural index geometry from the swapped source order', () => {
    const result = buildGallerySwapPlan({
      galleryId: 'gallery',
      items: items(),
      draggedItemId: 'a',
      targetItemId: 'c',
      view: 'natural',
      naturalSeed: 0,
      frameSizing: 'source',
      responsiveOverrides: emptyOverrides,
    });
    expect(result).not.toBeNull();
    expect(result?.ordered.map((item) => item.itemId)).toEqual(['c', 'b', 'a', 'd']);
    const itemUpdates = result?.mutations.filter((mutation) => mutation.type === 'updateStyles') ?? [];
    expect(itemUpdates).toHaveLength(4);
    expect(itemUpdates[0]).toMatchObject({ nodeId: 'c' });
    expect(itemUpdates[2]).toMatchObject({ nodeId: 'a' });
  });

  it('clears stale Gallery-owned responsive index geometry only where present', () => {
    const overrides = new Map([
      ['a', new Map([[768, new Map([
        ['gridColumn', '9'],
        ['gridRow', '9'],
        ['objectFit', 'contain'],
      ])]])],
    ]) as ContainerOverrideMap;

    const result = buildGallerySwapPlan({
      galleryId: 'gallery',
      items: items(),
      draggedItemId: 'a',
      targetItemId: 'b',
      view: 'natural',
      naturalSeed: 0,
      frameSizing: 'composed',
      responsiveOverrides: overrides,
    });
    const responsive = result?.mutations.filter((mutation) => mutation.type === 'updateContainerStyle') ?? [];
    expect(responsive).toEqual([
      {
        type: 'updateContainerStyle',
        nodeId: 'a',
        maxWidth: 768,
        styles: { gridColumn: '', gridRow: '' },
      },
    ]);
  });

  it('regenerates Carousel slide/control semantics from the swapped order', () => {
    const result = buildGallerySwapPlan({
      galleryId: 'gallery',
      items: [
        { itemId: 'a', controlIds: ['a-prev', 'a-next'], domId: 'slide-a', ariaLabel: 'A' },
        { itemId: 'b', controlIds: ['b-prev', 'b-next'], domId: 'slide-b', ariaLabel: 'B' },
      ],
      draggedItemId: 'a',
      targetItemId: 'b',
      view: 'carousel',
      naturalSeed: 0,
      frameSizing: 'composed',
      responsiveOverrides: emptyOverrides,
    });
    expect(result?.ordered.map((item) => item.itemId)).toEqual(['b', 'a']);
    expect(result?.mutations.some((mutation) => mutation.type === 'removeNode')).toBe(true);
    expect(result?.mutations.some((mutation) => mutation.type === 'updateHtmlAttrs')).toBe(true);
    expect(result?.mutations.some((mutation) => mutation.type === 'addNode')).toBe(true);
  });
});
