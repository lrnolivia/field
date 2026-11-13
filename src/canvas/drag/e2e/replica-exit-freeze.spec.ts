// replica-exit-freeze.spec.ts — the element must FOLLOW THE CURSOR while an
// absolute node is dragged out of a REPLICA tile onto the canvas.
//
// User-reported freeze (2026-08-03): dragging an absolute child out of a
// replica to the canvas left it stale and unmoving for the whole gesture, only
// snapping into place on mouseup. The same drag from the PRIMARY tile was
// smooth.
//
// Every existing exit assertion checks state AFTER mouseup, which is exactly
// the window where this bug is invisible — the committed result was always
// correct. So this spec samples the element's on-screen box BETWEEN drag
// frames and asserts it actually moves mid-gesture.

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';
import { SEEDS } from './fixtures/seeds';

// Seed the noauth editor to retain its built-in components alongside the fixture.
async function gotoSeeded(page: Page, seed: keyof typeof SEEDS): Promise<void> {
  // Without this the onboarding spotlight mounts and swallows every pointer
  // event on the canvas (same reason the shared helper sets it).
  await page.addInitScript(() => {
    window.localStorage.setItem('revyme-onboarding-completed', 'true');
  });
  await page.goto('/builder/noauth');
  await page.waitForFunction(() => !!(window as any).__e2e, null, { timeout: 60_000 });
  const files = (SEEDS[seed] as { files: Record<string, string> }).files;
  await page.evaluate((f) => {
    // Seed a FRESH route: `app/page.client.tsx` is already the active file, so
    // rewriting it fires no activeFilePath change and the canvas never
    // re-parses — the seed would silently render as the empty default project.
    for (const [path, code] of Object.entries(f)) {
      (window as any).__e2e.writeFile(path.replace('app/', 'app/repro/'), code);
    }
    (window as any).__e2e.openFile('app/repro/page.client.tsx');
  }, files);
  const sandbox = page.frameLocator('iframe[src*="5174"]');
  await sandbox.locator('[data-viewport]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
}

test.use({ viewport: { width: 1600, height: 1000 } });

for (const viewport of ['tablet', 'desktop'] as const) {
  test(`absolute child keeps moving on the canvas after exiting the ${viewport} tile`, async ({ page }) => {
    // Noauth includes built-in components, which exercise the multi-file
    // renderer path where the replica used to freeze until mouseup.
    await gotoSeeded(page, 'REPLICA_ABSOLUTE_EXIT');
    const editor = new EditorPage(page);
    const sandbox = editor.sandbox();
    await editor.fitCamera();
    await editor.primeNode('abs-child', viewport);
    await editor.select(['abs-child'], viewport);

    const start = await editor.nodeBoxIn(viewport, 'abs-child');
    const tile = (await sandbox.locator(`[data-viewport="${viewport}"]`).boundingBox())!;
    const from = { x: start.x + start.width / 2 + 6, y: start.y + start.height / 2 + 4 };
    const outside = { x: from.x + 40, y: tile.y + tile.height + 40 };
    const end = { ...outside, y: outside.y + 150 };
    expect(end.y).toBeLessThan(page.viewportSize()!.height - 40);

    // The primary moves its original node. The replica may instead create a
    // canvas clone, so follow the selected node and exclude every tile copy.
    const canvasBox = async () => {
      const id = await page.evaluate(() => (window as any).__e2e.selection()[0] as string);
      const node = sandbox.locator(`[data-id="${id}"]:not([data-viewport] *):visible`);
      return (await node.count()) === 1 ? node.boundingBox() : null;
    };

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    try {
      await page.mouse.move(outside.x, outside.y, { steps: 12 });
      await editor.pumpDrag(outside, 8);
      await expect.poll(canvasBox).not.toBeNull();

      const ys: number[] = [];
      for (let step = 1; step <= 10; step++) {
        const y = outside.y + (end.y - outside.y) * step / 10;
        await page.mouse.move(end.x, y);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const box = await canvasBox();
        if (box) ys.push(box.y);
      }

      // Both assertions run while the button is still held.
      expect(ys.length, 'the dragged canvas node stays visible').toBeGreaterThanOrEqual(7);
      expect(Math.max(...ys) - Math.min(...ys), 'the canvas node keeps moving').toBeGreaterThan(100);
    } finally {
      await page.mouse.up();
    }
  });
}
