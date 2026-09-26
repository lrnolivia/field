import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import {
  planNativeGroupDeletionCleanup,
  planNativeGroupLayersReparent,
  planNativeGroupResize,
  planNativeGroupRefit,
  planNativeGroupRefitChain,
  resolveNativeGroupResizeAffineFromCorners,
  touchesNativeGroupGeometry,
  type NativeGroupResizeSnapshot,
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

  describe('refits exact 2D affine child transforms', () => {
    it('shrink-wraps a rotated child around its visual AABB without changing rotation', () => {
      const group = node(
        'group-transform',
        'root',
        { position: 'absolute', left: '100px', top: '80px', width: '100px', height: '40px' },
        { isGroup: true, children: ['t'] },
      );
      const t = node('t', 'group-transform', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '40px',
        height: '20px',
        transform: 'rotate(90deg)',
      });

      const plan = planNativeGroupRefit(group.id, new Map([[group.id, group], [t.id, t]]));
      const out = patches(plan);
      expect(out.get(group.id)).toEqual({
        left: '110px',
        top: '70px',
        width: '20px',
        height: '40px',
      });
      expect(out.get(t.id)).toEqual({ left: '-10px', top: '10px' });
      expect(out.get(t.id)?.transform).toBeUndefined();
    });

    it('honors scale, translation percentages and an authored transform origin', () => {
      const group = node(
        'g',
        'root',
        { position: 'absolute', left: '0px', top: '0px', width: '200px', height: '100px' },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute',
        left: '10px',
        top: '20px',
        width: '40px',
        height: '20px',
        transform: 'translateX(50%) scale(2, 0.5)',
        transformOrigin: '0% 0%',
      });
      const plan = planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]]));
      const out = patches(plan);

      // CSS transform list matrix = translateX(20) * scale(2,.5):
      // visual box = x 30..110, y 20..30.
      expect(out.get(group.id)).toEqual({
        left: '30px',
        top: '20px',
        width: '80px',
        height: '10px',
      });
      expect(out.get(a.id)).toEqual({ left: '-20px', top: '0px' });
    });

    it('supports authored affine matrix transforms', () => {
      const group = node(
        'g',
        'root',
        { position: 'absolute', left: '10px', top: '10px', width: '100px', height: '100px' },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '20px',
        height: '10px',
        transform: 'matrix(1, 0, 0.5, 1, 5, 0)',
        transformOrigin: '0px 0px',
      });
      const plan = planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]]));
      const out = patches(plan);
      expect(out.get(group.id)).toEqual({
        left: '15px',
        top: '10px',
        width: '25px',
        height: '10px',
      });
      expect(out.get(a.id)).toEqual({ left: '-5px', top: '0px' });
    });

    it('refits nested Group chains after a rotated leaf changes', () => {
      const outer = node(
        'outer',
        'root',
        { position: 'absolute', left: '100px', top: '100px', width: '200px', height: '200px' },
        { isGroup: true, children: ['inner'] },
      );
      const inner = node(
        'inner',
        'outer',
        { position: 'absolute', left: '20px', top: '30px', width: '100px', height: '100px' },
        { isGroup: true, children: ['leaf'] },
      );
      const leaf = node('leaf', 'inner', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '40px',
        height: '20px',
        rotate: '90',
      });
      const plan = planNativeGroupRefitChain(
        leaf.id,
        new Map([[outer.id, outer], [inner.id, inner], [leaf.id, leaf]]),
      );
      expect(plan?.groupIds).toEqual(['inner', 'outer']);
      const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
      expect(out.get(inner.id)).toMatchObject({ width: '20px', height: '40px' });
      expect(out.get(outer.id)).toMatchObject({ width: '20px', height: '40px' });
    });

    it('keeps perspective/3D geometry gated instead of flattening it', () => {
      const group = node(
        'g',
        'root',
        { position: 'absolute', left: '0px', top: '0px', width: '100px', height: '100px' },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '20px',
        height: '20px',
        transform: 'perspective(500px) rotateY(30deg)',
      });
      expect(planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]]))).toBeNull();
    });

    it('refits an absolute transformed Group wrapper while preserving its painted child geometry', () => {
      const group = node(
        'g',
        'root',
        {
          position: 'absolute',
          left: '100px',
          top: '50px',
          width: '100px',
          height: '80px',
          transform: 'rotate(90deg)',
        },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute', left: '20px', top: '10px', width: '40px', height: '20px',
      });
      const out = patches(planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]])));
      // Old painted child AABB is x=160..180, y=60..100. After the local
      // 20/10 rebase, the wrapper moves to 150/70 so those world coordinates
      // remain identical even though the default transform origin changes.
      expect(out.get(group.id)).toEqual({
        left: '150px',
        top: '70px',
        width: '40px',
        height: '20px',
      });
      expect(out.get(a.id)).toEqual({ left: '0px', top: '0px' });
    });

    it('compensates percentage transform translations when wrapper dimensions change', () => {
      const group = node(
        'g',
        'root',
        {
          position: 'absolute',
          left: '10px',
          top: '20px',
          width: '200px',
          height: '100px',
          transform: 'translate(50%, 25%) scale(2, 1)',
          transformOrigin: '0px 0px',
        },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute', left: '20px', top: '10px', width: '40px', height: '20px',
      });
      const out = patches(planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]])));
      // translate(50%,25%) changes from 100/25px to 20/5px as the Group
      // shrink-wraps from 200x100 to 40x20. left/top absorb that 80/20 delta.
      expect(out.get(group.id)).toEqual({
        left: '130px',
        top: '50px',
        width: '40px',
        height: '20px',
      });
      expect(out.get(a.id)).toEqual({ left: '0px', top: '0px' });
    });

    it('propagates a transformed nested Group through the ancestor chain without moving painted geometry', () => {
      const outer = node(
        'outer',
        'root',
        { position: 'absolute', left: '0px', top: '0px', width: '300px', height: '200px' },
        { isGroup: true, children: ['inner'] },
      );
      const inner = node(
        'inner',
        'outer',
        {
          position: 'absolute',
          left: '100px',
          top: '50px',
          width: '100px',
          height: '80px',
          transform: 'rotate(90deg)',
        },
        { isGroup: true, children: ['leaf'] },
      );
      const leaf = node('leaf', 'inner', {
        position: 'absolute', left: '20px', top: '10px', width: '40px', height: '20px',
      });

      const plan = planNativeGroupRefitChain(
        leaf.id,
        new Map([[outer.id, outer], [inner.id, inner], [leaf.id, leaf]]),
      );
      expect(plan?.groupIds).toEqual(['inner', 'outer']);
      const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);

      // Inner refit alone moves its layout origin to 150/70 and becomes 40x20.
      // Its transformed painted AABB remains x=160..180, y=60..100. The outer
      // Group therefore shrink-wraps to exactly that AABB (160/60, 20x40), then
      // rebases inner to -10/10 in the new outer-local space. Adding the outer
      // 160/60 offset returns the same painted world coordinates.
      expect(out.get(outer.id)).toEqual({
        left: '160px',
        top: '60px',
        width: '20px',
        height: '40px',
      });
      expect(out.get(inner.id)).toEqual({
        left: '-10px',
        top: '10px',
        width: '40px',
        height: '20px',
      });
      expect(out.get(leaf.id)).toEqual({ left: '0px', top: '0px' });
    });

    it('keeps transformed flow Group wrappers gated', () => {
      const group = node(
        'g',
        'root',
        { position: 'relative', width: '100px', height: '100px', transform: 'rotate(10deg)' },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px',
      });
      expect(planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]]))).toBeNull();
    });

    it('keeps perspective/3D Group wrappers gated', () => {
      const group = node(
        'g',
        'root',
        {
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '100px',
          height: '100px',
          transform: 'perspective(500px) rotateY(30deg)',
        },
        { isGroup: true, children: ['a'] },
      );
      const a = node('a', 'g', {
        position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px',
      });
      expect(planNativeGroupRefit(group.id, new Map([[group.id, group], [a.id, a]]))).toBeNull();
    });
  });

  it('recognizes box and transform writes as derived-bounds triggers', () => {
    expect(touchesNativeGroupGeometry({ left: '20px' })).toBe(true);
    expect(touchesNativeGroupGeometry({ width: '20px', opacity: '0.5' })).toBe(true);
    expect(touchesNativeGroupGeometry({ rotate: '30' })).toBe(true);
    expect(touchesNativeGroupGeometry({ scaleX: '1.2' })).toBe(true);
    expect(touchesNativeGroupGeometry({ x: '10px' })).toBe(true);
    expect(touchesNativeGroupGeometry({ transformOrigin: '0% 0%' })).toBe(true);
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

  it('supports exact proportional resize with transformed descendants', () => {
    const g = node('g', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', {
      position: 'absolute',
      left: '10px',
      top: '20px',
      width: '30px',
      height: '40px',
      transform: 'rotate(30deg)',
      boxShadow: '0 0 4px #000',
    });
    const snapshot = new Map([
      ['a', { left: 10, top: 20, width: 30, height: 40, transformed: true }],
    ]);
    const plan = planNativeGroupResize({
      groupId: 'g',
      nodes: new Map([[g.id, g], [a.id, a]]),
      snapshot,
      startWidth: 100,
      startHeight: 100,
      nextWidth: 150,
      nextHeight: 150,
    });
    const patch = plan?.patches.find((p) => p.nodeId === 'a')?.styles;
    expect(patch).toEqual({
      left: '15px',
      top: '30px',
      width: '45px',
      height: '60px',
    });
    expect(patch?.transform).toBeUndefined();
    expect(patch?.boxShadow).toBeUndefined();
  });

  it('supports exact non-uniform resize with transformed descendants', () => {
    const g = node('g', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', {
      position: 'absolute',
      left: '10px',
      top: '20px',
      width: '20px',
      height: '10px',
      transform: 'rotate(90deg)',
      boxShadow: '0 0 4px #000',
    });
    const snapshot: NativeGroupResizeSnapshot = new Map([
      ['a', {
        left: 10, top: 20, width: 20, height: 10, transformed: true,
        affine: { a: 0, b: 1, c: -1, d: 0, e: 15, f: -5 },
      }],
    ]);
    const plan = planNativeGroupResize({
      groupId: 'g',
      nodes: new Map([[g.id, g], [a.id, a]]),
      snapshot,
      startWidth: 100,
      startHeight: 100,
      nextWidth: 200,
      nextHeight: 100,
    });
    const patch = plan?.patches.find((p) => p.nodeId === 'a')?.styles;
    expect(patch).toMatchObject({
      left: '20px', top: '20px', width: '40px', height: '10px',
      transform: 'matrix(0, 0.5, -2, 0, 30, -5)',
      transformOrigin: '0px 0px', transformBox: 'border-box',
    });
    expect(patch?.boxShadow).toBeUndefined();
  });

  it('affine-conjugates transformed nested Groups while scaling nested child boxes once', () => {
    const outer = node('outer', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['inner'] });
    const inner = node('inner', 'outer', {
      position: 'absolute', left: '10px', top: '20px', width: '40px', height: '40px', transform: 'rotate(90deg)',
    }, { isGroup: true, children: ['leaf'] });
    const leaf = node('leaf', 'inner', { position: 'absolute', left: '5px', top: '6px', width: '10px', height: '12px' });
    const snapshot: NativeGroupResizeSnapshot = new Map([
      ['inner', {
        left: 10, top: 20, width: 40, height: 40, transformed: true,
        affine: { a: 0, b: 1, c: -1, d: 0, e: 40, f: 0 },
      }],
      ['leaf', { left: 5, top: 6, width: 10, height: 12 }],
    ]);
    const plan = planNativeGroupResize({
      groupId: 'outer', nodes: new Map([[outer.id, outer], [inner.id, inner], [leaf.id, leaf]]), snapshot,
      startWidth: 100, startHeight: 100, nextWidth: 200, nextHeight: 50,
    });
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('inner')).toMatchObject({
      left: '20px', top: '10px', width: '80px', height: '20px',
      transform: 'matrix(0, 0.25, -4, 0, 80, 0)',
    });
    expect(out.get('leaf')).toEqual({ left: '10px', top: '3px', width: '20px', height: '6px' });
  });

  it('canonicalizes base motion transform channels but refuses transform-bearing variants', () => {
    const g = node('g', 'root', { position: 'absolute', width: '100px', height: '100px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'g', {
      position: 'absolute', left: '10px', top: '20px', width: '20px', height: '10px', rotate: '90',
    });
    const snapshot: NativeGroupResizeSnapshot = new Map([
      ['a', {
        left: 10, top: 20, width: 20, height: 10, transformed: true,
        affine: { a: 0, b: 1, c: -1, d: 0, e: 15, f: -5 },
      }],
    ]);
    const plan = planNativeGroupResize({
      groupId: 'g', nodes: new Map([[g.id, g], [a.id, a]]), snapshot,
      startWidth: 100, startHeight: 100, nextWidth: 200, nextHeight: 100,
    });
    expect(plan?.patches.find((p) => p.nodeId === 'a')?.styles).toMatchObject({
      transform: 'matrix(0, 0.5, -2, 0, 30, -5)', rotate: '',
    });

    const variant = node('a', 'g', {
      position: 'absolute', left: '10px', top: '20px', width: '20px', height: '10px', transform: 'rotate(90deg)',
    }, { motionVariants: { hover: { rotate: '45' } } as any });
    expect(planNativeGroupResize({
      groupId: 'g', nodes: new Map([[g.id, g], [variant.id, variant]]), snapshot,
      startWidth: 100, startHeight: 100, nextWidth: 200, nextHeight: 100,
    })).toBeNull();
  });

  it('recovers child affine in a rotated parent basis instead of using world AABBs', () => {
    const affine = resolveNativeGroupResizeAffineFromCorners({
      childWorldCorners: {
        TL: { x: 160, y: 90 }, TR: { x: 200, y: 90 },
        BR: { x: 200, y: 110 }, BL: { x: 160, y: 110 },
      },
      parentWorldCorners: {
        TL: { x: 190, y: 40 }, TR: { x: 190, y: 140 },
        BR: { x: 110, y: 140 }, BL: { x: 110, y: 40 },
      },
      parentLocalWidth: 100,
      parentLocalHeight: 80,
      childBox: { left: 50, top: 30, width: 40, height: 20 },
    });
    expect(affine).toEqual({ a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 });
  });
});

