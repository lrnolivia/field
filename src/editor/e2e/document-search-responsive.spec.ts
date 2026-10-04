import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

type SeedWindow = Window & { __e2e: { listFiles: () => string[]; readFile: (path: string) => string | null; selection: () => string[]; openFile: (path: string) => void } };

test.use({ viewport: { width: 1600, height: 1100 }, contextOptions: { reducedMotion: 'reduce' } });

async function fullLayout(page: Page) {
  await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
  const chooser = page.locator('[data-workspace-layout-control]:visible').first();
  if (await chooser.locator('[data-workspace-mode-trigger]').getAttribute('aria-label').then(label => /layout: full/i.test(label ?? ''))) return;
  await chooser.locator('[data-workspace-mode-trigger]').focus();
  await page.keyboard.press('Enter');
  await chooser.locator('button[aria-label^="full layout:"]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('[data-workspace-island="right"]').evaluate(el => Math.round(el.getBoundingClientRect().right))).toBe(1600);
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: grouped project search navigates and reveals cross-page layers without source writes`, async ({ page }) => {
    const project = { ...SEEDS.LOCALE_TEXT, files: { ...SEEDS.LOCALE_TEXT.files,
      'app/about/page.tsx': SEEDS.LOCALE_TEXT.files['app/page.tsx'],
      'app/about/page.client.tsx': SEEDS.LOCALE_TEXT.files['app/page.client.tsx'].replace('Painter', 'About painter'),
      'components/SearchCard.tsx': 'export default function SearchCard() { return <div data-id="card-root" data-name="Card"><p data-id="card-heading" data-name="Master heading">Shared text</p></div>; }',
    } };
    await page.addInitScript(({ project, theme }) => {
      localStorage.setItem('revyme-project-local', JSON.stringify(project));
      localStorage.setItem('revyme-onboarding-completed', 'true');
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
    }, { project, theme });
    await page.goto('/work/local');
    const editor = new EditorPage(page);
    await editor.sandbox().locator('[data-viewport]').first().waitFor();
    await fullLayout(page);
    await expect(page.locator('[data-field-pages-tree]')).toContainText('/about');
    const panel = page.locator('[data-editor-panel="left-primary"]');
    const search = panel.getByRole('combobox', { name: /Search pages and layers/i });
    await expect(panel.locator('[data-field-searchbar]')).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'Search pages', exact: true })).toHaveCount(0);
    const before = await page.evaluate(() => (window as unknown as SeedWindow).__e2e.listFiles().filter(file => !file.startsWith('_meta/')).map((file: string) => [file, (window as unknown as SeedWindow).__e2e.readFile(file)]));
    await search.fill('about');
    const results = page.locator('[data-document-search-results]');
    await expect(results.getByRole('listbox')).toHaveAttribute('aria-busy', 'false');
    await expect(results.getByRole('group', { name: 'Pages', exact: true })).toBeVisible();
    await expect(results.getByRole('group', { name: 'Layers', exact: true })).toBeVisible();
    await expect(results.locator('[data-document-result="page"]')).toHaveCount(1);
    await expect(results.locator('[data-document-result="layer"]')).toHaveCount(4);
    await page.screenshot({ path: `../screenshots/field-search-${theme}-grouped.png` });
    await page.keyboard.press('Escape');
    await expect(results).toHaveCount(0);
    await expect(search).toHaveValue('about');
    await expect(search).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(results).toBeVisible();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(panel.locator('[data-field-pages-tree] [data-active="true"]')).toContainText('about');
    await search.fill('Home');
    await expect(results.getByRole('listbox')).toHaveAttribute('aria-busy', 'false');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(panel.locator('[data-field-pages-tree] [data-active="true"]')).toContainText('Home');
    await search.fill('about painter');
    await expect(results.getByRole('option')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as unknown as SeedWindow).__e2e.selection())).toEqual(['intro']);
    await expect(panel.locator('[data-field-pages-tree] [data-active="true"]')).toContainText('about');
    await expect(panel.locator('[data-layer-id="desktop:intro"]')).toBeInViewport();
    await expect(page.locator('[data-typography-alignment-row]')).toBeVisible();
    await search.fill('no such result');
    await expect(results).toContainText('No matching pages');
    await expect(results).toContainText('No matching layers');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as unknown as SeedWindow).__e2e.selection())).toEqual(['intro']);
    await panel.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(results).toHaveCount(0);
    await search.fill('retained query');
    await page.keyboard.press('Escape');
    await page.locator('[data-tutorial="media-button"]').click();
    await page.locator('[data-tutorial="layers-button"]').click();
    await expect(search).toHaveValue('retained query');
    await page.evaluate(() => (window as unknown as SeedWindow).__e2e.openFile('components/SearchCard.tsx'));
    await search.fill('Master heading');
    await expect(results.getByRole('option')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as unknown as SeedWindow).__e2e.selection())).toEqual(['card-heading']);
    await expect.poll(() => page.evaluate(() => (window as unknown as SeedWindow).__e2e.listFiles().filter(file => !file.startsWith('_meta/')).map((file: string) => [file, (window as unknown as SeedWindow).__e2e.readFile(file)]))).toEqual(before);
  });

  test(`${theme}: Inspector controls reflow continuously with docked and Float panel widths`, async ({ page }) => {
    await page.addInitScript(v => localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(v)), theme);
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('LOCALE_TEXT');
    await fullLayout(page);
    await editor.select(['intro'], 'desktop');
    const inspector = page.locator('[data-properties-panel]').last();
    const alignment = inspector.locator('[data-typography-alignment-row]');
    await expect(alignment).toBeVisible();
    const pane = page.locator('[data-workspace-right-body]');
    const widths = [480, 420, 380, 362, 361, 360, 359, 340, 320, 300, 320, 359, 360, 361, 362, 420, 480];
    for (const layout of ['full', 'float']) {
      if (layout === 'float') {
        const chooser = page.locator('[data-workspace-layout-control]:visible').first();
        await chooser.locator('[data-workspace-mode-trigger]').hover();
        await expect(chooser).toHaveAttribute('data-expanded', 'true');
        await chooser.locator('button[aria-label^="float layout:"]').click();
        await page.getByRole('button', { name: /^open design inspector$/i }).click();
        await expect.poll(() => page.locator('[data-workspace-island="right"]').evaluate(el => getComputedStyle(el).borderRadius)).not.toBe('0px');
      }
      for (const width of widths) {
        const current = (await pane.boundingBox())!.width;
        const handle = page.locator('[data-workspace-resize="right"]');
        const box = (await handle.boundingBox())!;
        expect(box.height).toBeGreaterThan(300);
        await page.mouse.move(box.x + box.width / 2, box.y + Math.min(300, box.height - 20));
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + current - width, box.y + Math.min(300, box.height - 20), { steps: 3 });
        await page.mouse.up();
        await expect.poll(() => pane.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width);
        const metrics = await alignment.evaluate(el => {
          const row = el.getBoundingClientRect();
          return { overflow: el.scrollWidth > el.clientWidth, positions: [...el.children].map(child => ({ top: child.getBoundingClientRect().top, right: child.getBoundingClientRect().right })),
            targets: [...el.querySelectorAll('button')].map(button => ({width: button.getBoundingClientRect().width, height:button.getBoundingClientRect().height, right:button.getBoundingClientRect().right})), right: row.right };
        });
        expect(metrics.overflow, `${theme}/${layout}/${width}`).toBe(false);
        expect(metrics.targets).toHaveLength(7);
        for (const target of metrics.targets) { expect(target.width).toBeGreaterThanOrEqual(28); expect(target.height).toBeGreaterThanOrEqual(28); expect(target.right).toBeLessThanOrEqual(metrics.right + 0.5); }
        expect(metrics.positions[1].top > metrics.positions[0].top).toBe(width <= 360);
        for (const row of ['[data-typography-weight-size]', '[data-typography-leading-spacing]', '[data-inspector-peer-row]']) {
          expect(await inspector.locator(row).evaluateAll(els => els.every(el => el.scrollWidth <= el.clientWidth + 1))).toBe(true);
        }
        if (width === 300 || width === 480) await pane.screenshot({ path: `../screenshots/field-inspector-${theme}-${layout}-${width}.png` });
      }
      await alignment.getByRole('button', { name: 'Align text left', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(alignment.getByRole('button', { name: 'Align text center', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(alignment.getByRole('button', { name: 'Align text center', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await alignment.locator('[data-typography-options]').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Typography options', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(alignment.locator('[data-typography-options]')).toBeFocused();
    }
    const resize = page.locator('[data-workspace-resize="right"]');
    const resizeBox = (await resize.boundingBox())!;
    await page.mouse.move(resizeBox.x + 4, resizeBox.y + 300);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + 24, resizeBox.y + 300);
    await page.evaluate(({x,y}) => window.dispatchEvent(new PointerEvent('pointercancel', { clientX:x,clientY:y })), { x:resizeBox.x + 24,y:resizeBox.y + 300 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => ({resizing:document.documentElement.dataset.workspaceResizing ?? '', cursor:document.body.style.cursor,select:document.body.style.userSelect}))).toEqual({resizing:'',cursor:'',select:''});
    const colors = await page.locator('[data-workspace-island]').evaluateAll(els => els.map(el => getComputedStyle(el).backgroundColor));
    expect(colors[0]).toBe(colors[1]);
    console.log('CHROME_PARITY', theme, colors);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: sidebar search geometry matches Library and AI follows pane resizing`, async ({ page }) => {
    await page.addInitScript(theme => {
      localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
      localStorage.setItem('field:prefs:leftContentWidth', JSON.stringify(320));
    }, theme);
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('LOCALE_TEXT');
    await fullLayout(page);
    const rail = page.locator('[data-left-menu-rail]');
    const pane = page.locator('[data-editor-panel="left-primary"]:visible');
    const geometry = async () => pane.locator('[data-field-searchbar]').evaluate(input => {
      const box = input.getBoundingClientRect();
      const host = input.closest('[data-editor-panel]')!.getBoundingClientRect();
      return { left: box.left - host.left, right: host.right - box.right, top: box.top - host.top, height: box.height };
    });
    await rail.getByRole('button', { name: 'Library', exact: true }).click();
    const reference = await geometry();
    for (const name of ['Presets', 'CMS', 'Media', 'Pages & Layers']) {
      await rail.getByRole('button', { name, exact: true }).click();
      await expect(pane.locator('[data-field-searchbar]')).toHaveCount(1);
      const actual = await geometry();
      for (const key of ['left', 'right', 'top', 'height'] as const)
        expect(Math.abs(actual[key] - reference[key]), `${name}/${key}`).toBeLessThanOrEqual(0.5);
    }
    await rail.getByRole('button', { name: 'AI assistant', exact: true }).click();
    const dock = page.locator('[data-vibe-dock]');
    for (const width of [232, 320, 420, 256]) {
      const current = (await dock.boundingBox())!.width;
      const handle = page.locator('[data-workspace-resize="left"]');
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + Math.min(200, box.height - 10));
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + width - current, box.y + Math.min(200, box.height - 10), { steps: 3 });
      await page.mouse.up();
      await expect.poll(() => dock.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width);
      const edges = await page.locator('[data-workspace-island="left"]').evaluate(el => el.getBoundingClientRect().right);
      expect(Math.abs((await dock.boundingBox())!.x + width - edges)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: `../screenshots/field-sidebar-${theme}-parity.png` });
  });
}
