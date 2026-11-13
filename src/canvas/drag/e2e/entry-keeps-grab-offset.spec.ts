// entry-keeps-grab-offset.spec.ts — a canvas node grabbed OFF-CENTRE and
// dragged into a layout-child frame keeps its grab offset at the entry
// moment (2026-09-09: the layout-child entry re-centred the node under the
// cursor, jumping it by grab-offset − half-size — bigger nodes jumped more).
import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test('off-centre grab into a layout child: painted box tracks the pointer with the original offset', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('CANVAS_NODE_WITH_GAP');
  await page.locator('[data-toolbar-tool="smart-zoom"]').click();
  await editor.select(['floater'], 'desktop');
  await editor.waitForStableGeometry('floater');

  const box = await editor.nodeBox('floater');
  // Grab off-center, beyond the corner and edge handles on the selected node.
  const grab = { x: box.x + Math.max(10, box.width * 0.32), y: box.y + Math.max(10, box.height * 0.35) };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.hasAttribute('data-canvas-input-surface'), grab)).toBe(true);
  const offset = { x: grab.x - box.x, y: grab.y - box.y };
  const hero = await editor.nodeBox('hero');
  const to = { x: hero.x + hero.width / 2, y: hero.y + hero.height / 2 };

  const mouse = page.mouse;
  await mouse.move(grab.x, grab.y);
  await mouse.down();
  const steps = 40;
  let maxErr = 0;
  let entered = false;
  try {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const at = { x: grab.x + (to.x - grab.x) * t, y: grab.y + (to.y - grab.y) * t };
      await mouse.move(at.x, at.y, { steps: 1 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
      const now = await editor.nodeBox('floater').catch(() => null);
      if (!now) continue;
      const parent = await editor.sandbox().locator('[data-id="floater"]').first()
        .evaluate(el => el.parentElement?.getAttribute('data-id') ?? '');
      if (parent === 'hero') entered = true;
      // Expected top-left = pointer − grab offset (box size unchanged).
      const err = Math.max(Math.abs(now.x - (at.x - offset.x)), Math.abs(now.y - (at.y - offset.y)));
      if (i > 3) maxErr = Math.max(maxErr, err);
    }
  } finally {
    await mouse.up();
    await page.waitForTimeout(80);
  }
  expect(entered).toBe(true);
  // A few px of rect-cache lag is normal; the old re-centre jumped by ~40px here.
  expect(maxErr).toBeLessThan(8);
});
