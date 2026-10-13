import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Gallery contextual Media', () => {
  it('keeps Gallery add/replace Media inline in the inspector', () => {
    const gallery = read('src/editor/tools/GalleryTool.tsx');
    expect(gallery).toContain("data-contextual-media-picker={replaceItemId ? 'gallery-replace' : 'gallery-add'}");
    expect(gallery).toContain('<ImageSearchModal');
    expect(gallery).toContain('embedded');
    expect(gallery).toContain('compact');
    expect(gallery).toContain("selectionMode={replaceItemId ? 'single' : 'multiple'}");
  });

  it('maps Gallery Add to multi-select and Replace to single-select', () => {
    const gallery = read('src/editor/tools/GalleryTool.tsx');
    expect(gallery).toContain("onAddMedia={() => { setReplaceItemId(null); setPickerOpen(true); }}");
    expect(gallery).toContain("onReplaceItem={(itemId) => { selectItem(itemId); setReplaceItemId(itemId); setPickerOpen(true); }}");
    expect(gallery).toContain('onSelectMany={addMedia}');
  });

  it('does not mount the gallery image picker as a standalone modal surface', () => {
    const gallery = read('src/editor/tools/GalleryTool.tsx');
    const picker = gallery.slice(gallery.indexOf('data-contextual-media-picker'), gallery.indexOf('<ToolDivider />', gallery.indexOf('data-contextual-media-picker')));
    expect(picker).toContain('embedded');
    expect(picker).toContain('compact');
  });
});
