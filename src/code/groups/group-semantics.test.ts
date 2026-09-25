import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { parseJSXToNodes } from '@/code/parsing/parser';
import { applyRuntimeGuarantees } from '@/code/generation/runtime-guarantees';
import { addCanvasNodeInCode } from '@/code/generation/generator-crud';
import { canGroupSelection, canUngroupNode } from './group-semantics';

function node(
  id: string,
  parentId: string | null,
  extra: Partial<CanvasNode> = {},
): CanvasNode {
  return {
    id,
    type: 'div',
    name: id,
    parentId,
    children: [],
    styles: { position: 'relative' },
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

describe('native Group semantics', () => {
  it('requires coherent sibling selections', () => {
    const nodes = new Map<string, CanvasNode>([
      ['parent', node('parent', null)],
      ['a', node('a', 'parent')],
      ['b', node('b', 'parent')],
      ['c', node('c', 'other')],
    ]);

    expect(canGroupSelection(['a', 'b'], nodes)).toBe(true);
    expect(canGroupSelection(['a'], nodes)).toBe(false);
    expect(canGroupSelection(['a', 'c'], nodes)).toBe(false);
  });

  it('allows free-canvas siblings and rejects instance internals', () => {
    const nodes = new Map<string, CanvasNode>([
      ['a', node('a', null, { isCanvasNode: true })],
      ['b', node('b', null, { isCanvasNode: true })],
      ['i1', node('i1', 'instance-root', { componentInstanceId: 'instance-1' })],
      ['i2', node('i2', 'instance-root', { componentInstanceId: 'instance-1' })],
    ]);

    expect(canGroupSelection(['a', 'b'], nodes)).toBe(true);
    expect(canGroupSelection(['i1', 'i2'], nodes)).toBe(false);
  });

  it('parses the source marker as a first-class Group node', () => {
    const code = `
      export default function Page() {
        return (
          <div data-id="root" style={{ position: 'relative' }}>
            <div
              data-id="group-1"
              data-name="Group"
              data-field-group="true"
              style={{ position: 'relative', width: '100px', height: '50px' }}
            >
              <div data-id="a" style={{ position: 'absolute', left: '0px', top: '0px', width: '10px', height: '10px' }} />
              <div data-id="b" style={{ position: 'absolute', left: '40px', top: '20px', width: '10px', height: '10px' }} />
            </div>
          </div>
        );
      }
    `;
    const nodes = parseJSXToNodes(code);
    const group = nodes.get('group-1');
    expect(group?.isGroup).toBe(true);
    expect(group?.attrs['data-field-group']).toBe('true');
    expect(group?.children).toEqual(['a', 'b']);
    expect(canUngroupNode(group)).toBe(true);
  });

  it('keeps a Group as one outer auto-layout item', () => {
    const code = `
      export default function Page() {
        return (
          <div data-id="root" style={{ position: 'relative', display: 'flex' }}>
            <div data-id="group-1" data-field-group="true" style={{ position: 'relative', width: '100px', height: '40px' }}>
              <div data-id="a" style={{ position: 'absolute', left: '0px', top: '0px', width: '10px', height: '10px' }} />
              <div data-id="b" style={{ position: 'absolute', left: '50px', top: '0px', width: '10px', height: '10px' }} />
            </div>
            <div data-id="sibling" style={{ position: 'relative', width: '20px', height: '20px' }} />
          </div>
        );
      }
    `;
    const out = applyRuntimeGuarantees(code);
    const groupStart = out.indexOf('data-id="group-1"');
    const childStart = out.indexOf('data-id="a"');
    const groupOpen = out.slice(groupStart, childStart);
    expect(groupOpen).toContain("order: '0'");
    expect(groupOpen).toContain("flex: '0 0 auto'");
  });

  it('supports indexed insertion in the free-canvas fragment', () => {
    const code = `
      export default function Page() { return <div data-id="root" style={{ position: 'relative' }} />; }
      const canvasNodes = (<>
        <div data-id="a" data-canvas-node="true" style={{ position: 'absolute', left: '0px', top: '0px', width: '10px', height: '10px' }} />
        <div data-id="b" data-canvas-node="true" style={{ position: 'absolute', left: '20px', top: '0px', width: '10px', height: '10px' }} />
      </>);
    `;
    const out = addCanvasNodeInCode(code, {
      id: 'group-1',
      type: 'div',
      name: 'Group',
      attrs: { 'data-field-group': 'true' },
      styles: { position: 'absolute', left: '0px', top: '0px', width: '30px', height: '10px' },
    }, 1);

    expect(out.indexOf('data-id="a"')).toBeLessThan(out.indexOf('data-id="group-1"'));
    expect(out.indexOf('data-id="group-1"')).toBeLessThan(out.indexOf('data-id="b"'));
  });
});
