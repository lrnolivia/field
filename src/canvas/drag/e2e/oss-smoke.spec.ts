// oss-smoke.spec.ts — Zero-regression covenant smoke for the OSS cleanup.
//
// Drives the CORE editor flows end-to-end and archives screenshots so the
// same script can run after every cleanup phase and be compared against
// the baseline captured on the untouched anchor commit.
//
// Screenshot dir is parameterized: OSS_SCREEN_DIR env var
// (default: oss-release-plan/screens/current).
//
// Flows covered here (drag/reorder/reparent/toolbar/shape-edit are already
// covered by the sibling specs in this directory):
//   1. Editor boots with a seeded project; canvas renders all nodes.
//   2. Click-select a frame → selection overlay + properties panel render.
//   3. Draw a new frame with the Frame tool (F) inside an existing frame
//      → new node lands in ProjectFS code.
//   4. Undo (Cmd+Z) → code returns byte-identical to pre-draw.
//   5. Resize a frame via the bottom-right handle → committed size changes.
//   6. Double-click text → type → Escape → committed text updated.

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { EditorPage } from './helpers/editor-page';

const SCREEN_DIR = process.env.OSS_SCREEN_DIR ?? 'oss-release-plan/screens/current';

function shotPath(name: string): string {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  return path.join(SCREEN_DIR, name);
}

// Serial: flows share one editor boot per test but the suite is cheap;
// keep tests independent (each seeds fresh) for reliable bisection.
test.describe('OSS covenant smoke', () => {
  test('1+2: boot, render, select, panel', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('OSS_SMOKE');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.waitForStableGeometry('hero');

    for (const id of ['hero', 'headline', 'cards', 'card-a', 'card-b']) {
      await expect(editor.node(id)).toBeAttached();
    }
    await page.screenshot({ path: shotPath('01-boot.png'), fullPage: false });

    // Click-select the hero frame (pointer events go through the parent frame).
    const c = await editor.nodeCenter('hero');
    await page.mouse.click(c.x, c.y);
    await expect.poll(() => page.evaluate(() => (window as any).__e2e.selection())).toEqual(['hero']);
    await expect(page.locator('[data-properties-panel] [data-inspector-section="appearance"]')).toBeVisible();
    await page.screenshot({ path: shotPath('02-selected-panel.png'), fullPage: false });
  });

  test('3+4: draw frame with F tool, then undo restores code byte-identical', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('OSS_SMOKE');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.waitForStableGeometry('hero');

    const before = await editor.getPageCode();

    // Draw entirely inside the hero frame at the fitted zoom.
    await page.keyboard.press('f');
    await expect(page.locator('[data-toolbar-tool="frame"]')).toHaveAttribute('aria-pressed', 'true');
    const hero = await editor.nodeBox('hero');
    const from = { x: hero.x + hero.width * 0.3, y: hero.y + hero.height * 0.3 };
    const to = { x: hero.x + hero.width * 0.47, y: hero.y + hero.height * 0.6 };
    await editor.dragFromTo(from, to);
    // Creator commit is deferred a couple frames + queue flush.
    await page.waitForTimeout(600);

    await expect.poll(() => editor.getPageCode()).not.toEqual(before);
    const after = await editor.getPageCode();
    const countIds = (s: string) => (s.match(/data-id="/g) ?? []).length;
    expect(countIds(after)).toBeGreaterThan(countIds(before));
    await page.screenshot({ path: shotPath('03-frame-drawn.png'), fullPage: false });

    // Undo → byte-identical restore.
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect.poll(() => editor.getPageCode()).toEqual(before);
    await page.screenshot({ path: shotPath('04-after-undo.png'), fullPage: false });
  });

  test('5: resize via bottom-right handle commits new size', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('OSS_SMOKE');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.waitForStableGeometry('hero');

    // Select card-a, then grab its bottom-right corner handle.
    await editor.select(['card-a'], 'desktop');
    const handle = page.locator('[data-resize-dir="bottomRight"]');
    await expect(handle).toBeVisible();
    const box = (await handle.boundingBox())!;
    const corner = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await editor.dragFromTo(corner, { x: corner.x + 60, y: corner.y + 40 });
    await page.waitForTimeout(500);

    await expect.poll(async () => Number.parseFloat(await editor.getInlineStyleProp('card-a', 'width') ?? '0')).toBeGreaterThan(300);
    await page.screenshot({ path: shotPath('05-resized.png'), fullPage: false });
  });

  test('6: double-click text, type, Escape commits', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('OSS_SMOKE');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.waitForStableGeometry('hero');

    await editor.waitForStableGeometry('headline');
    const c = await editor.nodeCenter('headline');
    await page.mouse.dblclick(c.x, c.y, { delay: 80 });
    await expect(editor.sandbox().locator('[data-id="headline"][data-editing="true"] [contenteditable="true"]')).toBeVisible();
    await page.keyboard.type(' EDITED', { delay: 20 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const code = await editor.getPageCode();
    expect(code).toContain('EDITED');
    await page.screenshot({ path: shotPath('06-text-edited.png'), fullPage: false });
  });
});
