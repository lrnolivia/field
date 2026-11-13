import { expect, test } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('the first undo removes a duplicated page and redo restores both files', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');

  const original = page.locator('[data-field-page-row][data-active="true"]');
  await original.hover();
  await original.getByRole('button').click();
  await page.getByRole('menuitem', { name: /^duplicate page$/i }).click();

  const clientPath = 'app/page-copy/page.client.tsx';
  const serverPath = 'app/page-copy/page.tsx';
  const files = () => page.evaluate(() => (window as any).__e2e.listFiles()) as Promise<string[]>;
  const copy = page.locator('[data-field-page-row]').filter({ hasText: /page[- ]copy/i });
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

  await expect(copy).toHaveAttribute('data-active', 'true');
  expect(await files()).toEqual(expect.arrayContaining([clientPath, serverPath]));

  await page.keyboard.press(`${mod}+z`);
  await expect(copy).toHaveCount(0);
  expect(await files()).not.toContain(clientPath);
  expect(await files()).not.toContain(serverPath);
  expect(await files()).toContain('app/page.client.tsx');

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(copy).toHaveAttribute('data-active', 'true');
  expect(await files()).toEqual(expect.arrayContaining([clientPath, serverPath]));
});
