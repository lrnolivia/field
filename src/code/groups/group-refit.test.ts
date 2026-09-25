import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import {
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

  it('refuses transformed or flow-positioned Groups rather than guessing', () => {
    const flow = node(
      'group-flow',
      'root',
      { position: 'relative', width: '100px', height: '40px' },
      { isGroup: true, children: ['a'] },
    );
    const a = node('a', 'group-flow', {
      position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px',
    });
    expect(planNativeGroupRefit(flow.id, new Map([[flow.id, flow], [a.id, a]]))).toBeNull();

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
});
