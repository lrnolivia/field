import { test, expect } from '@playwright/test';
import { project } from './inspector-project';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ viewport: { width: 1440, height: 1000 }, contextOptions: { reducedMotion: 'reduce' }, hasTouch: true });
for (const theme of ['light', 'dark']) {
  test(`${theme}: retired highlights migrate to Current while Appearance persists without document writes`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (localStorage.getItem('field:test:appearance-seeded')) return;
      localStorage.setItem('field:test:appearance-seeded', 'true');
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(mode));
      localStorage.setItem('field:prefs:innerHighlight', JSON.stringify(mode === 'light' ? 'buttons' : 'everywhere'));
    }, theme);
    const editor = new EditorPage(page); await editor.gotoWithSeed('LOCALE_TEXT');
    await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
    const before = await editor.getPageCode();
    await expect(page.locator('html')).toHaveAttribute('data-inner-highlight', 'current');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:innerHighlight') ?? 'null'))).toBe('current');
    await expect(page.locator('[data-website-preview-appearance]')).toHaveCount(0);
    await page.locator('[data-editor-appearance]').click();
    const appearance = page.locator('[data-field-appearance-popover]');
    await expect(appearance).toBeVisible();
    await expect(page.locator('[data-appearance-inner-highlight]')).toHaveCount(0);
    await appearance.getByRole('switch', { name: /light \/ dark/i }).click();
    const mode = theme === 'light' ? 'dark' : 'light';
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
    await appearance.locator('[data-appearance-swatch="teal"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-field-theme', 'teal');
    await page.screenshot({ path: `../screenshots/field-current-appearance-${theme}.png` });
    await page.reload();
    await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-inner-highlight', 'current');
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
    await expect(page.locator('html')).toHaveAttribute('data-field-theme', 'teal');
    expect(await editor.getPageCode()).toBe(before);
  });
  test(`${theme}: Gold expanded parent glyph keeps its color when the pointer enters its submenu`, async ({ page }) => {
    await page.addInitScript(mode => {
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(mode));
      localStorage.setItem('revyme:prefs:builderTheme', JSON.stringify('gold'));
    }, theme);
    const editor = new EditorPage(page); await editor.gotoWithSeed('LOCALE_TEXT');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const view = page.getByRole('menuitem', { name: /^view$/i });
    await view.hover();
    await expect(view).toHaveAttribute('aria-expanded', 'true');
    const glyph = view.locator('[data-field-menu-item-glyph]');
    const expandedColor = await glyph.evaluate(el => getComputedStyle(el).color);
    expect(expandedColor).toBe('rgb(137, 102, 0)');
    await page.getByRole('menuitem', { name: /^zoom in/i }).hover();
    await expect(view).toHaveAttribute('aria-expanded', 'true');
    expect(await glyph.evaluate(el => getComputedStyle(el).color)).toBe(expandedColor);
    await page.screenshot({ path: `../screenshots/field-gold-expanded-${theme}.png` });
  });
}
test('phone first text tap edits in place with shared horizontally scrollable controls and real top-bar menus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const editor = new EditorPage(page); await editor.gotoWithSeed('LOCALE_TEXT');
  await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
  const before = await editor.getPageCode();
  await page.locator('[data-portrait-workspace]').getByRole('button', { name: 'Open menu', exact: true }).click();
  const menu = page.getByRole('menu').first(); await expect(menu).toBeVisible();
  const topbar = await page.locator('.field-portrait-topbar').boundingBox();
  const menuBox = await menu.boundingBox(); expect(menuBox!.y).toBeGreaterThanOrEqual(topbar!.y + topbar!.height - 4);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Project menu for/ }).click();
  await expect(page.getByRole('menuitem', { name: /Project settings/i })).toBeVisible();
  await page.keyboard.press('Escape');
  const text = editor.node('intro');
  await expect(text).toBeVisible();
  const textBox = await text.boundingBox();
  expect(textBox).not.toBeNull();
  await page.touchscreen.tap(textBox!.x + Math.min(textBox!.width / 2, 48), textBox!.y + textBox!.height / 2);
  const toolbar = page.locator('[data-field-mobile-text-toolbar]'); await expect(toolbar).toBeVisible();
  await expect(page.locator('[data-portrait-surface="inspect"]')).toHaveCount(0);
  const editable = editor.sandbox().locator('.ProseMirror[contenteditable="true"]');
  await expect(editable).toBeVisible(); await expect(editable).toBeFocused();
  const strip = toolbar.locator('[data-mobile-text-controls]');
  expect(await strip.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  expect((await toolbar.boundingBox())!.height).toBeLessThan(150);
  // The first tap selects the text. ArrowRight collapses to its end on both
  // macOS and Linux; macOS End scrolls without collapsing that selection.
  await editable.press('ArrowRight');
  expect(await editable.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);
  await editable.pressSequentially(' hello');
  await toolbar.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toolbar).toHaveCount(0);
  await expect.poll(() => editor.getPageCode()).toContain('Painter hello');
  await page.keyboard.press('Meta+z');
  await expect.poll(() => editor.getPageCode()).toBe(before);
  await page.screenshot({ path: '../screenshots/field-combined-mobile-after-text.png' });
});

