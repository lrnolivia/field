import { expect, test } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { project } from './inspector-project';

test('text Fill reports the color that paints the glyphs and can replace it', async ({ page }) => {
  const data = structuredClone(project);
  data.files['app/page.client.tsx'] = data.files['app/page.client.tsx']
    .replace("color: '#f3efe7', fontSize: '38px'", "color: '#000000', WebkitTextFillColor: '#ff3232', fontSize: '38px'");
  await page.addInitScript(projectData => {
    localStorage.setItem('revyme-project-local', JSON.stringify(projectData));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, data);
  await page.goto('/work/local');
  const editor = new EditorPage(page);
  const text = editor.node('text');
  await expect(text).toHaveCSS('-webkit-text-fill-color', 'rgb(255, 50, 50)');
  await editor.select(['text']);
  const fill = page.locator('[data-inspector-section="fill"]');
  await fill.getByRole('button', { name: /FF3232/i }).click();
  const hex = page.getByRole('dialog', { name: 'Paint picker' }).getByRole('textbox').first();
  await hex.fill('000000');
  await hex.press('Enter');
  await expect(text).toHaveCSS('-webkit-text-fill-color', 'rgb(0, 0, 0)');
  await expect(fill.getByRole('button', { name: /000000/i })).toBeVisible();
});
