import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

async function styleValue(editor: EditorPage, prop: string) {
  const code = await editor.getPageCode();
  const tag = code.split('data-id="abs-child"')[1]?.split('</div>')[0] || '';
  return new RegExp(prop + ":\\s*(['\"])" + "(.*?)\\1").exec(tag)?.[2] ?? null;
}

async function openPaintFixture(page: Page, extraStyles = '') {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  seed.files['app/page.client.tsx'] = seed.files['app/page.client.tsx']
    .replace(/background:/g, 'backgroundColor:')
    .replace("backgroundColor: '#66ccff'", "backgroundColor: '#66ccff'" + extraStyles);
  await page.addInitScript(data => {
    if (!localStorage.getItem('revyme-project-local')) {
      localStorage.setItem('revyme-project-local', JSON.stringify(data));
    }
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
  const editor = new EditorPage(page);
  await page.goto('/work/local');
  await editor.node('abs-child').waitFor({ state: 'visible' });
  await editor.select(['abs-child']);
  return editor;
}


test('changing to gradient applies a paint and keeps the picker available for edits', async ({ page }) => {
  const editor = await openPaintFixture(page);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Gradient', exact: true }).click();
  await expect(picker).toBeVisible();
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toContain('linear-gradient');
  await picker.getByRole('button', { name: 'Rotate gradient', exact: true }).click();
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toContain('270deg');
  await picker.getByRole('button', { name: 'Image', exact: true }).click();
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Image', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(picker.getByRole('button', { name: /select source/i })).toBeVisible();
});

test('pattern fill applies to source and canvas and keeps an independent mask', async ({ page }) => {
  const editor = await openPaintFixture(page, ", maskImage: 'linear-gradient(black, transparent)'");
  const layer = editor.node('abs-child');
  const originalMask = await layer.evaluate(el => getComputedStyle(el).maskImage);
  expect(originalMask).toContain('linear-gradient');
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await expect(picker).toBeVisible();
  await expect.poll(() => editor.getPageCode()).toContain('data-field-pattern');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe('none');
  const scale = picker.getByRole('textbox', { name: 'Pattern scale', exact: true });
  await scale.fill('24');
  await scale.press('Enter');
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).backgroundSize)).toContain('24px');
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
  await picker.getByRole('button', { name: 'Solid', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).not.toContain('data-field-pattern');
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
});

test('removing Grid + Mask after reload restores the original mask', async ({ page }) => {
  const editor = await openPaintFixture(page, ", maskImage: 'linear-gradient(black, transparent)'");
  const layer = editor.node('abs-child');
  const originalMask = await layer.evaluate(el => getComputedStyle(el).maskImage);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await picker.getByRole('button', { name: 'Pattern kind' }).click();
  await page.getByText('Grid + Mask', { exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toContain('radial-gradient');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain('data-field-pattern-style-backup');
  await page.reload();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toContain('radial-gradient');
  await editor.select(['abs-child']);
  await page.locator('[data-inspector-section="fill"]').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
  await expect.poll(() => editor.getPageCode()).not.toContain('data-field-pattern');
});

test('shadow, inner shadow, layer blur and background blur write the selected object', async ({ page }) => {
  const editor = await openPaintFixture(page);
  for (const name of ['drop shadow', 'inner shadow', 'layer blur', 'background blur']) {
    await page.getByRole('button', { name: 'Add effect', exact: true }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  }
  await expect.poll(() => styleValue(editor, 'boxShadow')).toContain('inset');
  await expect.poll(() => styleValue(editor, 'filter')).toBe('blur(8px)');
  await expect.poll(() => styleValue(editor, 'backdropFilter')).toBe('blur(8px)');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).boxShadow)).toContain('inset');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).filter)).toBe('blur(8px)');
  await page.getByRole('button', { name: 'Drop shadow', exact: true }).click();
  const shadow = page.getByRole('dialog', { name: 'Shadow', exact: true });
  await shadow.getByRole('textbox', { name: 'Shadow X', exact: true }).fill('16');
  await shadow.getByRole('textbox', { name: 'Shadow X', exact: true }).press('Enter');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).boxShadow)).toContain('16px');
});

