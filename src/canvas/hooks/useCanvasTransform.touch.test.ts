// useCanvasTransform.touch.test.ts — source-level attachment contract.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, 'useCanvasTransform.ts'), 'utf8');

describe('useCanvasTransform mobile touch attachment', () => {
  it('attaches and tears down the shared two-finger camera listener', () => {
    expect(source).toContain('attachTouchCamera(container, setPanCursor)');
    expect(source).toContain('detachTouchCamera()');
  });
});
