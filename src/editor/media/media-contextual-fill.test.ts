import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('contextual Media in image Fill', () => {
  it('routes image replacement through the inspector ToolPopup Media stack', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    const start = fill.indexOf('function ImageFillTab');
    const end = fill.indexOf('function extractUrl', start);
    const imageFill = fill.slice(start, end);

    expect(imageFill).toContain("pushPanel('Media'");
    expect(imageFill).toContain('data-contextual-media-picker="fill-image"');
    expect(imageFill).toContain('<ImageSearchModal');
    expect(imageFill).toContain('embedded');
    expect(imageFill).toContain('compact');
    expect(imageFill).toContain('onClose={() => popPanel()}');
    expect(imageFill).not.toContain('imageModalOpen');
    expect(imageFill).not.toContain('setImageModalOpen');
  });

  it('uses the compact Media row instead of the legacy giant dashed chooser', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    const start = fill.indexOf('function ImageFillTab');
    const end = fill.indexOf('function extractUrl', start);
    const imageFill = fill.slice(start, end);

    expect(imageFill).toContain('Choose media');
    expect(imageFill).toContain('h-9 flex items-center gap-2');
    expect(imageFill).not.toContain('w-full h-20');
    expect(imageFill).not.toContain('border-2 border-dashed');
  });

  it('preserves the authored image fit properties when Media replaces the fill', () => {
    const fill = read('src/editor/tools/StylesTool/atoms/FillControl.tsx');
    const start = fill.indexOf('const applyImageUrl');
    const end = fill.indexOf('const openMedia', start);
    const apply = fill.slice(start, end);

    expect(apply).toContain("onUpdate('backgroundImage'");
    expect(apply).toContain("onUpdate('backgroundSize', styles.backgroundSize || 'cover')");
    expect(apply).toContain("onUpdate('backgroundPosition', styles.backgroundPosition || 'center')");
    expect(apply).toContain("onUpdate('backgroundRepeat', styles.backgroundRepeat || 'no-repeat')");
  });
});
