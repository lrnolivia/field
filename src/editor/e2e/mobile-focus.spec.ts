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

test('two fingers pan the camera and leave project source intact', async ({ page }, testInfo) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.waitForStableGeometry('hero');
  const before = await editor.node('hero').boundingBox();
  const code = await editor.getPageCode();
  expect(before).not.toBeNull();
  const initialTargets = await page.evaluate(() => [180, 280].map(x => {
    const element = document.elementFromPoint(x, 320);
    return { x, tag: element?.tagName, class: element?.className,
      inCanvas: !!element?.closest('[data-canvas-root]'),
      blocked: !!element?.closest('[data-field-no-canvas-input]') };
  }));
  const touchEvents: Array<{ type: string; pointerType: string; id: number; target: string; inCanvas: boolean }> = [];
  await page.exposeFunction('recordMobileTouch', (event: typeof touchEvents[number]) => touchEvents.push(event));
  await page.evaluate(() => {
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      window.addEventListener(type, event => {
        const e = event as PointerEvent;
        const target = e.target instanceof Element ? e.target : null;
        const record = (window as unknown as { recordMobileTouch: (e: object) => void }).recordMobileTouch;
        record({ type, pointerType: e.pointerType, id: e.pointerId,
          target: target?.outerHTML.slice(0, 180) || '', inCanvas: !!target?.closest('[data-canvas-root]') });
      }, true);
    }
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: 180, y: 320, id: 1 }, { x: 280, y: 320, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
    { x: 200, y: 350, id: 1 }, { x: 300, y: 350, id: 2 },
  ] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await testInfo.attach('touch-target-diagnostics', { body: JSON.stringify({ initialTargets, touchEvents }, null, 2), contentType: 'application/json' });
  await expect.poll(async () => (await editor.node('hero').boundingBox())!.x - before!.x).toBeCloseTo(20, 0);
  await expect.poll(async () => (await editor.node('hero').boundingBox())!.y - before!.y).toBeCloseTo(30, 0);
  expect(await editor.getPageCode()).toBe(code);
  // Cancelling a two-finger header gesture must not remove ordinary tap selection.
  const header = page.locator('[data-viewport-header]').first();
  const bounds = await header.boundingBox();
  expect(bounds).not.toBeNull();
  await page.touchscreen.tap(Math.min(300, Math.max(80, bounds!.x + bounds!.width / 2)),
    Math.max(100, bounds!.y + bounds!.height / 2));
  await expect(page.getByRole('button', { name: 'Close Properties', exact: true })).toBeVisible();
});
