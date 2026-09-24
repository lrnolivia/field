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
      'data-inspector-group="export"',
    ];

    let previous = -1;

    for (const marker of markers) {
      const current = source.indexOf(marker);
      expect(current, marker).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it('separates prototype behavior from the Design property stack', () => {
    expect(source).toContain("inspectorMode === 'design'");
    expect(source).toContain('data-inspector-group="prototype"');

    // These were the old mixed Design-stack groupings.
    expect(source).not.toContain('data-inspector-group="effects"');
    expect(source).not.toContain('data-inspector-group="behavior"');
  });

  it('keeps interaction tools inside the Prototype branch', () => {
    const prototypeStart = source.indexOf(
      'data-inspector-group="prototype"',
    );

    expect(prototypeStart).toBeGreaterThan(-1);

    const prototypeSource = source.slice(prototypeStart);

    expect(prototypeSource).toContain('<InteractionsTool />');
    expect(prototypeSource).toContain('<LinkTool />');
    expect(prototypeSource).toContain('<OverlayTool />');
    expect(prototypeSource).toContain('<AnimationTool');
  });

  it('does not regress to the inherited builder ordering contract', () => {
    expect(source).not.toContain('order matches old builder');
  });
});
