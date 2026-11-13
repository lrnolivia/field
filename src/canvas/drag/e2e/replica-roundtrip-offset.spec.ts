import { expect, test } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1720, height: 1000 } });

test('a node extracted from a replica keeps its grab offset when dragged into the primary', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('REPLICA_ABSOLUTE_EXIT');
  await editor.fitCamera();
  await editor.primeNode('abs-child', 'tablet');
  await editor.select(['abs-child'], 'tablet');

  const sandbox = editor.sandbox();
  const tablet = (await sandbox.locator('[data-viewport="tablet"]').boundingBox())!;
  const desktop = (await sandbox.locator('[data-viewport="desktop"]').boundingBox())!;
  const replica = await editor.nodeBoxIn('tablet', 'abs-child');
  const from = { x: replica.x + replica.width / 2 + 6, y: replica.y + replica.height / 2 + 4 };
  const out = { x: from.x, y: tablet.y + tablet.height + 130 };
  await editor.dragFromTo(from, out, { steps: 20 });

  const [cloneId] = await page.evaluate(() => (window as any).__e2e.selection() as string[]);
  expect(cloneId).toBeTruthy();
  expect(cloneId).not.toBe('abs-child');
  const clone = sandbox.locator(`[data-node-id="${cloneId}"]:visible`);
  await expect(clone).toBeVisible();
  expect(await clone.evaluate(el => el.closest('[data-viewport]'))).toBeNull();

  const box = (await clone.boundingBox())!;
  const grab = { x: box.x + box.width / 2 + 5, y: box.y + box.height / 2 + 3 };
  const below = { x: desktop.x + desktop.width / 2, y: out.y };
  const inside = { x: below.x, y: desktop.y + desktop.height * 0.65 };
  const offsets: { x: number; y: number }[] = [];

  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  try {
    await page.mouse.move(below.x, below.y, { steps: 12 });
    await editor.pumpDrag(below, 4);

    for (let step = 1; step <= 16; step++) {
      const y = below.y + (inside.y - below.y) * step / 16;
      await page.mouse.move(inside.x, y);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const painted = await clone.boundingBox({ timeout: 300 }).catch(() => null);
      if (painted) offsets.push({ x: inside.x - painted.x, y: y - painted.y });
    }
    await editor.pumpDrag(inside, 8);
  } finally {
    await page.mouse.up();
  }

  expect(offsets.length, 'the dragged node is visible during entry').toBeGreaterThanOrEqual(13);
  const drift = offsets.slice(1).map((current, i) =>
    Math.hypot(current.x - offsets[i].x, current.y - offsets[i].y));
  expect(Math.max(...drift), 'greatest single-frame change in the grab offset').toBeLessThan(40);
  await expect(sandbox.locator(`[data-viewport="desktop"] [data-id="${cloneId}"]`)).toBeVisible();
});
