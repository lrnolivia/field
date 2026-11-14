import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('Preview zoom responds to buttons, keyboard, wheel and pinch without changing layout width', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: 'preview', exact: true }).click();
  const overlay = page.locator('[data-preview-overlay]');
  const frame = overlay.locator('iframe');
  const body = frame.contentFrame().locator('body');
  const zoom = overlay.locator('[data-preview-zoom]');
  const layoutWidth = () => body.evaluate(() => window.innerWidth);
  await expect(zoom).toBeVisible();
  const width = await layoutWidth();

  await overlay.getByRole('button', { name: 'Reset zoom to 100%' }).click();
  await expect(zoom).toHaveText('100%');
  await overlay.getByRole('button', { name: /^zoom in$/i }).click();
  await expect(zoom).toHaveText('125%');
  await body.press('Control+0');
  await expect(zoom).toHaveText('100%');
  await body.press('-');
  await expect(zoom).toHaveText('80%');
  await body.dispatchEvent('wheel', { deltaY: -120, ctrlKey: true, bubbles: true, cancelable: true });
  await expect.poll(async () => Number.parseInt(await zoom.innerText())).toBeGreaterThan(80);
  await body.press('Control+0');
  await expect(zoom).toHaveText('100%');
  await body.dispatchEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
  await expect(zoom).toHaveText('100%');
  await body.evaluate(() => {
    const start = new Event('gesturestart', { bubbles: true, cancelable: true });
    const change = new Event('gesturechange', { bubbles: true, cancelable: true });
    Object.defineProperty(change, 'scale', { value: 1.5 });
    document.body.dispatchEvent(start);
    document.body.dispatchEvent(change);
  });
  await expect(zoom).toHaveText('150%');
  expect(await layoutWidth()).toBe(width);
  expect((await frame.boundingBox())!.width).toBeCloseTo(width * 1.5, 0);
  await overlay.getByRole('button', { name: /^fit preview$/i }).click();
  await expect.poll(async () => Number.parseInt(await zoom.innerText())).toBeLessThanOrEqual(100);
});
