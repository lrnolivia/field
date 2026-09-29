import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePresetTokens, serializePresetTokens } from '@/code/generation/preset-gen';
import type { PresetToken } from '@/shared/types';

const fill = readFileSync(new URL('../tools/StylesTool/atoms/FillControl.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./AssetPresetGrid.tsx', import.meta.url), 'utf8');

const gradient: PresetToken = {
  name: 'gradient-aurora',
  value: 'linear-gradient(135deg, #00f, #f0f)',
  category: 'gradient',
};

describe('gradient presets', () => {
  it('round-trips as first-class design tokens', () => {
    const css = serializePresetTokens([gradient]);
    expect(css).toContain('/* Gradients */');
    expect(css).toContain('--gradient-aurora: linear-gradient(135deg, #00f, #f0f);');
    expect(parsePresetTokens(css)).toEqual([gradient]);
  });

  it('reuses the existing asset preset row surface in Fill Libraries', () => {
    expect(fill).toContain("const gradientPresets = allTokens.filter(t => t.category === 'gradient')");
    expect(fill).toContain('type="gradient"');
    expect(fill).toContain('CreatePresetPopupBody');
    expect(grid).toContain("'image' | 'video' | 'gradient'");
    expect(grid).toContain("type === 'gradient'");
  });
});
