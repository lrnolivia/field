import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('PaintPicker and Inspector own their rendered compact surfaces', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.select(['hero']);
  await page.getByRole('button', { name: 'Add fill', exact: true }).click();
  const header = page.locator('[data-workspace-right-header]').first();
  await expect(header).toBeVisible();
  const chrome = await header.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderBottomWidth }));
  expect(chrome.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(chrome.border).toBe('1px');
  await page.locator('[data-properties-panel] [data-inspector-paint-value] button').first().click();
  const picker = page.getByRole('dialog', { name: 'Paint picker', exact: true });
  await expect(picker).toBeVisible();
  await expect.poll(async () => (await picker.boundingBox())!.width).toBeCloseTo(304, 0);
  await picker.getByRole('button', { name: /^Color Overlay/ }).click();
  const saturation = picker.locator('.cursor-crosshair').first();
  await expect(saturation).toBeVisible();
  await expect.poll(async () => (await saturation.boundingBox())!.height).toBe(176);
});

test('toolbar and Media cards render the same names-only geometry', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.locator('[data-toolbar-tool="media"]').click();

  const media = page.locator('[data-media-launcher-card]').first();
  await expect(media).toBeVisible();
  const geometry = async (selector: string) => page.locator(selector).first().evaluate(el => {
    const card = el.getBoundingClientRect();
    const icon = el.querySelector('[data-media-action-card-icon]')!.getBoundingClientRect();
    return { height: card.height, iconWidth: icon.width, iconHeight: icon.height };
  });
  const expected = { height: 36, iconWidth: 24, iconHeight: 24 };
  await expect.poll(() => geometry('[data-media-launcher-card]')).toEqual(expected);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /frame.*options/i }).click();
  await expect(page.locator('[data-toolbar-menu-tile]').first()).toBeVisible();
  await expect.poll(() => geometry('[data-toolbar-menu-tile]')).toEqual(expected);
});
