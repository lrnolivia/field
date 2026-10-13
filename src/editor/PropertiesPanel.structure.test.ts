import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/editor/PropertiesPanel.tsx'),
  'utf8',
);

describe('PropertiesPanel semantic structure', () => {
  it('keeps the Design inspector core groups in semantic order', () => {
    const markers = [
      'data-inspector-group="geometry"',
      'data-inspector-group="content"',
      'data-inspector-group="appearance"',
      'data-inspector-group="advanced"',
      'data-inspector-group="behavior"',
      'data-inspector-group="export"',
    ];

    let previous = -1;

    for (const marker of markers) {
      const current = source.indexOf(marker);
      expect(current, marker).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it('keeps working behavior controls in the unified Inspector', () => {
    expect(source).not.toContain("inspectorMode === 'design'");
    expect(source).not.toContain('data-inspector-group="prototype"');
    const behaviorStart = source.indexOf('data-inspector-group="behavior"');
    expect(behaviorStart).toBeGreaterThan(-1);
    const behavior = source.slice(behaviorStart);
    expect(behavior).toContain('<InteractionsTool />');
    expect(behavior).toContain('<LinkTool />');
    expect(behavior).toContain('<OverlayTool />');
    expect(behavior).toContain('<AnimationTool');
  });

  it('does not regress to the inherited builder ordering contract', () => {
    expect(source).not.toContain('order matches old builder');
  });
});
