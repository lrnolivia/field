import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

async function marquee(
  page: import('@playwright/test').Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  modifier?: 'Control' | 'Meta',
) {
  if (modifier) await page.keyboard.down(modifier);
  try {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(160);
  } finally {
    if (modifier) await page.keyboard.up(modifier);
  }
}

test.describe('Figma selection parity — marquee depth', () => {
  test('normal marquee selects the containing surface; Ctrl-marquee selects the nested child', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();

    const hero = await editor.nodeBox('hero');
    const child = await editor.nodeBox('abs-child');

    // Begin on open canvas just outside the page, then sweep across the
    // nested child. The rectangle intersects both Hero and AbsChild.
    const start = { x: hero.x - 24, y: hero.y + 12 };
    const end = { x: child.x + child.width + 12, y: child.y + child.height + 12 };

    await marquee(page, start, end);
    let selection: string[] = await page.evaluate(() => (window as any).__e2e.selection?.() ?? []);
    expect(selection).toEqual(['hero']);

    await page.evaluate(() => (window as any).__e2e.select([]));
    await page.waitForTimeout(80);

    // Linux CI uses Control; product code treats Ctrl/Meta identically.
    await marquee(page, start, end, 'Control');
    selection = await page.evaluate(() => (window as any).__e2e.selection?.() ?? []);
    expect(selection).toEqual(['abs-child']);
  });
});


test.describe('Figma selection parity — click and keyboard traversal', () => {
  test('parent-first click, deep select, drill-in, toggle, and sibling traversal match the documented model', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();

    const selection = async (): Promise<string[]> =>
      page.evaluate(() => (window as any).__e2e.selection?.() ?? []);

    const child = await editor.nodeBox('abs-child');
    const childPoint = { x: child.x + child.width / 2, y: child.y + child.height / 2 };

    // Ordinary click on a nested object selects the containing surface.
    await page.mouse.click(childPoint.x, childPoint.y);
    await expect.poll(selection).toEqual(['hero']);

    // Ctrl/Cmd deep-select bypasses the parent-first hierarchy rule.
    await page.keyboard.down('Control');
    await page.mouse.click(childPoint.x, childPoint.y);
    await page.keyboard.up('Control');
    await expect.poll(selection).toEqual(['abs-child']);

    // A native double-click is another one-level drill-in gesture.
    await page.evaluate(() => (window as any).__e2e.select([]));
    await page.waitForTimeout(80);
    await page.mouse.dblclick(childPoint.x, childPoint.y);
    await expect.poll(selection).toEqual(['abs-child']);

    // Enter selects a child; Shift+Enter returns to the parent.
    await editor.select(['hero']);
    await page.keyboard.press('Enter');
    await expect.poll(selection).toEqual(['abs-child']);
    await page.keyboard.press('Shift+Enter');
    await expect.poll(selection).toEqual(['hero']);

    // Tab / Shift+Tab traverse siblings.
    await page.keyboard.press('Tab');
    await expect.poll(selection).toEqual(['features']);
    await page.keyboard.press('Shift+Tab');
    await expect.poll(selection).toEqual(['hero']);

    // Shift-click toggles membership in the multi-selection.
    const features = await editor.nodeBox('features');
    // The frame has 20px padding; this point is on the frame background rather
    // than either nested card, so the gesture targets Features itself.
    const featuresSurface = { x: features.x + 6, y: features.y + 6 };
    await page.keyboard.down('Shift');
    await page.mouse.click(featuresSurface.x, featuresSurface.y);
    await page.keyboard.up('Shift');
    await expect.poll(selection).toEqual(expect.arrayContaining(['hero', 'features']));
    expect((await selection()).length).toBe(2);

    await page.keyboard.down('Shift');
    await page.mouse.click(featuresSurface.x, featuresSurface.y);
    await page.keyboard.up('Shift');
    await expect.poll(selection).toEqual(['hero']);

    // Empty canvas click clears selection.
    const surface = await page.locator('[data-canvas-input-surface]').boundingBox();
    if (!surface) throw new Error('canvas input surface has no bounding box');
    await page.mouse.click(surface.x + 8, surface.y + 8);
    await expect.poll(selection).toEqual([]);
  });
});
