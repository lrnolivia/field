import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Content Media fields', () => {
  it('uses a compact Media row for CMS image fields', () => {
    const field = read('src/editor/left-toolbar/panels/cms/FieldControl.tsx');
    const start = field.indexOf('function ImageFieldControl');
    const end = field.indexOf('// ─── Tags Field', start);
    const image = field.slice(start, end);

    expect(image).toContain('Choose media');
    expect(image).toContain('aria-expanded={pickerOpen}');
    expect(image).toContain('h-6 w-6');
    expect(image).toContain("hasImage ? 'Change' : 'Image'");
    expect(image).not.toContain('w-16 h-16');
    expect(image).not.toContain('rounded-full');
  });

  it('keeps CMS image selection inline and contextual', () => {
    const field = read('src/editor/left-toolbar/panels/cms/FieldControl.tsx');
    const start = field.indexOf('function ImageFieldControl');
    const end = field.indexOf('// ─── Tags Field', start);
    const image = field.slice(start, end);

    expect(image).toContain('data-contextual-media-picker="cms-image-field"');
    expect(image).toContain('<ImageSearchModal');
    expect(image).toContain('embedded');
    expect(image).toContain('compact');
    expect(image).toContain('pickerOpen &&');
    expect(image).not.toContain('isOpen={pickerOpen}');
  });

  it('continues to store bare URLs for CMS image values', () => {
    const field = read('src/editor/left-toolbar/panels/cms/FieldControl.tsx');
    const start = field.indexOf('function ImageFieldControl');
    const end = field.indexOf('// ─── Tags Field', start);
    const image = field.slice(start, end);

    expect(image).toContain('onChange(picked)');
    expect(image).toContain('CMS image fields');
  });
});
