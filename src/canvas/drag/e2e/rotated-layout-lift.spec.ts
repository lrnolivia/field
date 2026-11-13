// rotated-layout-lift.spec.ts — dragging a flow child of a ROTATED flex frame
// keeps the lifted overlay under the cursor (2026-09-09: the live-size
// correction read the child's painted AABB and swapped its width/height mid-
// drag, shifting the overlay 40px off the pointer for the whole gesture).
import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test('lifted child of a rotate(90deg) flex frame stays centred on the cursor', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ROTATED_FLEX_FRAME');
  await page.locator('[data-toolbar-tool="smart-zoom"]').click();
  await editor.select(['chip'], 'desktop');
  await editor.waitForStableGeometry('chip');

  const box = await editor.nodeBox('chip');
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const to = { x: from.x + 60, y: from.y + 40 };
  await editor.duringDrag('chip', to, async () => {
    const target = editor.node('chip');
    const style = await target.evaluate(el => ({ width: el.style.width, height: el.style.height }));
    // The lift keeps the CSS (unrotated) size of 120×40.
    expect(style).toEqual({ width: '120px', height: '40px' });
    const painted = await target.boundingBox();
    if (!painted) throw new Error('The lifted chip has no bounding box');
    expect(Math.abs(painted.x + painted.width / 2 - to.x)).toBeLessThan(3);
    expect(Math.abs(painted.y + painted.height / 2 - to.y)).toBeLessThan(3);
  }, { prime: false, steps: 24 });
});
