import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Inspector provenance provider contract', () => {
  it('exposes canonical resolution from the classic provider', () => {
    const source = read('src/editor/controls/ControlProvider.tsx');
    expect(source).toContain('getPropertyResolution: (property: string) => InspectorPropertyResolution');
    expect(source).toContain('resolvePropertyResolution({');
  });

  it('gates direct writes using the canonical resolution', () => {
    const source = read('src/editor/controls/unified/ControlProvider.tsx');
    expect(source).toContain("const directWriteAllowed = !isDirect || resolution.write.target.kind !== 'read-only'");
    expect(source).toContain('unified-control:blocked-provenance-write');
    expect(source).toContain('unified-control:blocked-provenance-write-multiple');
  });

  it('migrates Fill, Border, and Shadow to the provenance boundary', () => {
    for (const path of [
      'src/editor/tools/StylesTool/atoms/FillControl.tsx',
      'src/editor/tools/StylesTool/atoms/BorderControl.tsx',
      'src/editor/tools/StylesTool/atoms/ShadowControl.tsx',
    ]) {
      expect(read(path)).toContain('<InspectorProvenanceBoundary>');
    }
  });
});
