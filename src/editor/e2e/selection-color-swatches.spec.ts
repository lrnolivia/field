import { expect, test } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { project } from './inspector-project';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(data => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, project);
  await page.goto('/work/local');
  await new EditorPage(page).node('frame').waitFor({ state: 'attached' });
});

test('a collapsed selection swatch selects its layer and edits only the matching paint', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.select(['frame']);
  const swatch = page.getByRole('button', { name: 'Select layers and edit fill #f3efe7', exact: true });
  await swatch.click();
  await expect.poll(() => page.evaluate(() => (window as any).__e2e.selection())).toEqual(['text']);
  const picker = page.getByRole('dialog', { name: 'Edit selected fill' });
  await expect(picker).toBeVisible();
  const fill = page.locator('[data-inspector-section="fill"]').getByRole('button', { name: /F3EFE7/i });
  await expect(fill).toBeVisible();
  const hex = picker.getByRole('textbox').first();
  await hex.fill('123456');
  await hex.press('Enter');
  await expect(editor.node('text')).toHaveCSS('color', 'rgb(18, 52, 86)');
  await expect(editor.node('body')).toHaveCSS('color', 'rgb(174, 182, 190)');
});

test('equal and axis Padding each fit on one row; individual sides use a second row', async ({ page }) => {
  await new EditorPage(page).select(['frame']);
  const padding = page.locator('[data-layout-padding]');
  const label = padding.getByText('Padding', { exact: true });
  const values = padding.locator('[data-layout-padding-editor]');
  for (const mode of ['Equal padding', 'Horizontal and vertical padding', 'Individual padding sides']) {
    await padding.getByRole('button', { name: mode, exact: true }).click();
    const labelBox = (await label.boundingBox())!;
    const valueBox = (await values.boundingBox())!;
    const modeBox = (await padding.getByRole('button', { name: mode, exact: true }).boundingBox())!;
    if (mode === 'Individual padding sides') {
      expect(valueBox.y).toBeGreaterThan(modeBox.y + modeBox.height);
      await expect(values.getByRole('textbox')).toHaveCount(4);
    } else {
      expect(Math.abs(valueBox.y + valueBox.height / 2 - labelBox.y - labelBox.height / 2)).toBeLessThan(2);
      await expect(values.getByRole('textbox')).toHaveCount(mode === 'Equal padding' ? 1 : 2);
    }
  }
});
