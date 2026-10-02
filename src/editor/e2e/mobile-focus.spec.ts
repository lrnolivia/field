import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('phone Focus preserves desktop preference through rotation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked'));
  });
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await expect(page.locator('[data-mobile-toolbar-launcher]')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('docked');
  await page.getByRole('button', { name: 'Open tools', exact: true }).tap();
  await expect(page.locator('[data-mobile-toolbar-expanded]')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#bottom-toolbar-container')).toBeVisible();
  await expect(page.locator('[data-mobile-toolbar-launcher]')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('docked');
  await expect(page.locator('[data-workspace-island="left"]')).toBeVisible();
});

test('two fingers pan the camera and leave project source intact', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.waitForStableGeometry('hero');
  const before = await editor.node('hero').boundingBox();
  const code = await editor.getPageCode();
  expect(before).not.toBeNull();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: 180, y: 320, id: 1 }, { x: 280, y: 320, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
    { x: 200, y: 350, id: 1 }, { x: 300, y: 350, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await editor.node('hero').boundingBox())!.x - before!.x).toBeCloseTo(20, 0);
  await expect.poll(async () => (await editor.node('hero').boundingBox())!.y - before!.y).toBeCloseTo(30, 0);
  expect(await editor.getPageCode()).toBe(code);
});
