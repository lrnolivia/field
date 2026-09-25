import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import {
  planNativeGroupLayersReparent,
  planNativeGroupResize,
  planNativeGroupRefit,
  planNativeGroupRefitChain,
  touchesNativeGroupGeometry,
} from './group-refit';

function node(
  id: string,
  parentId: string | null,
  styles: Record<string, string>,
  extra: Partial<CanvasNode> = {},
): CanvasNode {
  return {
    id,
    type: 'div',
    name: id,
    parentId,
    children: [],
    styles,
    attrs: {},
    textContent: '',
    hasMixedContent: false,
    order: 0,
    isCanvasNode: false,
    componentFile: null,
    componentInstanceId: null,
    isComponentRoot: false,
    motionVariants: null,
    motionVariantsRef: null,
    responsiveVariantMap: null,
    conditionalStyles: null,
    ...extra,
  } as CanvasNode;
}

function patches(plan: ReturnType<typeof planNativeGroupRefit>) {
  return new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
}

describe('native Group refit geometry', () => {
  it('shrink-wraps absolute children and preserves their world boxes', () => {
    const group = node(
      'group-1',
      'root',
      { position: 'absolute', left: '100px', top: '80px', width: '220px', height: '120px' },
      { isGroup: true, children: ['a', 'b'] },
    );
    const a = node('a', 'group-1', {
      position: 'absolute', left: '-20px', top: '10px', width: '40px', height: '30px',
    });
    const b = node('b', 'group-1', {
      position: 'absolute', left: '120px', top: '50px', width: '50px', height: '20px',
    });
    const nodes = new Map([[group.id, group], [a.id, a], [b.id, b]]);

    const plan = planNativeGroupRefit(group.id, nodes);
    const out = patches(plan);

    expect(out.get('group-1')).toEqual({
      left: '80px',
      top: '90px',
      width: '190px',
      height: '60px',
    });
    expect(out.get('a')).toEqual({ left: '0px', top: '0px' });
    expect(out.get('b')).toEqual({ left: '140px', top: '40px' });

    // World-space positions are unchanged after wrapper-origin rebasing.
    expect(80 + 0).toBe(100 - 20);
    expect(90 + 0).toBe(80 + 10);
    expect(80 + 140).toBe(100 + 120);
    expect(90 + 40).toBe(80 + 50);
  });

  it('updates only Group dimensions when children already start at local zero', () => {
    const group = node(
      'group-1',
      'root',
      { position: 'absolute', left: '20px', top: '30px', width: '100px', height: '50px' },
      { isGroup: true, children: ['a', 'b'] },
    );
    const a = node('a', 'group-1', {
      position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px',
    });
    const b = node('b', 'group-1', {
      position: 'absolute', left: '60px', top: '10px', width: '80px', height: '30px',
    });
    const plan = planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a], [b.id, b]]));
    const out = patches(plan);

    expect(out.get('group-1')).toEqual({
      left: '20px',
      top: '30px',
      width: '140px',
      height: '40px',
    });
    expect(out.has('a')).toBe(false);
    expect(out.has('b')).toBe(false);
  });

  it('refits nested Groups from the inside out', () => {
    const outer = node(
      'group-outer',
      'root',
      { position: 'absolute', left: '10px', top: '20px', width: '200px', height: '200px' },
      { isGroup: true, children: ['group-inner', 'c'] },
    );
    const inner = node(
      'group-inner',
      'group-outer',
      { position: 'absolute', left: '20px', top: '30px', width: '80px', height: '80px' },
      { isGroup: true, children: ['a', 'b'] },
    );
    const a = node('a', 'group-inner', {
      position: 'absolute', left: '-10px', top: '0px', width: '20px', height: '20px',
    });
    const b = node('b', 'group-inner', {
      position: 'absolute', left: '40px', top: '20px', width: '20px', height: '20px',
    });
    const c = node('c', 'group-outer', {
      position: 'absolute', left: '150px', top: '100px', width: '20px', height: '20px',
    });
    const nodes = new Map([
      [outer.id, outer], [inner.id, inner], [a.id, a], [b.id, b], [c.id, c],
    ]);

    const plan = planNativeGroupRefitChain('a', nodes);
    expect(plan?.groupIds).toEqual(['group-inner', 'group-outer']);
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);

    expect(out.get('group-inner')).toMatchObject({
      left: '0px',
      top: '0px',
      width: '70px',
      height: '40px',
    });
    expect(out.get('group-outer')).toMatchObject({
      left: '20px',
      top: '50px',
      width: '160px',
      height: '90px',
    });
  });

  it('refits a flow-positioned Group when its parent-owned origin stays at local zero', () => {
    const flow = node(
      'group-flow',
      'root',
      { position: 'relative', width: '100px', height: '40px', flex: '0 0 auto' },
      { isGroup: true, children: ['a', 'b'] },
    );
    const a = node('a', 'group-flow', {
      position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px',
    });
    const b = node('b', 'group-flow', {
      position: 'absolute', left: '40px', top: '10px', width: '30px', height: '10px',
    });
    const plan = planNativeGroupRefit(flow.id, new Map([[flow.id, flow], [a.id, a], [b.id, b]]));
    const out = patches(plan);
    expect(out.get(flow.id)).toEqual({ width: '70px', height: '20px' });
    expect(out.has(a.id)).toBe(false);
    expect(out.has(b.id)).toBe(false);
    expect(out.get(flow.id)?.left).toBeUndefined();
    expect(out.get(flow.id)?.top).toBeUndefined();
  });

  it('refuses a flow Group refit that would require shifting its Auto Layout-owned origin', () => {
    const flow = node('group-flow', 'root', { position: 'relative', width: '100px', height: '40px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'group-flow', { position: 'absolute', left: '20px', top: '0px', width: '20px', height: '20px' });
    expect(planNativeGroupRefit(flow.id, new Map([[flow.id, flow], [a.id, a]]))).toBeNull();
  });

  it('still refuses transformed Group geometry rather than guessing', () => {
    const transformed = node(
      'group-transform',
      'root',
      { position: 'absolute', left: '0px', top: '0px', width: '100px', height: '40px' },
      { isGroup: true, children: ['t'] },
    );
    const t = node('t', 'group-transform', {
      position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px', transform: 'rotate(10deg)',
    });
    expect(planNativeGroupRefit(transformed.id, new Map([[transformed.id, transformed], [t.id, t]]))).toBeNull();
  });

  it('recognizes only geometry writes as refit triggers', () => {
    expect(touchesNativeGroupGeometry({ left: '20px' })).toBe(true);
    expect(touchesNativeGroupGeometry({ width: '20px', opacity: '0.5' })).toBe(true);
    expect(touchesNativeGroupGeometry({ opacity: '0.5' })).toBe(false);
  });

describe('native Group resize planning', () => {
  it('scales descendant box geometry but leaves visual/style properties alone', () => {
    const g = node('g', 'root', { position: 'absolute', left: '10px', top: '20px', width: '100px', height: '50px' }, { isGroup: true, children: ['a', 'b'] });
    const a = node('a', 'g', { position: 'absolute', left: '10px', top: '5px', width: '20px', height: '10px', fontSize: '16px' });
    const b = node('b', 'g', { position: 'absolute', left: '60px', top: '20px', width: '30px', height: '20px', filter: 'blur(2px)' });
    const snapshot = new Map([
      ['a', { left: 10, top: 5, width: 20, height: 10 }],
      ['b', { left: 60, top: 20, width: 30, height: 20 }],
    ]);
    const plan = planNativeGroupResize({ groupId: 'g', nodes: new Map([[g.id, g], [a.id, a], [b.id, b]]), snapshot, startWidth: 100, startHeight: 50, nextWidth: 200, nextHeight: 100 });
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('a')).toEqual({ left: '20px', top: '10px', width: '40px', height: '20px' });
    expect(out.get('b')).toEqual({ left: '120px', top: '40px', width: '60px', height: '40px' });
    expect(out.get('a')?.fontSize).toBeUndefined();
    expect(out.get('b')?.filter).toBeUndefined();
    expect(out.has('g')).toBe(false); // ResizeManager owns the selected wrapper commit.
  });

  it('recursively scales nested Group geometry in the same atomic plan', () => {
    const outer = node('outer', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['inner'] });
    const inner = node('inner', 'outer', { position: 'absolute', left: '10px', top: '20px', width: '40px', height: '40px' }, { isGroup: true, children: ['leaf'] });
    const leaf = node('leaf', 'inner', { position: 'absolute', left: '5px', top: '6px', width: '10px', height: '12px' });
    const snapshot = new Map([
      ['inner', { left: 10, top: 20, width: 40, height: 40 }],
      ['leaf', { left: 5, top: 6, width: 10, height: 12 }],
    ]);
    const plan = planNativeGroupResize({ groupId: 'outer', nodes: new Map([[outer.id, outer], [inner.id, inner], [leaf.id, leaf]]), snapshot, startWidth: 100, startHeight: 100, nextWidth: 150, nextHeight: 50 });
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('inner')).toEqual({ left: '15px', top: '10px', width: '60px', height: '20px' });
    expect(out.get('leaf')).toEqual({ left: '7.5px', top: '3px', width: '15px', height: '6px' });
    expect(plan?.groupIds).toEqual(['outer', 'inner']);
  });

  it('refuses incomplete snapshots instead of partially resizing a Group', () => {
    const g = node('g', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '10px', height: '10px' });
    expect(planNativeGroupResize({ groupId: 'g', nodes: new Map([[g.id, g], [a.id, a]]), snapshot: new Map(), startWidth: 100, startHeight: 100, nextWidth: 200, nextHeight: 200 })).toBeNull();
  });
});

