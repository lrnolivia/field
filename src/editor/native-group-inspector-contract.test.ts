import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

describe('native Group inspector contract', () => {
  it('classifies a native Group independently from Frame semantics', () => {
    const panel = read('src/editor/PropertiesPanel.tsx');

    expect(panel).toContain('const isNativeGroup = node.isGroup === true');
    expect(panel).toContain('const isFrame = !isNativeGroup');
    expect(panel).toContain("? 'Group'");
    expect(panel).toContain('{isNativeGroup ? (');

    const groupBranchStart = panel.indexOf('{isNativeGroup ? (');
    const nextBranch = panel.indexOf(') : isVectorVariantCard ? (', groupBranchStart);
    const groupBranch = panel.slice(groupBranchStart, nextBranch);

    expect(groupBranch).toContain('positionAndSizeTools');
    expect(groupBranch).toContain('<ExportTool />');
    expect(groupBranch).not.toContain('<LayoutTool');
    expect(groupBranch).not.toContain('<StylesTool');
  });

  it('keeps native Group dimensions fixed and planner-backed', () => {
    const size = read('src/editor/tools/SizeTool.tsx');
    const runtime = read('src/canvas/resize/native-group-resize-runtime.ts');

    expect(size).toContain('const isNativeGroup = !isFitInnerRedirect && node?.isGroup === true');
    expect(size).toContain('commitNativeGroupInspectorResize({ groupId: nodeId, vpId, nextWidth })');
    expect(size).toContain('commitNativeGroupInspectorResize({ groupId: nodeId, vpId, nextHeight })');
    expect(size).toContain("if (isNativeGroup) return [{ value: 'px', label: 'px' }]");
    expect(size).toContain('if (isNativeGroup) return;');

    expect(runtime).toContain('planNativeGroupResize({');
    expect(runtime).toContain('skipGroupRefit: true');
    expect(runtime).not.toContain('injectFlexLayoutOnFrame');
  });

  it('routes direct drag position commits through native Group derived-bounds refit', () => {
    const nodeOps = read('src/canvas/node-ops.ts');

    expect(nodeOps).toContain('function refitNativeGroupAfterGeometryWrite');
    expect(nodeOps).toContain('planNativeGroupRefitChain(args.id, getCachedNodesMap())');

    const dragStart = nodeOps.indexOf('export function commitDragPosition');
    const dragEnd = nodeOps.indexOf('/**\n * Move/reorder a node', dragStart);
    const dragBody = nodeOps.slice(dragStart, dragEnd);

    expect(dragBody).toContain("queueMutation({ type: 'updateStyles', nodeId: id, styles: posStyles });");
    expect(dragBody).toContain('refitNativeGroupAfterGeometryWrite({');
  });
});
