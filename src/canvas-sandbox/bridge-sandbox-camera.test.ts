import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, './bridge-sandbox.ts'), 'utf8');

describe('sandbox camera lockstep transport', () => {
  it('does not add a second RAF after the parent camera RAF', () => {
    expect(source).toContain(
      'applyViewportTransform(event.data.x, event.data.y, event.data.scale, true);',
    );
    expect(source).not.toContain('scheduleHostViewportTransform');
    expect(source).not.toContain('hostViewportTransformRaf');
    expect(source).not.toContain('pendingHostViewportTransform');
  });
});
