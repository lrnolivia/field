// FIGUI3_SEARCH_SURFACE_CONTRACT_TEST_20260926
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('field searchable-surface rule', () => {
  it('defines one canonical minimal SearchBar rule', () => {
    const search = read('src/design-system/SearchBar.tsx');
    expect(search).toContain('FIELD_SEARCH_SURFACE_RULE_20260926');
    expect(search).toContain('data-field-searchbar');
    expect(search).toContain('dynamic, user-generated, or meaningfully long inventories');
    expect(search).toContain('short fixed command menus / tiny radio sets should NOT add search');
  });

  it('keeps growing Library and Media inventories searchable', () => {
    const library = read('src/editor/left-toolbar/panels/LibraryPanel/index.tsx');
    const media = read('src/editor/left-toolbar/panels/MediaGalleryPanel.tsx');
    expect(library).toContain("import SearchBar from '@/design-system/SearchBar'");
    expect(library).toContain('<SearchBar');
    expect(media).toContain("import SearchBar from '@/design-system/SearchBar'");
    expect(media).toContain('<SearchBar');
    expect(media).toContain('filteredUploads');
  });

  it('keeps Insert searchable while tiny Resources menu stays intentionally search-free', () => {
    const insert = read('src/editor/left-toolbar/panels/insert/index.tsx');
    const toolbar = read('src/editor/BottomToolbar.tsx');
    expect(insert).toContain('placeholder="Search elements…"');
    const resourcesStart = toolbar.indexOf('function ResourcesMenu()');
    const resourcesEnd = toolbar.indexOf('// ─── Main BottomToolbar', resourcesStart);
    const resources = toolbar.slice(resourcesStart, resourcesEnd);
    expect(resources).not.toContain('<SearchBar');
    expect(resources).toContain('label="Components"');
    expect(resources).toContain('label="Media gallery"');
  });
});
