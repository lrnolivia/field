import { expect, test } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('expanded left chrome hides and returns with the rail in Full and Focus', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const mode = page.locator('[data-workspace-layout-control]:visible').first();
  const trigger = mode.locator('[data-workspace-mode-trigger]');
  const island = page.locator('[data-workspace-island="left"]');
  const rail = page.locator('[data-left-menu-rail]');
  const title = page.locator('[data-workspace-left-header]');
  for (const layout of ['Full', 'Focus']) {
    await trigger.hover();
    await mode.getByRole('button', { name: new RegExp(`^${layout} layout`, 'i') }).click();
    await page.locator('[data-tutorial="media-button"]:visible').click();
    await expect.poll(async () => (await island.boundingBox())!.width).toBeGreaterThan(160);
    await page.getByRole('button', { name: /turn on left panel auto-hide/i }).click();
    await page.mouse.move(750, 250);
    await expect(rail).toHaveAttribute('data-visible', 'false');
    await expect(island).toHaveCSS('opacity', '0');
    await expect(title).toBeVisible();
    await page.mouse.move(1, 250);
    await expect(rail).toHaveAttribute('data-visible', 'true');
    await expect(island).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: /turn off left panel auto-hide/i }).click();
  }
});

test('docked layout keeps the Canvas in place unless the Workspace preference is enabled', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const frame = editor.node('hero');
  await expect(frame).toBeVisible();
  const left = page.locator('[data-workspace-collapse][data-side="left"]:visible');
  const right = page.locator('[data-workspace-collapse][data-side="right"]:visible').first();
  const x = async () => (await frame.boundingBox())!.x;
  const original = await x();
  await left.click();
  await right.click();
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  expect(await x()).toBeCloseTo(original, 0);
  await page.getByRole('button', { name: 'Open General settings' }).click();
  const settings = page.locator('[data-settings-overlay]');
  await settings.getByRole('button', { name: /^workspace$/i }).click();
  const preference = settings.getByRole('button', { name: 'Move Canvas with panels', exact: true });
  await expect(preference).toHaveAttribute('aria-pressed', 'false');
  await preference.click();
  await expect(preference).toHaveAttribute('aria-pressed', 'true');
  await settings.locator('[data-settings-topbar]').getByRole('button', { name: /^back$/i }).click();
  await left.click();
  await expect.poll(x).toBeGreaterThan(original + 10);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('field:prefs:canvasFollowsPanels'))).toBe('true');
});

test('Float zoom menu clears the Inspector and Fit Selection uses the gap between both panels', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const mode = page.locator('[data-workspace-layout-control]:visible').first();
  await mode.locator('[data-workspace-mode-trigger]').hover();
  await mode.getByRole('button', { name: /^float layout/i }).click();
  await page.locator('[data-tutorial="media-button"]:visible').click();
  await editor.select(['hero']);
  const left = page.locator('[data-workspace-island="left"][data-visible="true"]');
  const right = page.locator('[data-workspace-island="right"][data-visible="true"]');
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
  await page.locator('[data-inspector-zoom]:visible').first().click();
  const menu = page.locator('[data-inspector-zoom-menu]');
  await menu.getByRole('button', { name: /fit selection/i }).click();
  await expect(menu).toHaveCount(0);
  const target = editor.node('hero');
  await expect.poll(async () => {
    const [box, leftPane, rightPane] = await Promise.all([target.boundingBox(), left.boundingBox(), right.boundingBox()]);
    if (!box || !leftPane || !rightPane) return false;
    return box.x >= leftPane.x + leftPane.width && box.x + box.width <= rightPane.x;
  }).toBe(true);
});
