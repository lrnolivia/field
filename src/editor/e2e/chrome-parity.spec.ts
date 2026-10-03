import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('shared glyph strokes respond in toolbar and portaled Settings and respect reduced motion', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const toolbar = page.locator('[data-toolbar-tool="frame"]');
  const stroke = toolbar.locator('svg path').first();
  await toolbar.hover();
  await expect.poll(() => stroke.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  await page.mouse.move(10, 10);
  await expect.poll(() => stroke.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await toolbar.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => stroke.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => stroke.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: /Open General settings/i }).click();
  const nav = page.locator('[data-settings-overlay]').getByRole('button', { name: 'canvas', exact: true });
  await nav.hover();
  await expect.poll(() => nav.locator('svg path').first().evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
});

test('Text cards use Field strokes that reshape on hover and keyboard focus', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: /^draw text \(t\) options$/i }).click();
  const menu = page.locator('[data-toolbar-dropdown]');
  const card = menu.locator('[data-media-action-card]').filter({ hasText: 'paragraph' });
  const line = card.locator('[data-field-text-glyph="paragraph"] path').first();
  const rest = await line.getAttribute('d');
  await card.hover();
  await expect.poll(() => line.getAttribute('d')).not.toBe(rest);
  await page.mouse.move(10, 10);
  await expect.poll(() => line.getAttribute('d')).toBe(rest);
  await card.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(card).toBeFocused();
  await expect.poll(() => line.getAttribute('d')).not.toBe(rest);
  await page.waitForTimeout(350);
  await menu.screenshot({ path: '/tmp/field-text-glyph-review.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await editor.sandbox().locator('[data-viewport]').first().waitFor({ state: 'attached' });
  await page.getByRole('button', { name: /^draw text \(t\) options$/i }).click();
  await page.waitForTimeout(350);
  const staticPath = await line.getAttribute('d');
  await card.hover();
  await page.waitForTimeout(350);
  expect(await line.getAttribute('d')).toBe(staticPath);
});