describe('native Group deletion cleanup planning', () => {
  it('refits a surviving Group after one child is deleted', () => {
    const g = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '80px', height: '20px' }, { isGroup: true, children: ['a', 'b'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const b = node('b', 'g', { position: 'absolute', left: '60px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g'] });

    const plan = planNativeGroupDeletionCleanup(['b'], new Map([[root.id, root], [g.id, g], [a.id, a], [b.id, b]]));
    expect(plan?.removeGroupIds).toEqual([]);
    expect(new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []).get('g')).toMatchObject({
      left: '100px',
      top: '50px',
      width: '20px',
      height: '20px',
    });
  });

  it('recursively removes empty Group ancestors after the last descendant is deleted', () => {
    const outer = node('outer', 'root', { position: 'absolute', left: '10px', top: '10px', width: '20px', height: '20px' }, { isGroup: true, children: ['inner'] });
    const inner = node('inner', 'outer', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' }, { isGroup: true, children: ['leaf'] });
    const leaf = node('leaf', 'inner', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['outer'] });

    const plan = planNativeGroupDeletionCleanup(['leaf'], new Map([[root.id, root], [outer.id, outer], [inner.id, inner], [leaf.id, leaf]]));
    expect(plan?.removeGroupIds).toEqual(['inner', 'outer']);
    expect(plan?.patches).toEqual([]);
  });

  it('plans multi-delete from the final sibling set', () => {
    const g = node('g', 'root', { position: 'absolute', left: '0px', top: '0px', width: '120px', height: '20px' }, { isGroup: true, children: ['a', 'b', 'c'] });
    const a = node('a', 'g', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const b = node('b', 'g', { position: 'absolute', left: '40px', top: '0px', width: '20px', height: '20px' });
    const c = node('c', 'g', { position: 'absolute', left: '100px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['g'] });

    const plan = planNativeGroupDeletionCleanup(['a', 'c'], new Map([[root.id, root], [g.id, g], [a.id, a], [b.id, b], [c.id, c]]));
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('g')).toEqual({ left: '40px', top: '0px', width: '20px', height: '20px' });
    expect(out.get('b')).toEqual({ left: '0px', top: '0px' });
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

  it('recursively removes empty Group ancestors when the final nested child leaves', () => {
    const outer = node('outer', 'root', { position: 'absolute', left: '100px', top: '50px', width: '20px', height: '20px' }, { isGroup: true, children: ['inner'] });
    const inner = node('inner', 'outer', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' }, { isGroup: true, children: ['a'] });
    const a = node('a', 'inner', { position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px' });
    const root = node('root', null, {}, { children: ['outer'] });
    const plan = planNativeGroupLayersReparent({
      draggedId: 'a',
      newParentId: 'root',
      nodes: new Map([[root.id, root], [outer.id, outer], [inner.id, inner], [a.id, a]]),
      draggedWorld: box(100, 50),
      newParentWorld: box(0, 0, 500, 500),
      preserveDraggedGeometry: true,
    });
    expect(plan?.removeGroupIds).toEqual(['inner', 'outer']);
    expect(plan?.moveStyles).toMatchObject({ left: '100px', top: '50px' });
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

  it('enters a rotated absolute Group through an exact inverse world-to-local affine', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '100px', height: '80px', transform: 'rotate(90deg)' }, { isGroup: true, children: [] });
    const b = node('b', 'root', { position: 'absolute', left: '160px', top: '90px', width: '40px', height: '20px' });
    const root = node('root', null, { position: 'relative', width: '500px', height: '500px' }, { children: ['g', 'b'] });
    const plan = planNativeGroupLayersReparent({
      draggedId: 'b', newParentId: 'g',
      nodes: new Map([[root.id, root], [group.id, group], [b.id, b]]),
      draggedWorld: box(160, 90, 40, 20),
      newParentWorld: box(110, 40, 80, 100),
      draggedWorldCorners: { TL: { x: 160, y: 90 }, TR: { x: 200, y: 90 }, BR: { x: 200, y: 110 }, BL: { x: 160, y: 110 } },
      newParentWorldCorners: { TL: { x: 190, y: 40 }, TR: { x: 190, y: 140 }, BR: { x: 110, y: 140 }, BL: { x: 110, y: 40 } },
      newParentLocalSize: { width: 100, height: 80 },
      preserveDraggedGeometry: true,
    });
    expect(plan?.moveStyles).toMatchObject({
      position: 'absolute', left: '50px', top: '30px',
      transform: 'matrix(0, -1, 1, 0, 0, 0)', transformOrigin: '0px 0px', transformBox: 'border-box',
    });
    const out = new Map(plan?.patches.map((p) => [p.nodeId, p.styles]) ?? []);
    expect(out.get('b')).toMatchObject({ left: '0px', top: '40px' });
    expect(out.get('g')).toMatchObject({ left: '170px', top: '80px', width: '20px', height: '40px' });
  });

  it('exits a rotated Group without collapsing the child to its world AABB origin', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '100px', height: '80px', transform: 'rotate(90deg)' }, { isGroup: true, children: ['a', 'b'] });
    const a = node('a', 'g', { position: 'absolute', left: '20px', top: '10px', width: '40px', height: '20px' });
    const b = node('b', 'g', { position: 'absolute', left: '70px', top: '50px', width: '20px', height: '20px' });
    const root = node('root', null, { position: 'relative', width: '500px', height: '500px' }, { children: ['g'] });
    const plan = planNativeGroupLayersReparent({
      draggedId: 'a', newParentId: 'root',
      nodes: new Map([[root.id, root], [group.id, group], [a.id, a], [b.id, b]]),
      draggedWorld: box(160, 60, 20, 40),
      newParentWorld: box(0, 0, 500, 500),
      draggedWorldCorners: { TL: { x: 180, y: 60 }, TR: { x: 180, y: 100 }, BR: { x: 160, y: 100 }, BL: { x: 160, y: 60 } },
      newParentWorldCorners: { TL: { x: 0, y: 0 }, TR: { x: 500, y: 0 }, BR: { x: 500, y: 500 }, BL: { x: 0, y: 500 } },
      newParentLocalSize: { width: 500, height: 500 },
      preserveDraggedGeometry: true,
    });
    expect(plan?.moveStyles).toMatchObject({
      left: '180px', top: '60px', transform: 'matrix(0, 1, -1, 0, 0, 0)', transformOrigin: '0px 0px',
    });
  });

  it('canonicalizes a base motion rotate channel when a transformed child exits a Group', () => {
    const group = node('g', 'root', { position: 'absolute', left: '100px', top: '50px', width: '100px', height: '80px' }, { isGroup: true, children: ['a', 'b'] });
    const a = node('a', 'g', { position: 'absolute', left: '20px', top: '10px', width: '40px', height: '20px', rotate: '90' });
    const b = node('b', 'g', { position: 'absolute', left: '70px', top: '50px', width: '20px', height: '20px' });
    const root = node('root', null, { position: 'relative', width: '500px', height: '500px' }, { children: ['g'] });
    const plan = planNativeGroupLayersReparent({
      draggedId: 'a', newParentId: 'root',
      nodes: new Map([[root.id, root], [group.id, group], [a.id, a], [b.id, b]]),
      draggedWorld: box(130, 50, 20, 40),
      newParentWorld: box(0, 0, 500, 500),
      draggedWorldCorners: { TL: { x: 150, y: 50 }, TR: { x: 150, y: 90 }, BR: { x: 130, y: 90 }, BL: { x: 130, y: 50 } },
      newParentWorldCorners: { TL: { x: 0, y: 0 }, TR: { x: 500, y: 0 }, BR: { x: 500, y: 500 }, BL: { x: 0, y: 500 } },
      newParentLocalSize: { width: 500, height: 500 },
      preserveDraggedGeometry: true,
    });
    expect(plan?.moveStyles).toMatchObject({
      left: '150px', top: '50px', transform: 'matrix(0, 1, -1, 0, 0, 0)', rotate: '',
    });
  });

  it('keeps transformed flow Groups and perspective Group wrappers gated in Layers', () => {
    const root = node('root', null, { position: 'relative', width: '500px', height: '500px' }, { children: ['flow', 'perspective', 'a'] });
    const a = node('a', 'root', { position: 'absolute', left: '20px', top: '20px', width: '20px', height: '20px' });
    const flow = node('flow', 'root', { position: 'relative', width: '100px', height: '80px', transform: 'rotate(10deg)' }, { isGroup: true, children: [] });
    const perspective = node('perspective', 'root', { position: 'absolute', left: '0px', top: '0px', width: '100px', height: '80px', transform: 'perspective(400px) rotateY(20deg)' }, { isGroup: true, children: [] });
    const shared = {
      draggedId: 'a', nodes: new Map([[root.id, root], [a.id, a], [flow.id, flow], [perspective.id, perspective]]),
      draggedWorld: box(20, 20), newParentWorld: box(0, 0, 100, 80), preserveDraggedGeometry: true,
    };
    expect(planNativeGroupLayersReparent({ ...shared, newParentId: 'flow' })).toBeNull();
    expect(planNativeGroupLayersReparent({ ...shared, newParentId: 'perspective' })).toBeNull();
  });
});

});
