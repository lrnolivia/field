// layout-lifted.spec.ts — End-to-end tests for LayoutLiftedStrategy.
//
// LayoutLiftedStrategy fires when the user drags a layout-positioned
// child of a flex/grid parent. The element is "lifted" out of the
// flow and follows the cursor; on drop it either:
//   - Reorders within the same parent (writes new `order: N` styles)
//   - Exits to canvas (becomes a top-level canvas node)
//   - Enters a sibling layout (reparents)
//
// Seeds:
//   - FLEX_COLUMN: 3 sections in a column flex parent
//   - REORDERED_FLEX_COLUMN: same with explicit order: N styles
//   - FLEX_ROW: 3 columns in a row flex parent

import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.describe('LayoutLiftedStrategy', () => {
  test('reorder within parent: drag features above hero updates visual order', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('FLEX_COLUMN');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.select(['features'], 'desktop');
    await editor.waitForStableGeometry('features');

    // Initial visual order: hero, features, how.
    expect(await editor.getRootChildrenVisualOrder()).toEqual(['hero', 'features', 'how']);

    // Drag features UP, dropping it ABOVE hero → new order: features, hero, how.
    const featuresBox = await editor.nodeBox('features');
    const heroBox = await editor.nodeBox('hero');
    const from = { x: featuresBox.x + featuresBox.width / 2, y: featuresBox.y + featuresBox.height / 2 };
    const to = { x: heroBox.x + heroBox.width / 2, y: heroBox.y + 4 };

    await editor.dragFromTo(from, to);

    await expect.poll(() => editor.getRootChildrenVisualOrder()).toEqual(['features', 'hero', 'how']);
  });

  test('reorder works after a previous reorder (visual sort, not JSX sort)', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('REORDERED_FLEX_COLUMN');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.select(['how'], 'desktop');
    await editor.waitForStableGeometry('how');

    // Initial visual order via explicit `order` styles: hero, features, how.
    // JSX order is: how, hero, features.
    expect(await editor.getRootChildrenVisualOrder()).toEqual(['hero', 'features', 'how']);

    // Drag `how` UP, dropping it ABOVE hero. The strategy must use
    // VISUAL order (rect.top sort), not JSX order, when computing the
    // insert index — otherwise CSS `order` reorders desync the math.
    const howBox = await editor.nodeBox('how');
    const heroBox = await editor.nodeBox('hero');
    const from = { x: howBox.x + howBox.width / 2, y: howBox.y + howBox.height / 2 };
    const to = { x: heroBox.x + heroBox.width / 2, y: heroBox.y + 4 };

    await editor.dragFromTo(from, to);

    await expect.poll(() => editor.getRootChildrenVisualOrder()).toEqual(['how', 'hero', 'features']);
  });

  test('drop at END commits with an invisible zero-size flow sibling present', async ({ page }) => {
    // Figma-import repro: an empty zero-size frame sits in the flow as a
    // real (but invisible) flex child. The reorder walk only sees VISIBLE
    // siblings while the start-index/commit-splice covered ALL children —
    // the one-slot skew made "drag the footer below the last section"
    // compare equal to its start slot and silently revert on mouseup.
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('GHOST_SIBLING_COLUMN');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.select(['footer'], 'desktop');
    await editor.waitForStableGeometry('footer');

    const visibleOrder = async () =>
      (await editor.getRootChildrenVisualOrder()).filter((id) => id !== 'ghost');
    expect(await visibleOrder()).toEqual(['nav', 'hero', 'footer', 'cta']);

    // Drag footer DOWN past the CTA's bottom edge → footer becomes last.
    const ctaBox = await editor.nodeBox('cta');
    const rootBox = await editor.nodeBox('root');
    const ctaEnd = ctaBox.y + ctaBox.height;
    const emptySpace = rootBox.y + rootBox.height - ctaEnd;
    expect(emptySpace).toBeGreaterThan(16);
    const to = { x: ctaBox.x + ctaBox.width / 2, y: ctaEnd + emptySpace / 2 };

    await editor.dragNodeAsserted('footer', to, { steps: 24, releaseDelayMs: 100 });
    await expect.poll(visibleOrder).toEqual(['nav', 'hero', 'cta', 'footer']);

    // The bordered footer keeps its border AND carries a real `order` —
    // the generator's order/border key-collision regression.
    const code = await editor.getPageCode();
    const footerTag = code.slice(code.indexOf('data-id="footer"'), code.indexOf('data-id="cta"'));
    expect(footerTag).toContain("border: '0'");
    expect(footerTag).toMatch(/[^b]order: '/);
  });

  // Row-direction reorder. This spent a while as `test.skip` ("harness
  // flake": lift + placeholder fired but no `order` ever committed).
  // Re-driven 2026-08-05 with a full trace: the drag now seeds at the
  // right visible-sibling index, moves the placeholder, and commits
  // col-a:0 / col-c:1 / col-b:2 — the index-space seeding fix is what
  // had been missing. Keep it running: row is the axis where a
  // parent-local mouse-conversion regression would show up first.
  test('row-flex reorder works the same as column', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('FLEX_ROW');
    await page.locator('[data-toolbar-tool="smart-zoom"]').click();
    await editor.select(['col-c'], 'desktop');
    await editor.waitForStableGeometry('col-c');

    expect(await editor.getRootChildrenVisualOrder()).toEqual(['col-a', 'col-b', 'col-c']);

    // Drag col-c LEFT, dropping it BETWEEN col-a and col-b.
    // Target = col-a's right edge + 4 = inside col-b but past col-b's
    // midpoint of cursor's flow → strategy returns insert idx 1.
    const colC = await editor.nodeBox('col-c');
    const colA = await editor.nodeBox('col-a');
    const from = { x: colC.x + colC.width / 2, y: colC.y + colC.height / 2 };
    const to = { x: colA.x + colA.width + 4, y: colC.y + colC.height / 2 };

    await editor.dragFromTo(from, to, { steps: 24, releaseDelayMs: 100 });
    await expect.poll(() => editor.getRootChildrenVisualOrder()).toEqual(['col-a', 'col-c', 'col-b']);
  });
});
