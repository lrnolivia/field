import { expect, type Page } from '@playwright/test';

export async function openLocalizationSettings(page: Page) {
  await page.getByRole('button', { name: 'Open General settings' }).click();
  const settings = page.locator('[data-settings-overlay]');
  await settings.getByRole('button', { name: /^localization$/i }).click();
  return settings;
}

export async function switchCanvasLanguage(page: Page, language: string) {
  const settings = await openLocalizationSettings(page);
  await settings.getByText(language, { exact: true }).first().click();
  await settings.getByRole('button', { name: /^back$/i }).click();
  await expect(settings).toHaveCount(0);
}
