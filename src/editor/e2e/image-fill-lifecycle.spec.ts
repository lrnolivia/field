// Frame image fill lifecycle on a disposable local project:
// pick + upload → decode → render → source → save → reload → undo.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

async function styleValue(editor: EditorPage, prop: string) {
  const code = await editor.getPageCode();
  const tag = code.split('data-id="abs-child"')[1]?.split('</div>')[0] || '';
  return new RegExp(prop + ":\\s*(['\"])" + '(.*?)\\1').exec(tag)?.[2] ?? null;
}

async function open(page: Page) {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  seed.files['app/page.client.tsx'] = seed.files['app/page.client.tsx'].split('background:').join('backgroundColor:');
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
  const editor = new EditorPage(page);
  await page.goto('/work/local');
  await editor.node('abs-child').waitFor({ state: 'visible' });
  await editor.select(['abs-child']);
  return editor;
}

async function uploadImageFill(page: Page) {
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Image', exact: true }).click();
  await picker.getByRole('button', { name: /select source/i }).click();
  await page.locator('[data-contextual-media-picker="fill-image"] input[type="file"]').setInputFiles('public/tutorial_images/frame.png');
}

/** The painted background actually decodes (not just a url() string). */
async function decodedSize(editor: EditorPage): Promise<{ w: number; h: number }> {
  return editor.node('abs-child').evaluate(async (el) => {
    const bg = getComputedStyle(el).backgroundImage;
    const url = /url\(["']?(.*?)["']?\)/.exec(bg)?.[1];
    if (!url) return { w: 0, h: 0 };
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { return { w: -1, h: -1 }; }
    return { w: img.naturalWidth, h: img.naturalHeight };
  });
}

test('uploaded frame image decodes, renders, saves, survives reload', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await open(page);
  await uploadImageFill(page);
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toContain('url(');
  const src = (await styleValue(editor, 'backgroundImage'))!;
  await expect.poll(async () => (await decodedSize(editor)).w).toBeGreaterThan(0);
  expect(await editor.node('abs-child').evaluate((el) => getComputedStyle(el).backgroundSize)).toBe('cover');

  await expect.poll(
    () => page.evaluate(() => localStorage.getItem('revyme-project-local') ?? ''),
    { timeout: 15_000 },
  ).toContain(src.replace(/^url\(["']?|["']?\)$/g, '').slice(0, 40));
  await page.reload();
  await editor.node('abs-child').waitFor({ state: 'visible', timeout: 60_000 });
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toBe(src);
  await expect.poll(async () => (await decodedSize(editor)).w).toBeGreaterThan(0);
});

test('Canvas preserves an embedded fill URL containing viewport-unit text', async ({ page }) => {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  const image = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2230%22%20height=%2250%22%3E%3Cdesc%3E8vw%3C/desc%3E%3Crect%20width=%2230%22%20height=%2250%22%20fill=%22blue%22/%3E%3C/svg%3E';
  seed.files['app/page.client.tsx'] = seed.files['app/page.client.tsx'].replace(
    /background:\s*['"]#66ccff['"]/i,
    `backgroundImage: 'url("${image}")'`,
  );
  expect(seed.files['app/page.client.tsx']).toContain(image);
  await page.addInitScript(data => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
  await page.goto('/work/local');
  const editor = new EditorPage(page);
  await expect(editor.node('abs-child')).toHaveCSS('background-image', `url("${image}")`);
  await expect.poll(() => decodedSize(editor)).toEqual({ w: 30, h: 50 });
});

test('one undo removes the applied image fill and restores the colour', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await open(page);
  const before = await editor.getPageCode();
  await uploadImageFill(page);
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toContain('url(');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await editor.select(['abs-child']);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect.poll(() => editor.getPageCode()).toBe(before);
});

test('a pattern chosen from the catalog persists across reload', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await open(page);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await picker.getByRole('button', { name: /select (?:pattern )?source/i }).click();
  const catalog = page.locator('[data-pattern-source-catalog]');
  await catalog.getByRole('textbox', { name: 'Search pattern library' }).fill('waves');
  await catalog.getByRole('button', { name: 'Waves - 1', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).toContain('waves-1');
  await expect.poll(
    () => page.evaluate(() => localStorage.getItem('revyme-project-local') ?? ''),
    { timeout: 15_000 },
  ).toContain('waves-1');
  await page.reload();
  await editor.node('abs-child').waitFor({ state: 'visible', timeout: 60_000 });
  await expect.poll(() => editor.getPageCode()).toContain('waves-1');
  await expect.poll(() => editor.node('abs-child').evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('url(');
});
