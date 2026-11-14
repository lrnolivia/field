import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

async function styleValue(editor: EditorPage, prop: string) {
  const code = await editor.getPageCode();
  const tag = code.split('data-id="abs-child"')[1]?.split('</div>')[0] || '';
  return new RegExp(prop + ":\\s*(['\"])" + "(.*?)\\1").exec(tag)?.[2] ?? null;
}

async function openPaintFixture(page: Page, extraStyles = '', foreground = '') {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  seed.files['app/page.client.tsx'] = seed.files['app/page.client.tsx']
    .replace(/background:/g, 'backgroundColor:')
    .replace("backgroundColor: '#66ccff',\n        }}></div>", "backgroundColor: '#66ccff'" + extraStyles + ',\n        }}>' + foreground + '</div>');
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

test('Grid + Mask leaves an independent mask alone through apply, reload and removal', async ({ page }) => {
  const editor = await openPaintFixture(page, ", maskImage: 'linear-gradient(black, transparent)'");
  const layer = editor.node('abs-child');
  const originalMask = await layer.evaluate(el => getComputedStyle(el).maskImage);
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await picker.getByRole('button', { name: 'Pattern kind' }).click();
  await page.getByText('Grid + Mask', { exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('data:image/svg+xml');
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain('gridMask');
  await page.reload();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('data:image/svg+xml');
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
  await editor.select(['abs-child']);
  await page.locator('[data-inspector-section="fill"]').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).maskImage)).toBe(originalMask);
  await expect.poll(() => editor.getPageCode()).not.toContain('data-field-pattern');
});

test('Grid + Mask paints a fading background in Canvas and Preview while foreground stays opaque', async ({ page }) => {
  const editor = await openPaintFixture(page, '', '<div data-id="foreground" style={{position:"absolute", left:"2px", top:"2px", width:"10px", height:"10px", backgroundColor:"#ff00ff"}} />');
  const layer = editor.node('abs-child');
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
  await picker.getByRole('button', { name: 'Pattern kind' }).click();
  await page.getByText('Grid + Mask', { exact: true }).click();
  await expect.poll(() => layer.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('data:image/svg+xml');
  await expect(layer).toHaveCSS('mask-image', 'none');

  // Decode the same CSS image the renderer paints and sample points with the
  // identical offset into a grid tile, one at the center and one at an edge.
  const alpha = await layer.evaluate(async el => {
    const css = getComputedStyle(el).backgroundImage;
    const image = new Image();
    const source = decodeURIComponent(css.slice(css.indexOf(',') + 1, -2));
    image.src = 'data:image/svg+xml,' + encodeURIComponent(source.replace('<svg ', '<svg width="120" height="120" '));
    await image.decode();
    const raster = document.createElement('canvas');
    raster.width = raster.height = 120;
    const ctx = raster.getContext('2d')!;
    ctx.drawImage(image, 0, 0, 120, 120);
    return { center: ctx.getImageData(60, 60, 1, 1).data[3], edge: ctx.getImageData(0, 0, 1, 1).data[3] };
  });
  expect(alpha.center).toBeGreaterThan(100);
  expect(alpha.edge).toBe(0);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'preview', exact: true }).click();
  const preview = page.locator('[data-preview-overlay] iframe').contentFrame();
  const previewLayer = preview.locator('[data-id="abs-child"]');
  await expect(previewLayer).toHaveCSS('mask-image', 'none');
  await expect(previewLayer).toHaveCSS('background-image', /data:image\/svg\+xml/);
  const screenshot = await preview.locator('[data-id="foreground"]').screenshot();
  const pixel = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return Array.from(ctx.getImageData(4, 4, 1, 1).data);
  }, screenshot.toString('base64'));
  expect(pixel).toEqual([255, 0, 255, 255]);
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

test('video source applies and removes a fill without changing frame overflow', async ({ page }) => {
  const editor = await openPaintFixture(page, ", borderRadius: '16px'");
  const host = editor.node('abs-child');
  const overflow = () => host.evaluate(el => getComputedStyle(el).overflow);
  expect(await overflow()).toBe('visible');
  await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Paint picker' });
  await picker.getByRole('button', { name: 'Video', exact: true }).click();
  await picker.getByRole('button', { name: /select source/i }).click();
  const media = page.locator('[data-contextual-media-picker="fill-video"]');
  const url = 'https://example.com/field-fill-test.mp4';
  await media.getByPlaceholder('Or paste a video URL...').fill(url);
  await media.getByRole('button', { name: 'Use', exact: true }).click();
  await expect.poll(() => editor.getPageCode()).toContain(url);
  const video = host.locator('video');
  await expect(video).toHaveAttribute('src', url);
  await expect(video).toHaveCSS('border-radius', '16px');
  expect(await overflow()).toBe('visible');
  await page.keyboard.press('Escape');
  const section = page.locator('[data-inspector-section="fill"]');
  await page.keyboard.press('Meta+d');
  const videos = page.locator('iframe[data-canvas-iframe]').contentFrame().locator('video[data-bg-video]');
  await expect(videos).toHaveCount(2);
  await expect(videos.last()).toHaveAttribute('src', url);
  await section.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(videos).toHaveCount(1);
  await expect(video).toHaveCount(1);

  await editor.select(['abs-child']);
  await section.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(video).toHaveCount(0);
  expect(await overflow()).toBe('visible');
  expect(await styleValue(editor, 'isolation')).toBeNull();
  expect(await styleValue(editor, 'position')).toBe('absolute');
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