test('image source upload applies a real image to the selected object', async ({ page }) => {
  const editor = await openPaintFixture(page);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Image', exact: true }).click();
  await picker.getByRole('button', { name: /select source/i }).click();
  await page.locator('[data-contextual-media-picker="fill-image"] input[type="file"]').setInputFiles('public/tutorial_images/frame.png');
  await expect.poll(() => styleValue(editor, 'backgroundImage')).toContain('url(');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('url(');
  await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).backgroundSize)).toBe('cover');
});

test('video source produces the selected object video fill', async ({ page }) => {
  const editor = await openPaintFixture(page);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Video', exact: true }).click();
  await picker.getByRole('button', { name: /select source/i }).click();
  const media = page.locator('[data-contextual-media-picker="fill-video"]');
  const url = 'https://example.com/field-fill-test.mp4';
  await media.getByPlaceholder('Or paste a video URL...').fill(url);
  await media.getByRole('button', { name: 'Use', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).toContain(url);
  await expect(editor.node('abs-child').locator('video')).toHaveAttribute('src', url);
});

test('shader gallery installs a visible shader fill and retains its editor', async ({ page }) => {
  const editor = await openPaintFixture(page, ", overflow: 'visible', isolation: 'auto'");
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Shader', exact: true }).click();
  await page.getByRole('button', { name: 'Mesh Gradient', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).toContain('data-field-shader-fill');
  await expect.poll(() => editor.getPageCode()).toContain('data-field-shader-layer');
  await expect(editor.node('abs-child').locator('canvas')).toBeVisible();
  expect(await styleValue(editor, 'overflow')).toBe('visible');
  expect(await styleValue(editor, 'isolation')).toBe('isolate');
  await expect(picker).toBeVisible();
  await page.screenshot({ path: '/tmp/field-shader-fill-after.png' });
  await page.keyboard.press('Escape');
  // History groups edits made within 300ms into one step; a person can't
  // install and remove a shader that fast, so step past the window before
  // removing — otherwise one undo reverts both and lands on the solid fill.
  await page.waitForTimeout(400);
  await page.locator('[data-inspector-section="fill"]').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).not.toContain('data-field-shader-layer');
  expect(await styleValue(editor, 'overflow')).toBe('visible');
  expect(await styleValue(editor, 'isolation')).toBe('auto');
  expect(await styleValue(editor, 'position')).toBe('absolute');
  await page.waitForTimeout(400);
  await expect(editor.node('abs-child').locator('canvas')).toHaveCount(0);
  await page.keyboard.press('Meta+z');
  await expect.poll(() => editor.getPageCode()).toContain('data-field-shader-layer');
  await expect(editor.node('abs-child').locator('canvas')).toBeVisible();
});

test('switching away from a saved Shader restores frame styling and keeps newer edits', async ({ page }) => {
  const editor = await openPaintFixture(page, ", overflow: 'visible', isolation: 'auto'");
  const section = page.locator('[data-inspector-section="fill"]');
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  const layer = editor.node('abs-child');
  await section.getByRole('button', { name: /^66CCFF$/i }).click();
  await picker.getByRole('button', { name: 'Shader', exact: true }).click();
  await page.getByRole('button', { name: 'Mesh Gradient', exact: true }).click();
  await expect(layer.locator('canvas')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clip content', exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).overflow)).toBe('hidden');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain('data-field-shader-style-backup');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain("overflow: 'hidden'");
  await page.reload();
  await expect(layer.locator('canvas')).toBeVisible();
  await editor.select(['abs-child']);
  await section.getByRole('button', { name: /^Shader/i }).click();
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await expect(layer.locator('canvas')).toHaveCount(0);
  await expect.poll(() => styleValue(editor, 'isolation')).toBe('auto');
  expect(await styleValue(editor, 'overflow')).toBe('hidden');
  await expect.poll(() => editor.getPageCode()).toContain('data-field-pattern');
  await expect.poll(() => editor.getPageCode()).not.toContain('data-field-shader-');
});
