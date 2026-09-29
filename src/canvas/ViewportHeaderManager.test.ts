import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(resolve(here, relative), 'utf8');

describe('viewport header rendered-geometry contract', () => {
  it('never synthesizes viewport chrome from config before bridge geometry exists', () => {
    const source = read('./ViewportHeaderManager.ts');

    expect(source).toContain('const posData = getViewportPositionData(vp.id, vpEl);');
    expect(source).toContain('if (!posData) continue;');
    expect(source).not.toContain('posData = { left: vp.x');
    expect(source).not.toContain('fall back to the viewport CONFIG');
  });

  it('waits for a real iframe render and a new render after file switches', () => {
    const source = read('./hooks/useRendererSync.ts');

    expect(source).toContain('viewportHeaderReadyTickRef.current = iframeRenderTick + 1');
    expect(source).toContain('iframeRenderTick < viewportHeaderReadyTickRef.current');
    expect(source).toContain('iframeRenderTick, activeFilePath]');
  });

  it('forwards the camera before applying the same transaction to header chrome', () => {
    const source = read('./hooks/useCanvasTransform.ts');

    expect(source).not.toContain('transformManager.addElement(vpOverlay)');
    const bridgeForward = source.indexOf('postMessageBridgeRef.current.setViewportTransform(t.x, t.y, t.scale)');
    const headerApply = source.indexOf('transformManager.applyToElement(vpOverlay)', bridgeForward);
    expect(bridgeForward).toBeGreaterThan(-1);
    expect(headerApply).toBeGreaterThan(bridgeForward);
  });
});