test('Media browse sits last, with faint empty glyphs and the latest uploaded image thumbnails', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.locator('[data-toolbar-tool="media"]').click();
  const launcher = page.locator('[data-media-launcher]');
  await expect(launcher).toBeVisible();
  const previews = launcher.locator('[data-media-launcher-preview]');
  await expect(previews).toHaveCount(3);
  expect(await previews.first().evaluate(el => getComputedStyle(el).borderTopColor)).toMatch(/(?:0\.15\)|\/ 0\.15\))/);
  expect(await previews.first().locator('span').evaluate(el => getComputedStyle(el).opacity)).toBe('0.25');
  expect(await launcher.evaluate(el => el.lastElementChild?.hasAttribute('data-media-launcher-featured'))).toBe(true);
  await page.waitForTimeout(350);
  await launcher.screenshot({ path: '/tmp/field-media-empty-review.png' });
  for (let index = 0; index < 4; index++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="${['#26798b','#95435c','#917624','#42566e'][index]}"/><circle cx="${65 + index * 24}" cy="72" r="43" fill="#e7dbca"/><path d="M0 180L80 112L142 157L194 93L240 180" fill="#202632"/></svg>`;
    await page.locator('[data-media-upload-input]').setInputFiles({ name: `review-${index}.svg`, mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await expect(launcher).toHaveCount(0);
    await page.locator('[data-toolbar-tool="media"]').click();
    await expect(previews.locator('img')).toHaveCount(Math.min(index + 1, 3));
  }
  await expect.poll(() => previews.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.waitForTimeout(350);
  await launcher.screenshot({ path: '/tmp/field-media-populated-review.png' });
});

test('toolbar menus identify their content and expand to the corresponding Insert panel', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: 'shape tools options', exact: true }).click();
  const menu = page.locator('[data-toolbar-dropdown]');
  await expect(menu.locator('[data-toolbar-menu-header]')).toContainText('shapes');
  await expect(menu.locator('[data-toolbar-menu-header-glyph] svg')).toBeVisible();
  expect(await menu.locator('[data-toolbar-menu-option]').first().evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
  const commands = await menu.locator('[data-toolbar-menu-option]').first().boundingBox();
  const cards = await menu.locator('[data-toolbar-mixed-cards]').boundingBox();
  expect(commands!.y).toBeLessThan(cards!.y);
  await page.screenshot({ path: '/tmp/field-toolbar-menu-review.png' });
  const source = await editor.getPageCode();
  await menu.getByRole('button', { name: 'open shapes panel', exact: true }).click();
  const insert = page.locator('[data-toolbar-panel]');
  await expect(insert).toBeVisible();
  await expect(insert.locator('[data-insert-card]').first()).toBeVisible();
  await expect(menu).toHaveCount(0);
  expect(await editor.getPageCode()).toBe(source);
});

test('floating sections share a continuous surface and docked compact Inspector has no top outline', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('floating')));
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: 'Pages & Layers', exact: true }).click();
  const pages = page.locator('[data-floating-left-panel] [data-document-pages]');
  await expect(pages).toBeVisible();
  for (const selector of ['[data-document-pages]', '[data-document-layers]']) {
    const style = await page.locator(`[data-floating-left-panel] ${selector}`).evaluate(el => ({ edge:getComputedStyle(el, '::after').content, shadow:getComputedStyle(el).boxShadow }));
    expect(style).toEqual({ edge:'none', shadow:'none' });
  }
  const outline = page.locator('[data-field-floating-outline]').first();
  expect(await outline.evaluate(el => getComputedStyle(el, '::after').borderTopWidth)).toBe('1px');
  await editor.select(['hero']);
  await page.waitForTimeout(350);
  await page.screenshot({ path: '/tmp/field-floating-continuous-review.png' });
  await page.evaluate(() => localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked')));
  await page.addInitScript(() => localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked')));
  // Reload reads the preference into the workspace store.
  await page.reload();
  await editor.node('hero').waitFor({ state:'visible' });
  await page.locator('[data-workspace-collapse][data-side="right"]').first().click();
  const compact = page.locator('[data-workspace-right-toggle]');
  await expect(compact).toHaveAttribute('data-detached', 'false');
  expect(await compact.evaluate(el => getComputedStyle(el, '::after').content)).toBe('none');
});

test('Insert glyphs use bright accents and animated previews fill their pills', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('revyme:prefs:builderTheme', JSON.stringify('pink'));
    localStorage.setItem('revyme:prefs:themeMode', JSON.stringify('dark'));
  });
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.locator('[data-left-menu-item="insert"]').click();
  await page.getByRole('button', { name: 'Integrations', exact: true }).hover();
  const form = page.locator('[data-toolbar-item="custom-form"]');
  await expect(form).toBeVisible();
  const pill = form.locator('[data-media-action-card-icon]');
  const glyphColor = await pill.evaluate(el => getComputedStyle(el).color);
  expect(await pill.locator('rect').first().evaluate(el => getComputedStyle(el).stroke)).toBe(glyphColor);
  expect(glyphColor).not.toBe('rgb(255, 255, 255)');
  expect(await pill.evaluate(el => getComputedStyle(el).boxShadow)).toContain('inset');
  await page.screenshot({ path: '/tmp/field-insert-accent-pills.png' });
  await page.getByRole('button', { name: 'Backgrounds', exact: true }).hover();
  const preview = page.locator('[data-insert-preview="shaderWaveGradient"]').first();
  await expect(preview).toBeVisible();
  const previewSize = await preview.boundingBox();
  const pillSize = await preview.locator('xpath=ancestor::span[@data-media-action-card-icon]').boundingBox();
  expect(previewSize!.width).toBeGreaterThan(pillSize!.width - 3);
  expect(previewSize!.height).toBeGreaterThan(pillSize!.height - 3);
  const illustration = preview.locator('div').first();
  const before = await illustration.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => illustration.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await page.screenshot({ path: '/tmp/field-animated-preview-pills.png' });
  await page.getByRole('button', { name: 'Icons', exact: true }).hover();
  const pack = page.locator('[data-card-tone="neutral"]').first();
  await expect(pack.locator('img')).toBeVisible();
  await expect.poll(() => pack.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.waitForTimeout(350);
  await page.screenshot({ path: '/tmp/field-neutral-icon-pills.png' });
});

test('Settings saves preferences live and Save confirms and closes', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: /Open General settings/i }).click();
  const settings = page.locator('[data-settings-overlay]');
  await expect(settings).toBeVisible();
  await settings.getByRole('button', { name: 'canvas', exact: true }).click();
  const toggle = settings.locator('div').filter({ has: page.getByText('Show rulers', { exact: true }) }).filter({ has: page.locator('button[aria-pressed]') }).last().locator('button[aria-pressed]');
  const before = await toggle.getAttribute('aria-pressed');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  const expected = before !== 'true';
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('revyme:prefs:showRulers') ?? 'null'))).toBe(expected);
  await page.screenshot({ path: '/tmp/field-settings-save.png' });
  await settings.getByRole('button', { name: /^save$/i }).click();
  await expect(settings).toHaveCount(0);
  await expect(page).not.toHaveURL(/settings=/);
  await page.reload();
  await editor.sandbox().locator('[data-viewport]').first().waitFor({ state: 'attached' });
  await page.getByRole('button', { name: /Open General settings/i }).click();
  await settings.getByRole('button', { name: 'canvas', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', String(expected));
});

test('appearance keeps its rich controls and cascades beside its menu row', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const appearance = page.getByRole('menuitem', { name: 'appearance', exact: true });
  await appearance.hover();
  const popup = page.locator('[data-field-appearance-popover]');
  await expect(popup).toBeVisible();
  const row = await appearance.boundingBox(), panel = await popup.boundingBox();
  expect(panel!.x).toBeGreaterThan(row!.x + row!.width);
  expect(Math.abs(panel!.y - row!.y)).toBeLessThan(2);
  const before = await page.evaluate(() => localStorage.getItem('revyme:prefs:builderTheme'));
  const teal = popup.getByRole('button', { name: 'aqua teal', exact: true });
  await teal.hover();
  await expect(popup.locator('[data-appearance-preview]')).toContainText('aqua teal');
  expect(await page.evaluate(() => localStorage.getItem('revyme:prefs:builderTheme'))).toBe(before);
  await teal.focus();
  await page.keyboard.press('Enter');
  await expect(teal).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-field-theme', 'teal');
  const mode = popup.getByRole('switch');
  const wasDark = await mode.getAttribute('aria-checked');
  await mode.click();
  await expect(mode).toHaveAttribute('aria-checked', wasDark === 'true' ? 'false' : 'true');
  await page.screenshot({ path: '/tmp/field-appearance-after.png' });
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-field-theme', 'teal');
});

test('Inspector removes Prototype navigation, retains useful controls and shares borderless sections', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.select(['hero']);
  const panel = page.locator('[data-properties-panel]').first();
  await expect(panel.getByRole('tab', { name: /prototype/i })).toHaveCount(0);
  await expect(panel.locator('[data-inspector-group="behavior"]')).toHaveCount(1);
  await expect(panel.locator('[data-inspector-section-card]').first()).toBeVisible();
  expect(await panel.locator('[data-inspector-section-card]').first().evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px');
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/field-chrome-after.png' });
});


test('compact Inspector mirrors every full category, updates with selection and opens the chosen section', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  for (const id of ['hero', 'abs-child']) {
    await editor.select([id]);
    const full = await page.locator('[data-properties-panel] [data-inspector-section]').evaluateAll(elements => [...new Set(elements.map(el => el.getAttribute('data-inspector-section')))]);
    const source = await editor.getPageCode();
    await page.locator('[data-workspace-collapse][data-side="right"]').first().click();
    await expect.poll(() => page.locator('[data-inspector-compact-category]').evaluateAll(elements => elements.map(el => el.getAttribute('data-inspector-compact-category')))).toEqual(full);
    expect(await editor.getPageCode()).toBe(source);
    await page.locator('[data-inspector-compact-category="fill"]').click();
    await expect(page.locator('[data-inspector-section="fill"] [data-inspector-section-header] button').first()).toBeFocused();
    await expect(page.locator('[data-inspector-category-source]')).toHaveCount(0);
  }
  await page.locator('[data-workspace-collapse][data-side="right"]').first().click();
  await editor.select(['hero']);
  await expect(page.locator('[data-inspector-compact-category="layout"]')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/field-compact-inspector-after.png' });
});
