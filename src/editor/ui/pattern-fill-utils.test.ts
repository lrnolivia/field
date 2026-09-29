import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PATTERN_FILL,
  buildPatternFillStyles,
  parsePatternFillConfig,
  serializePatternFillConfig,
} from './pattern-fill-utils';

describe('native pattern fill compiler', () => {
  it('round-trips semantic config through source metadata', () => {
    const raw = serializePatternFillConfig({ ...DEFAULT_PATTERN_FILL, kind: 'honeycomb', tileSize: 32 });
    expect(parsePatternFillConfig(raw)).toMatchObject({ kind: 'honeycomb', tileSize: 32, source: 'field', v: 1 });
  });

  it('compiles field recipes to ordinary CSS/SVG web primitives', () => {
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'grid' }).backgroundImage).toContain('linear-gradient');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'crosses' }).backgroundImage).toContain('data:image/svg+xml');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'honeycomb' }).backgroundImage).toContain('data:image/svg+xml');
    expect(buildPatternFillStyles({ ...DEFAULT_PATTERN_FILL, kind: 'checkerboard' }).backgroundPosition).toContain('10px 10px');
  });

  it('clamps hostile or stale metadata rather than emitting invalid geometry', () => {
    const parsed = parsePatternFillConfig(JSON.stringify({ kind: 'nope', opacity: 9, tileSize: -1, thickness: 99 }));
    expect(parsed.kind).toBe('grid');
    expect(parsed.opacity).toBe(1);
    expect(parsed.tileSize).toBe(4);
    expect(parsed.thickness).toBe(12);
  });
});
