import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';
test('open Localize popup reseeds Set when the artboard switches', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LOCALE_3VP');
  await page.keyboard.press('Shift+1');
  await page.waitForTimeout(500);
  // Localize Fill on desktop, set a distinct French value.
  await page.evaluate(() => (window as any).__e2e.select(['card'], 'desktop'));
  await page.waitForTimeout(400);
  await page.locator('[data-properties-panel] [data-property-menu="backgroundColor"]').first().click();
  await page.getByRole('button', { name: /^Localize(?: …)?$/ }).click();
  await page.waitForTimeout(600);
  await page.locator('[data-locale-condition] [data-field-motion="color-input"]').first().click();
  const hexInput = page.getByRole('dialog', { name: 'Paint picker', exact: true }).locator('input').first();
  await hexInput.fill('FF0044');
  await hexInput.press('Enter');
  await page.getByRole('dialog', { name: 'Paint picker', exact: true }).getByRole('button', { name: 'Close Paint picker', exact: true }).click();
  await expect(page.locator('[data-locale-style-popup]')).toBeVisible();
  await page.waitForTimeout(300);
  // Give the TABLET its own band value, then desktop again with popup open.
  await page.evaluate(() => (window as any).__e2e.select(['card'], 'tablet'));
  await page.waitForTimeout(500);
  // The open popup must now show the TABLET's effective value in Set —
  // which is the inherited FF0044 (no band yet). Write a tablet-only value:
  await page.locator('[data-locale-condition] [data-field-motion="color-input"]').first().click();
  const hex2 = page.getByRole('dialog', { name: 'Paint picker', exact: true }).locator('input').first();
  await hex2.fill('00AA55');
  await hex2.press('Enter');
  await page.getByRole('dialog', { name: 'Paint picker', exact: true }).getByRole('button', { name: 'Close Paint picker', exact: true }).click();
  await page.waitForTimeout(400);
  // Switch back to desktop with the popup still open → Set reseeds to FF0044.
  await page.evaluate(() => (window as any).__e2e.select(['card'], 'desktop'));
  await page.waitForTimeout(500);
  const swatchText = await page.locator('[data-locale-condition] [data-field-motion="color-input"]').first().innerText();
  console.log('SET-SHOWS ' + JSON.stringify(swatchText));
  expect(swatchText.toUpperCase()).toContain('FF0044');
});
