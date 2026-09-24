import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/editor/PropertiesPanel.tsx'),
  'utf8',
);

describe('PropertiesPanel semantic structure', () => {
  it('keeps the canonical field inspector hierarchy', () => {
    const markers = [
      'data-inspector-group="geometry"',
      'data-inspector-group="content"',
      'data-inspector-group="appearance"',
      'data-inspector-group="effects"',
      'data-inspector-group="behavior"',
      'data-inspector-group="advanced"',
      'data-inspector-group="export"',
    ];

    let previous = -1;
    for (const marker of markers) {
      const current = source.indexOf(marker);
      expect(current, marker).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it('keeps behavior below appearance and effects', () => {
    const appearance = source.indexOf('data-inspector-group="appearance"');
    const effects = source.indexOf('data-inspector-group="effects"');
    const behavior = source.indexOf('data-inspector-group="behavior"');

    expect(appearance).toBeGreaterThan(-1);
    expect(effects).toBeGreaterThan(appearance);
    expect(behavior).toBeGreaterThan(effects);
  });

  it('does not regress to the inherited builder ordering contract', () => {
    expect(source).not.toContain('order matches old builder');
  });
});
