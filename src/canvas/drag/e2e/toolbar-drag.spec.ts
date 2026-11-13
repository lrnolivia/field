// toolbar-drag.spec.ts — End-to-end tests for ToolbarDragStrategy.
//
// Toolbar drag is what fires when the user drags from the Insert /
// Library / Icon panels onto the canvas. Unlike CanvasDragStrategy, it
// uses `findDeepestFrameAtPoint` (point-only hit-test, no fully-inside
// check) and has no entry-grace hysteresis — the drop-line / parent-
// highlight updates synchronously every move event.
//
// Scenarios covered:
//   - Drop into a flex layout parent (drop-line appears + node inserts
//     at the right index)
//   - Edge-magnet between two touching siblings (cursor near boundary)
//   - Insert respects `order` styles when parent has explicit reorder
//     metadata (renumber pass)

import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

async function openInsert(editor: EditorPage) {
  await editor.page().locator('[data-left-menu-item="insert"]').click();
  await editor.page().getByText('Elements', { exact: true }).click();
  const frameTile = editor.page().locator('[data-toolbar-item="frame"]').first();
  await frameTile.waitFor({ state: 'visible' });
  await editor.waitForStableGeometry('hero');
  return frameTile;
}

async function dragFrameTile(editor: EditorPage, item: ReturnType<EditorPage['node']>, to: { x: number; y: number }) {
  const page = editor.page();
  const tile = await item.boundingBox();
  if (!tile) throw new Error('Insert Frame tile has no bounding box');
  const from = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 18; step++) {
    const progress = step / 18;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }
  await editor.pumpDrag(to);
}

test.describe('ToolbarDragStrategy', () => {
  test('drop-line appears and drop inserts at the right index when dropping in a gap', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('FLEX_COLUMN_GAP');

    const frameTile = await openInsert(editor);
    const heroBox = await editor.nodeBox('hero');
    const featuresBox = await editor.nodeBox('features');
    const dropX = heroBox.x + heroBox.width / 2;
    const dropY = (heroBox.y + heroBox.height + featuresBox.y) / 2;

    await dragFrameTile(editor, frameTile, { x: dropX, y: dropY });

    // Drop-line should be on root, between hero (idx 0) and features (idx 1).
    const line = editor.dropLine();
    await expect(line).toHaveAttribute('data-parent-id', 'root');
    await expect(line).toHaveAttribute('data-insert-index', '1');

    await page.mouse.up();
    // An insert into an ordered parent lands in TWO flushes ~30ms apart —
    // read straight after mouseup and you catch the pre-insert list.
    await editor.waitForRootChildren(4);
    const visual = await editor.getRootChildrenVisualOrder();
    expect(visual.length).toBe(4);
    expect(visual[0]).toBe('hero');
    expect(visual[2]).toBe('features');
    expect(visual[3]).toBe('how');
  });

  test('edge-magnet promotes when dropping near a touching-sibling boundary', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('FLEX_COLUMN');

    // FLEX_COLUMN: hero / features / how all touch (gap=0). Cursor near
    // hero's bottom edge → magnet promotes to root, drop-line shows
    // between hero and features.
    const frameTile = await openInsert(editor);
    const heroBox = await editor.nodeBox('hero');
    const dropX = heroBox.x + heroBox.width / 2;
    const dropY = heroBox.y + heroBox.height - 6; // 6px above hero/features boundary

    await dragFrameTile(editor, frameTile, { x: dropX, y: dropY });

    const line = editor.dropLine();
    await expect(line).toHaveAttribute('data-parent-id', 'root');
    await expect(line).toHaveAttribute('data-insert-index', '1');

    await page.mouse.up();
    await editor.waitForRootChildren(4);
    const visual = await editor.getRootChildrenVisualOrder();
    expect(visual[0]).toBe('hero');
    expect(visual[2]).toBe('features');
  });

  test('drop into a parent with explicit order:N siblings renumbers correctly', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('REORDERED_FLEX_COLUMN');

    // Visual order in REORDERED_FLEX_COLUMN: hero (order:0), features
    // (order:1), how (order:2). JSX order: how, hero, features.
    // Drop in the gap (none — touching), via magnet near hero's bottom
    // edge. Without the renumber-orders fix, the new node would land
    // visually at the top (default order:0).
    const frameTile = await openInsert(editor);
    const heroBox = await editor.nodeBox('hero');
    const dropX = heroBox.x + heroBox.width / 2;
    const dropY = heroBox.y + heroBox.height - 6;

    await dragFrameTile(editor, frameTile, { x: dropX, y: dropY });

    // Drop-line between hero (visual 0) and features (visual 1).
    const line = editor.dropLine();
    await expect(line).toHaveAttribute('data-insert-index', '1');

    await page.mouse.up();
    // Visual order must be: hero, NEW, features, how — NOT NEW, hero,
    // features, how (which would happen without the renumber).
    //
    // Poll: the ordered-parent drop commits in TWO flushes (addNode, then the
    // order-renumber styles ~30ms later) and the render that materializes the
    // new element in the sandbox DOM follows the second flush — reading the
    // DOM synchronously after mouseup races it (~110ms total). The poll also
    // guards the actual regression this spec caught (2026-07-24): the second
    // flush's markCanvasUpdate ate the structural render entirely, so the
    // node NEVER appeared — no amount of waiting made length reach 4.
    await expect.poll(async () => (await editor.getRootChildrenVisualOrder()).length, { timeout: 5_000 }).toBe(4);
    const visual = await editor.getRootChildrenVisualOrder();
    expect(visual[0]).toBe('hero');
    expect(visual[2]).toBe('features');
    expect(visual[3]).toBe('how');
  });
});
