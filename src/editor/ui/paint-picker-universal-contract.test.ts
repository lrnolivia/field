import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(resolve(process.cwd(), 'src/editor/ui/PaintPickerShell.tsx'), 'utf8');
const picker = readFileSync(resolve(process.cwd(), 'src/editor/ui/ColorPicker.tsx'), 'utf8');
const colorInput = readFileSync(resolve(process.cwd(), 'src/editor/controls/ColorInput.tsx'), 'utf8');
const fill = readFileSync(resolve(process.cwd(), 'src/editor/tools/StylesTool/atoms/FillControl.tsx'), 'utf8');
const textColor = readFileSync(resolve(process.cwd(), 'src/editor/tools/TextStyleTool/atoms/TextColorControl.tsx'), 'utf8');
const gradientControl = readFileSync(resolve(process.cwd(), 'src/editor/tools/StylesTool/atoms/GradientControl.tsx'), 'utf8');

const order = ['solid', 'gradient', 'pattern', 'image', 'video', 'shader'];

describe('universal PaintPicker', () => {
  it('has one fixed paint rail order for every caller', () => {
    let cursor = -1;
    for (const type of order) {
      const next = shell.indexOf(`'${type}'`, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(shell).toContain('Custom');
    expect(shell).toContain('Libraries');
  });

  it('falls back deterministically if the active type is unsupported', () => {
    expect(shell).toContain('if (supportedTypes.has(activeType)) return');
    expect(shell).toContain('PAINT_TYPE_ORDER.find(type => supportedTypes.has(type))');
    expect(shell).toContain('onTypeChange(fallback)');
  });

  it('makes ColorPicker use the universal shell by default and exposes body-only mode only for an existing paint shell', () => {
    expect(picker).toContain('<PaintPickerShell');
    expect(picker).toContain('supportedTypes={SOLID_ONLY_PAINT_TYPES}');
    expect(picker).toContain('if (props.embeddedBody)');
  });

  it('makes ColorInput a launcher for the same 480px picker even inside another popup', () => {
    expect(colorInput).toContain('width={360}');
    expect(colorInput).toContain('nested={!!popupCtx}');
    expect(colorInput).toContain('<StandaloneColorPickerWithPresets');
    expect(colorInput).not.toContain("!popupCtx &&");
    expect(colorInput).not.toContain("popupCtx.pushPanel('Color'");
  });

  it('declares explicit capabilities instead of branching picker designs', () => {
    expect(fill).toContain('ALL_PAINT_TYPES');
    expect(textColor).toContain("new Set<PaintType>(['solid', 'gradient'])");
    expect(gradientControl).toContain("new Set<PaintType>(['gradient'])");
  });
});
