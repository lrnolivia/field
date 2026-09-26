// FIGUI3_INSPECTOR_RICH_POPOVER_CONTRACT_20260926
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_SURFACE_Z } from '@/shared/field-surface-elevation';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 rich Inspector popover architecture', () => {
  it('makes ToolPopup the canonical rich editor shell', () => {
    const tool = read('src/editor/ui/ToolPopup.tsx');
    expect(tool).toContain('role="dialog"');
    expect(tool).toContain('aria-modal="false"');
    expect(tool).toContain('data-field-floating-surface');
    expect(tool).toContain("fieldSurfaceZ('rich-popup'");
    expect(tool).toContain("outsidePointerMode?: 'none' | 'close' | 'shield'");
    expect(tool).toContain('initialFocusRef?');
    expect(tool).toContain('hideHeader?');
    expect(tool).toContain('pushPanel');
    expect(tool).toContain('popPanel');
  });

  it('migrates Typography Advanced to ToolPopup without flattening its rich editor content', () => {
    const typography = read('src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx');
    expect(typography).toContain("import ToolPopup from '../../ui/ToolPopup'");
    expect(typography).toContain('<ToolPopup');
    expect(typography).toContain('Basics');
    expect(typography).toContain('Details');
    expect(typography).toContain('data-typography-preview');
    expect(typography).toContain('<ToolSelect');
    expect(typography).toContain('<ToolSegmentedControl');
    expect(typography).not.toContain("createPortal");
    expect(typography).not.toContain('z-[100100]');
    expect(typography).not.toContain('<DropdownMenu');
    expect(typography).not.toContain('<select');
  });

  it('migrates PresetPicker to ToolPopup while preserving token-browser semantics', () => {
    const preset = read('src/editor/ui/PresetPicker.tsx');
    expect(preset).toContain("import ToolPopup from './ToolPopup'");
    expect(preset).toContain('<ToolPopup');
    expect(preset).toContain('Custom');
    expect(preset).toContain('Libraries');
    expect(preset).toContain('Search styles');
    expect(preset).toContain('No matching styles');
    expect(preset).toContain('handleSelect(token.name)');
    expect(preset).not.toContain('createPortal');
    expect(preset).not.toContain('fixed inset-0 z-50');
    expect(preset).not.toContain('z-51');
    expect(preset).not.toContain('<select');
  });

  it('preserves FontFamilyPopup as a ToolPopup consumer', () => {
    const fonts = read('src/editor/ui/FontFamilyPopup.tsx');
    expect(fonts).toContain("import ToolPopup from './ToolPopup'");
    expect(fonts).toContain('<ToolPopup');
    expect(fonts).toContain("fieldSurfaceZ('submenu'");
  });

  it('uses one semantic elevation system across floating Inspector families', () => {
    const dropdown = read('src/design-system/DropdownMenu.tsx');
    const select = read('src/editor/controls/FieldSelect.tsx');
    const searchable = read('src/editor/ui/SearchableDropdown.tsx');
    const modal = read('src/design-system/Modal.tsx');

    expect(dropdown).toContain('fieldSurfaceZ');
    expect(select).toContain("fieldSurfaceZ('select'");
    expect(searchable).toContain("fieldSurfaceZ('menu'");
    expect(searchable).toContain("fieldSurfaceZ('submenu'");
    expect(modal).toContain('FIELD_SURFACE_Z.modal');

    expect(FIELD_SURFACE_Z.inspector).toBeLessThan(FIELD_SURFACE_Z.richPopup);
    expect(FIELD_SURFACE_Z.richPopup).toBeLessThan(FIELD_SURFACE_Z.menu);
    expect(FIELD_SURFACE_Z.menu).toBeLessThan(FIELD_SURFACE_Z.submenu);
    expect(FIELD_SURFACE_Z.submenu).toBeLessThan(FIELD_SURFACE_Z.select);
    expect(FIELD_SURFACE_Z.modal).toBeLessThan(FIELD_SURFACE_Z.modalRichPopup);
    expect(FIELD_SURFACE_Z.modalRichPopup).toBeLessThan(FIELD_SURFACE_Z.modalMenu);
    expect(FIELD_SURFACE_Z.modalMenu).toBeLessThan(FIELD_SURFACE_Z.modalSelect);
  });

  it('keeps SearchableDropdown a distinct searchable-selector family', () => {
    const searchable = read('src/editor/ui/SearchableDropdown.tsx');
    expect(searchable).toContain('SearchableDropdown');
    expect(searchable).toContain('createPortal');
    expect(searchable).not.toContain('<ToolPopup');
  });
});
