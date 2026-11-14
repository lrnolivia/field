import { describe, expect, it } from 'vitest';
import { migrateGridMaskInCode } from './grid-mask-migration';
import { DEFAULT_PATTERN_FILL, buildPatternFillStyles, LEGACY_GRID_MASK } from '@/editor/ui/pattern-fill-utils';
import { parseJSXToNodes } from '@/code/parsing/parser';

const config = { ...DEFAULT_PATTERN_FILL, kind: 'gridMask' as const };
const oldPaint = buildPatternFillStyles({ ...config, kind: 'grid' });
const customMask = 'linear-gradient(black, transparent)';

function legacyFile(mask: string, backup: boolean) {
  const saved = encodeURIComponent(JSON.stringify({ maskImage: customMask, WebkitMaskImage: '' }));
  const styles = { ...oldPaint, maskImage: mask, WebkitMaskImage: LEGACY_GRID_MASK, color: 'red' };
  return `export default function Page() {
    return <div data-id="frame" data-field-pattern='${JSON.stringify(config)}'
      ${backup ? `data-field-pattern-style-backup="${saved}"` : ''} style={${JSON.stringify(styles)}}>Visible text</div>;
  }`;
}

describe('legacy Grid + Mask paint', () => {
  it('restores a saved host mask and moves the radial fade into background paint', () => {
    const output = migrateGridMaskInCode(legacyFile(LEGACY_GRID_MASK, true));
    const node = parseJSXToNodes(output).get('frame')!;
    expect(node.styles).toMatchObject({ maskImage: customMask, color: 'red' });
    expect(node.styles.WebkitMaskImage).toBeUndefined();
    expect(node.styles.backgroundImage).toContain('data:image/svg+xml');
    expect(node.textContent).toBe('Visible text');
    expect(output).not.toContain('data-field-pattern-style-backup');
    expect(migrateGridMaskInCode(output)).toBe(output);
  });

  it('keeps an independently edited mask and removes a legacy mask with no backup', () => {
    const output = migrateGridMaskInCode(legacyFile(customMask, false));
    const node = parseJSXToNodes(output).get('frame')!;
    expect(node.styles.maskImage).toBe(customMask);
    expect(node.styles.WebkitMaskImage).toBeUndefined();
  });
});
