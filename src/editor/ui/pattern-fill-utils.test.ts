import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PATTERN_FILL,
  buildPatternFillStyles,
  defaultAssetPatternFill,
  defaultPatternMonsterFill,
  parsePatternFillConfig,
  serializePatternFillConfig,
} from './pattern-fill-utils';
import { PATTERN_MONSTER_CATALOG } from './patterns/pattern-monster-catalog';

describe('native pattern fill compiler', () => {
  it('round-trips field semantic config through source metadata', () => {
    const raw = serializePatternFillConfig({ ...DEFAULT_PATTERN_FILL, kind: 'honeycomb', tileSize: 32 });
    expect(parsePatternFillConfig(raw)).toMatchObject({ kind: 'honeycomb', tileSize: 32, source: 'field', v: 1 });
  });

  it('compiles field recipes to ordinary CSS/SVG web primitives', () => {
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'grid' }).backgroundImage).toContain('linear-gradient');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'crosses' }).backgroundImage).toContain('data:image/svg+xml');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'honeycomb' }).backgroundImage).toContain('data:image/svg+xml');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'checkerboard' }).backgroundPosition).toContain('10px 10px');
  });

  it('clamps hostile or stale field metadata rather than emitting invalid geometry', () => {
    const parsed = parsePatternFillConfig(JSON.stringify({ kind: 'nope', opacity: 9, tileSize: -1, thickness: 99 }));
    expect(parsed.source).toBe('field');
    if (parsed.source !== 'field') throw new Error('expected field pattern');
    expect(parsed.kind).toBe('grid');
    expect(parsed.opacity).toBe(1);
    expect(parsed.tileSize).toBe(4);
    expect(parsed.thickness).toBe(12);
  });

  it('ships the complete open-source Pattern Monster catalog and compiles every entry', () => {
    expect(PATTERN_MONSTER_CATALOG).toHaveLength(330);
    for (const definition of PATTERN_MONSTER_CATALOG) {
      const config = defaultPatternMonsterFill(definition);
      const styles = buildPatternFillStyles(config, definition);
      expect(styles.backgroundImage, definition.slug).toContain('data:image/svg+xml');
      expect(styles.backgroundImage, definition.slug).not.toContain('undefined');
      expect(styles.backgroundImage, definition.slug).not.toContain('NaN');
    }
  });

  it('round-trips Pattern Monster semantic config by slug instead of embedding artwork in node metadata', () => {
    const definition = PATTERN_MONSTER_CATALOG.find(pattern => pattern.mode === 'stroke-join')!;
    const config = { ...defaultPatternMonsterFill(definition), angle: 45, spacing: [1, 2] as [number, number] };
    const parsed = parsePatternFillConfig(serializePatternFillConfig(config));
    expect(parsed).toMatchObject({ source: 'pattern-monster', patternId: definition.slug, angle: 45, spacing: [1, 2] });
  });
  it('compiles project Media assets to ordinary repeating CSS without copying the asset', () => {
    const config = { ...defaultAssetPatternFill('/media/tile.svg'), tileSize: 48, repeat: 'repeat-x' as const, position: 'top left' };
    const styles = buildPatternFillStyles(config);
    expect(styles.backgroundImage).toBe('url("/media/tile.svg")');
    expect(styles.backgroundSize).toBe('48px auto');
    expect(styles.backgroundRepeat).toBe('repeat-x');
    expect(styles.backgroundPosition).toBe('top left');
    const parsed = parsePatternFillConfig(serializePatternFillConfig(config));
    expect(parsed).toMatchObject({ source: 'asset', assetUrl: '/media/tile.svg', tileSize: 48, repeat: 'repeat-x' });
  });

});
