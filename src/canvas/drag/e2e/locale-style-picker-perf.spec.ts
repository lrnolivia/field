import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';
test('picker drag in Localize popup commits ONCE, not per frame', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LOCALE_3VP');
  await page.keyboard.press('Shift+1');
  await page.waitForTimeout(500);
  await page.evaluate(() => (window as any).__e2e.select(['card'], 'tablet'));
  await page.waitForTimeout(400);
  await page.locator('[data-properties-panel] [data-property-menu="backgroundColor"]').first().click();
  await page.getByRole('button', { name: /^Localize(?: …)?$/ }).click();
  await page.waitForTimeout(600);
  await page.locator('[data-locale-condition] [data-field-motion="color-input"]').first().click();
  await page.waitForTimeout(400);
  // Drag across the saturation square (many pointer moves).
  const paint = page.getByRole('dialog', { name: 'Paint picker', exact: true });
  const square = paint.locator('.cursor-crosshair').first();
  await expect(square).toBeVisible();
  const countWrites = () => page.evaluate(() => (window as any).__e2e.traceEntries('locale-style-popup:write').length);
  const before = await countWrites();
  const box = (await square.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  for (let step = 0; step < 20; step++) {
    await page.mouse.move(box.x + box.width * (0.2 + step * 0.03), box.y + box.height * 0.6);
  }
  expect(await countWrites()).toBe(before);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ((window as any).__e2e.traceEntries?.('locale-style-popup:write') ?? []).length);
  console.log('WRITES-DURING-DRAG', after - before);
  expect(after - before).toBe(1);
});