for (const theme of ['light', 'dark']) for (const layout of ['docked', 'floating']) {
  test(`${theme} ${layout}: all Inspector families fill their rows at narrow and wide widths`, async ({ page }) => {
    await page.addInitScript(({ project, theme, layout }) => {
      localStorage.setItem('revyme-project-local', JSON.stringify(project));
      localStorage.setItem('revyme-onboarding-completed', 'true');
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
      localStorage.setItem('field:prefs:workspaceMode', JSON.stringify(layout));
    }, { project, theme, layout });
    await page.goto('/work/local');
    await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
    const editor = new EditorPage(page);
    if (layout === 'floating') await page.getByRole('button', { name: /^open design inspector$/i }).click();
    const pane = page.locator('[data-workspace-right-body]'); await expect(pane).toBeVisible();
    for (const width of [300, 480]) {
      const current = (await pane.boundingBox())!.width;
      const handle = page.locator('[data-workspace-resize="right"]'); const box = (await handle.boundingBox())!;
      const y = box.y + Math.min(300, box.height - 20);
      await page.mouse.move(box.x + box.width / 2, y); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + current - width, y, { steps: 3 }); await page.mouse.up();
      await expect.poll(() => pane.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width);
      for (const ids of [['box'], ['frame'], ['text'], ['image'], ['svg'], ['component'], ['code-component'], ['box', 'text'], ['root'], ['video'], ['audio'], ['form'], ['input'], ['collection-list'], ['overlay']]) {
        await editor.select(ids);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const bad = await pane.evaluate(el => Array.from(el.querySelectorAll<HTMLElement>('[data-inspector-section-card], [data-inspector-section-content], [data-inspector-peer-row], [data-inspector-paint-row], [data-inspector-effect-row], [data-layout-size-pair]')).filter(row => row.getBoundingClientRect().width > 0).flatMap(row => {
          const box = row.getBoundingClientRect(); const parent = el.getBoundingClientRect();
          const overflow = row.scrollWidth > row.clientWidth + 1;
          const outside = box.left < parent.left - 1 || box.right > parent.right + 1;
          const values = row.matches('[data-inspector-paint-row], [data-inspector-effect-row], [data-layout-size-pair]') ? Array.from(row.children).filter(child => child.getBoundingClientRect().width > 0) : [];
          const gap = values.length ? Math.abs(values[values.length - 1]!.getBoundingClientRect().right - box.right) : 0;
          return overflow || outside || gap > 1 ? [{ row: row.outerHTML.slice(0, 160), overflow, outside, gap }] : [];
        }));
        expect(bad, `${theme}/${layout}/${width}/${ids.join(',')}`).toEqual([]);
      }
      await editor.select(['frame']);
      await pane.screenshot({ path: `../screenshots/field-combined-${theme}-${layout}-${width}.png` });
    }
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: pattern source browses the catalog first and keeps image import secondary`, async ({ page }) => {
    const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
    seed.files['app/page.client.tsx'] = seed.files['app/page.client.tsx'].split('background:').join('backgroundColor:');
    await page.addInitScript(({ seed, theme }) => {
      localStorage.setItem('revyme-project-local', JSON.stringify(seed));
      localStorage.setItem('revyme-onboarding-completed', 'true');
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
    }, { seed, theme });
    const editor = new EditorPage(page);
    await page.goto('/work/local');
    await editor.node('abs-child').waitFor({ state: 'visible' });
    await editor.select(['abs-child']);
    await page.locator('[data-inspector-section="fill"] button').filter({ hasText: /^66CCFF$/i }).click();
    const picker = page.getByRole('dialog', { name: 'Paint picker' });
    await picker.getByRole('button', { name: 'Pattern', exact: true }).click();
    await expect.poll(() => editor.getPageCode()).toContain('data-field-pattern');
    const before = await editor.getPageCode();
    await picker.getByRole('button', { name: /select (?:pattern )?source/i }).click();
    const catalog = page.locator('[data-pattern-source-catalog]');
    await expect(catalog.getByRole('textbox', { name: 'Search pattern library' })).toBeVisible();
    await expect(page.locator('[data-contextual-media-picker="fill-pattern"]')).toHaveCount(0);
    await expect(catalog.getByRole('button', { name: 'Use an image…' })).toBeVisible();
    await catalog.getByRole('textbox', { name: 'Search pattern library' }).fill('waves');
    await expect(catalog.getByRole('button', { name: 'Waves - 1', exact: true })).toBeVisible();
    await page.screenshot({ path: `../screenshots/field-pattern-source-${theme}.png` });
    expect(await editor.getPageCode()).toBe(before);
    await catalog.getByRole('button', { name: 'Waves - 1', exact: true }).click();
    await expect(catalog).toHaveCount(0);
    await expect.poll(() => editor.getPageCode()).toContain('waves-1');
    await expect.poll(() => editor.node('abs-child').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('url(');
    const selected = await editor.getPageCode();
    await picker.getByRole('button', { name: /select (?:pattern )?source/i }).click();
    await catalog.getByRole('button', { name: 'Use an image…' }).click();
    await expect(page.locator('[data-contextual-media-picker="fill-pattern"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(catalog).toBeVisible();
    expect(await editor.getPageCode()).toBe(selected);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+z');
    await expect.poll(() => editor.getPageCode()).toBe(before);
  });
}
