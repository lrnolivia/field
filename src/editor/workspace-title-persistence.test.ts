import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('workspace title persistence', () => {
  it('uses one persistent title surface across layout presentations', () => {
    const header = read('src/editor/header/LeftHeader.tsx');
    const restore = read('src/editor/WorkspaceRestoreBar.tsx');
    expect(header).toContain('data-title-presentation={titlePresentation}');
    expect(header).toContain('fullTitle ? LEFT_RAIL_WIDTH + leftContentWidth : leftContentWidth');
    expect(header).not.toContain('aria-hidden={headerVisible');
    expect(restore).toContain('return null;');
    expect(restore).not.toContain('<ProjectChip');
  });

  it('keeps project identity memoized against layout-only parent renders', () => {
    const chip = read('src/editor/header/ProjectChip.tsx');
    expect(chip).toContain('import { memo,');
    expect(chip).toContain('export default memo(ProjectChip);');
  });
});