describe('native Group Layers reparent planning', () => {
  const box = (left: number, top: number, width = 20, height = 20) => ({ left, top, width, height });

  it('enters a Group in destination-local coordinates then refits without changing world position', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '40px', height: '40px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const b = node('b', 'root', { position: 'absolute', left: '160px', top: '90px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g', 'b'] });
    const plan = planNativeGroupLayersReparent({ draggedId: 'b', newParentId: 'g', nodes: new Map([[root.id, root], [group.id, group], [a.id, a], [b.id, b]]), draggedWorld: box(160, 90), newParentWorld: box(100, 50, 40, 40), preserveDraggedGeometry: true });
    expect(plan?.moveStyles).toMatchObject({ position: 'absolute', left: '60px', top: '40px' });
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('g')).toMatchObject({ left: '100px', top: '50px', width: '80px', height: '60px' });
  });

  it('refits the source Group when a child exits', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '80px', height: '40px' }, { isGroup: true, children: ['a', 'b'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const b = node('b', 'g', { position: 'absolute', left: '60px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g'] });
    const plan = planNativeGroupLayersReparent({ draggedId: 'b', newParentId: 'root', nodes: new Map([[root.id, root], [group.id, group], [a.id, a], [b.id, b]]), draggedWorld: box(160, 50), newParentWorld: box(0, 0, 500, 500), preserveDraggedGeometry: true });
    expect(plan?.moveStyles).toMatchObject({ left: '160px', top: '50px' });
    expect(new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []).get('g')).toMatchObject({ width: '20px', height: '20px' });
  });

  it('removes an empty source Group after its final child leaves', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '20px', height: '20px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g'] });
    const plan = planNativeGroupLayersReparent({ draggedId: 'a', newParentId: 'root', nodes: new Map([[root.id, root], [group.id, group], [a.id, a]]), draggedWorld: box(100, 50), newParentWorld: box(0, 0, 500, 500), preserveDraggedGeometry: true });
    expect(plan?.removeGroupIds).toEqual(['g']);
  });

  it('refits both Group chains on Group-to-Group moves', () => {
    const g1 = node('g1', 'root', { position: 'absolute', left: '0px', top: '0px', width: '80px', height: '20px' }, { isGroup: true, children: ['a', 'b'] });
    const g2 = node('g2', 'root', { position: 'absolute', left: '200px', top: '0px', width: '20px', height: '20px' }, { isGroup: true, children: ['c'] });
    const a = node('a', 'g1', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const b = node('b', 'g1', { position: 'absolute', left: '60px', top: '0px', width: '20px', height: '20px' });
    const c = node('c', 'g2', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g1', 'g2'] });
    const plan = planNativeGroupLayersReparent({ draggedId: 'b', newParentId: 'g2', nodes: new Map([[root.id, root], [g1.id, g1], [g2.id, g2], [a.id, a], [b.id, b], [c.id, c]]), draggedWorld: box(60, 0), newParentWorld: box(200, 0), preserveDraggedGeometry: true });
    expect(plan?.groupIds).toContain('g1');
    expect(plan?.groupIds).toContain('g2');
    expect(plan?.moveStyles.left).toBe('-140px');
  });
});

});
