import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const read = (file: string) => readFileSync(file, 'utf8');

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(?:tsx|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

function nativeSelectTags(file: string): string[] {
  const ast = parse(read(file), {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  const hits: string[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const node = value as Record<string, unknown>;
    if (node.type === 'JSXOpeningElement') {
      const name = node.name as Record<string, unknown> | undefined;
      if (name?.type === 'JSXIdentifier' && (name.name === 'select' || name.name === 'option')) {
        hits.push(String(name.name));
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra') continue;
      visit(child);
    }
  };
  visit(ast);
  return hits;
}

describe('FIELD-INSPECTOR-FIGUI3-005 final Inspector select contract', () => {
  it('contains no native JSX select/option UI anywhere in Inspector control/tool/ui source', () => {
    const roots = ['src/editor/controls', 'src/editor/tools', 'src/editor/ui'];
    const failures: string[] = [];
    for (const root of roots) {
      for (const file of sourceFiles(root)) {
        const hits = nativeSelectTags(file);
        if (hits.length) failures.push(`${file}: ${hits.join(', ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('routes shared ToolSelect through FieldSelect instead of browser UI', () => {
    const toolSelect = read('src/editor/controls/ToolSelect.tsx');
    expect(toolSelect).toContain("import FieldSelect from './FieldSelect';");
    expect(toolSelect).toContain('<FieldSelect');
    expect(toolSelect).toContain("trace.action('tool-select:change'");
    expect(toolSelect).not.toMatch(/<select\b/i);
    expect(toolSelect).not.toMatch(/<option\b/i);
  });

  it('keeps FieldSelect portalled, keyboardable, and wheel-owned by field', () => {
    const source = read('src/editor/controls/FieldSelect.tsx');
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain('data-field-no-canvas-input');
    expect(source).toContain('onWheelCapture');
    expect(source).toContain("event.key === 'ArrowDown'");
    expect(source).toContain("event.key === 'ArrowUp'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('showSelectedLabel');
  });

  it('uses a field-owned font-size preset menu instead of an invisible native select', () => {
    const source = read('src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx');
    expect(source).toContain('data-typography-font-size-presets');
    expect(source).toContain('<FieldSelect');
    expect(source).toContain('showSelectedLabel={false}');
    expect(source).not.toMatch(/<select\b/i);
    expect(source).not.toMatch(/<option\b/i);
  });

  it('splits quick Family selection from the richer Browse Fonts surface', () => {
    const family = read('src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx');
    const compact = read('src/editor/ui/CompactFontFamilyDropdown.tsx');
    const browser = read('src/editor/ui/FontFamilyPopup.tsx');
    expect(family).toContain('CompactFontFamilyDropdown');
    expect(family).toContain('handleQuickClick');
    expect(family).toContain('data-typography-font-family-trigger');
    expect(family).toContain('data-typography-font-browser-button');
    expect(compact).toContain('<FontFamilyPopup');
    expect(compact).toContain('inline');
    expect(compact).toContain('compact');
    expect(compact).toContain('data-field-no-canvas-input');
    expect(browser).toContain('compact?: boolean');
    expect(browser).toContain('data-font-filter-menu');
    expect(browser).toContain('data-field-no-canvas-input');
  });

  it('gives shared Inspector popup/menu primitives a non-canvas wheel contract', () => {
    expect(read('src/editor/ui/ToolPopup.tsx')).toContain('data-field-no-canvas-input');
    expect(read('src/editor/ui/SearchableDropdown.tsx')).toContain('data-field-no-canvas-input');
    expect(read('src/design-system/DropdownMenu.tsx')).toContain('data-field-no-canvas-input');
    const canvas = read('src/canvas/hooks/useCanvasTransform.ts');
    expect(canvas).toContain("CANVAS_WHEEL_BLOCK_MARKER = 'data-field-no-canvas-input'");
    expect(canvas).toContain('isCanvasWheelBlocked');
  });
});
