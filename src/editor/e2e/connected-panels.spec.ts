import { test, expect, type Page, type Locator } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ hasTouch: true, viewport: { width: 844, height: 390 }, actionTimeout: 10000 });

const floating = (page: Page) => page.locator('[data-floating-left-panel][data-visible="true"]');
const detail = (page: Page) => page.locator('[data-editor-panel="left-secondary"]:visible');
const rail = (page: Page) => page.locator('[data-left-menu-rail]');
const rect = (locator: Locator) => locator.evaluate(el => {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
});
async function continuousLeft(page: Page, withDetail = false) {
  await expect.poll(async () => {
    const a = await rect(rail(page)), b = await rect(floating(page));
    const c = await rect(page.locator('[data-workspace-island="left"]'));
    const end = withDetail ? await rect(detail(page)) : b;
    return Math.max(Math.abs(a.right - b.left), Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom),
      Math.abs(c.left - a.left), Math.abs(c.top - a.top), Math.abs(c.bottom - b.bottom), Math.abs(c.right - end.right));
  }).toBeLessThan(1);
  const styles = await floating(page).evaluate(el => {
    const s = getComputedStyle(el);
    return { shadow: s.boxShadow, leftTop: s.borderTopLeftRadius, leftBottom: s.borderBottomLeftRadius };
  });
  expect(styles).toEqual({ shadow: 'none', leftTop: '0px', leftBottom: '0px' });
  await expect(floating(page).getByRole('button', { name: 'Close panel', exact: true })).toHaveCount(0);
}
async function alignedDetail(page: Page) {
  await expect(detail(page)).toBeVisible();
  await expect.poll(async () => {
    const a = await rect(floating(page)), b = await rect(detail(page));
    return Math.max(Math.abs(a.right - b.left), Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom));
  }).toBeLessThan(1);
  const b = await rect(detail(page));
  expect(b.right).toBeLessThanOrEqual(page.viewportSize()!.width - 8);
  expect(b.bottom).toBeLessThanOrEqual(page.viewportSize()!.height - 12);
  expect(await detail(page).evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
  // Both content panes paint above the toolbar and below their single outline.
  const layers = await page.evaluate(() => {
    const primary = document.querySelector('[data-floating-left-panel][data-visible="true"]')!;
    const secondary = document.querySelector('[data-floating-insert-detail]')!;
    const outline = document.querySelector('[data-field-floating-outline]')!;
    const toolbar = document.querySelector('#bottom-toolbar-container')!;
    const a = getComputedStyle(primary), b = getComputedStyle(secondary);
    return { fill: a.backgroundColor, detailFill: b.backgroundColor,
      primary: Number(a.zIndex), secondary: Number(b.zIndex),
      outline: Number(getComputedStyle(outline).zIndex), toolbar: Number(getComputedStyle(toolbar.parentElement!).zIndex),
      innerTop: b.borderTopLeftRadius, innerBottom: b.borderBottomLeftRadius };
  });
  expect(layers.fill).toBe(layers.detailFill);
  expect(layers.fill).not.toBe('rgba(0, 0, 0, 0)');
  expect(layers.primary).toBeGreaterThan(layers.toolbar);
  expect(layers.secondary).toBeGreaterThan(layers.toolbar);
  expect(layers.outline).toBeGreaterThan(layers.primary);
  expect(layers.outline).toBeGreaterThan(layers.secondary);
  expect([layers.innerTop, layers.innerBottom]).toEqual(['0px', '0px']);
  // The enclosing edge and outer resize grip share the content portals' layer.
  await expect(page.locator('body > [data-field-floating-outline]').first()).toBeAttached();
  await expect.poll(async () => {
    const edge = await rect(detail(page));
    const grip = await rect(page.getByRole('button', { name: 'Resize floating left panel', exact: true }));
    return Math.max(Math.abs(grip.right - edge.right), Math.abs(grip.bottom - edge.bottom));
  }).toBeLessThan(1);
  await continuousLeft(page, true);
}
async function touchDrag(page: Page, handle: Locator, dx: number, dy: number) {
  const b = await handle.boundingBox(); expect(b).not.toBeNull();
  const x = b!.x + b!.width / 2, y = b!.y + b!.height / 2;
  expect(await handle.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }), 'resize/drag handle receives the actual touch').toBe(true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove', touchPoints: [{ x: x + dx * i / 4, y: y + dy * i / 4, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
async function setup(page: Page, theme: string, desktop = false) {
  await page.addInitScript(({ theme, desktop }) => {
    localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify(desktop ? 'floating' : 'docked'));
    localStorage.setItem('field:prefs:floatingLeftHeight', '540');
  }, { theme, desktop });
  const editor = new EditorPage(page); await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
  return editor;
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: landscape panels share one perimeter; Insert stays adjacent through touch resizing and rotation`, async ({ page }, testInfo) => {
    const editor = await setup(page, theme);
    for (const name of ['Pages & Layers', 'Library', 'Presets', 'Media', 'CMS', 'Branches', 'Insert']) {
      await rail(page).getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).tap();
      await continuousLeft(page);
    }
    // Presets performs its existing import migration on first mount. Bind the
    // source invariant to the Insert/resize/rotation interactions below.
    const code = await editor.getPageCode();
    const sidebar = floating(page).locator('[data-insert-sidebar]');
    for (const name of ['Elements', 'Integrations', 'Icons', 'Utility', 'Collections', 'Fields', 'Text Effects']) {
      await sidebar.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).tap();
      await alignedDetail(page);
      await expect(page.locator('[data-toolbar-panel="insert"]')).toHaveCount(0);
    }
    await sidebar.getByRole('button', { name: /^elements$/i }).tap();
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-connected-landscape-${theme}.png` });
    await touchDrag(page, page.getByRole('button', { name: 'Resize floating left panel', exact: true }), 70, -20);
    await expect.poll(async () => (await rect(floating(page))).width).toBe(326);
    await alignedDetail(page);
    const search = sidebar.getByRole('textbox'); await search.fill('frame');
    await expect(detail(page)).toContainText(/frame/i); await alignedDetail(page);
    await page.setViewportSize({ width: 780, height: 360 }); await alignedDetail(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-left-menu-rail]')).toHaveCount(0);
    await expect(detail(page)).toHaveCount(0);
    // Rotation carries the open Insert task into the dedicated portrait shell.
    await expect(page.locator('[data-portrait-surface="insert"]')).toBeVisible();
    await page.getByRole('button', { name: 'Close Insert', exact: true }).tap();
    await page.getByRole('button', { name: 'Open browse', exact: true }).tap();
    // Browse restores the last task; Back returns to its destination menu.
    await expect(page.locator('[data-portrait-surface="insert"]')).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).tap();
    await expect(page.locator('[data-portrait-surface="browse"]')).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-connected-portrait-${theme}.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await rail(page).getByRole('button', { name: /^insert$/i }).tap();
    if (!await floating(page).count()) await rail(page).getByRole('button', { name: /^insert$/i }).tap();
    await continuousLeft(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('docked');
    expect(await editor.getPageCode()).toBe(code);
    await testInfo.attach('final-connected-geometry', { body: JSON.stringify(await rect(rail(page))), contentType: 'application/json' });
  });

  test(`${theme}: landscape Inspector header, body and backdrop move and resize as one surface`, async ({ page }) => {
    const editor = await setup(page, theme); const code = await editor.getPageCode();
    const expand = page.locator('[data-workspace-right-toggle]').getByRole('button', { name: /^expand inspector$/i });
    await expand.tap();
    const header = page.locator('[data-workspace-right-header]');
    const body = page.locator('[data-workspace-right-body]');
    const island = page.locator('[data-workspace-island="right"]');
    const check = async () => {
      await expect.poll(async () => {
        const a = await rect(header), b = await rect(body), c = await rect(island);
        return Math.max(Math.abs(a.left - b.left), Math.abs(a.right - b.right), Math.abs(a.bottom - b.top),
          Math.abs(a.top - c.top), Math.abs(b.bottom - c.bottom), Math.abs(c.left - a.left), Math.abs(c.right - b.right));
      }).toBeLessThan(1);
      expect(await body.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
      expect(await body.evaluate(el => getComputedStyle(el).borderTopLeftRadius)).toBe('0px');
      await expect(body.getByRole('button', { name: 'Close Properties', exact: true })).toHaveCount(0);
    };
    await check();
    expect((await rect(island)).height).toBe(360);
    await header.getByRole('button', { name: /^preview$/i }).waitFor();
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-connected-inspector-${theme}.png` });
    await touchDrag(page, body.getByRole('button', { name: 'Resize floating properties pane', exact: true }), 0, -40);
    await expect.poll(async () => (await rect(island)).height).toBe(320); await check();
    const beforeDrag = await rect(island);
    await touchDrag(page, header.locator('[data-right-pane-drag-handle]'), -40, 20);
    await expect.poll(async () => (await rect(island)).left - beforeDrag.left).toBe(-40); await check();
    await page.setViewportSize({ width: 780, height: 360 }); await check();
    await body.getByRole('button', { name: /^collapse inspector$/i }).tap();
    await expect(body).toHaveCount(0); await expect(expand).toBeVisible();
    await expand.tap(); await check();
    expect(await editor.getPageCode()).toBe(code);
  });

  test(`${theme}: desktop Float details follow saved size, scrolling and viewport resize without a mouse move`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const editor = await setup(page, theme, true); const code = await editor.getPageCode();
    await rail(page).getByRole('button', { name: /^insert$/i }).tap();
    await floating(page).getByRole('button', { name: /^elements$/i }).tap();
    await alignedDetail(page);
    expect((await rect(floating(page))).height).toBe(540);
    await page.setViewportSize({ width: 1280, height: 700 }); await alignedDetail(page);
    await touchDrag(page, page.getByRole('button', { name: 'Resize floating left panel', exact: true }), 60, -80);
    await expect.poll(async () => (await rect(floating(page))).height).toBe(460); await alignedDetail(page);
    expect(await detail(page).evaluate(el => [...el.querySelectorAll('*')].some(child => {
      const style = getComputedStyle(child);
      return ['auto', 'scroll'].includes(style.overflowY) && child.scrollHeight > child.clientHeight;
    }))).toBe(true);
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-connected-desktop-${theme}.png` });
    await page.setViewportSize({ width: 844, height: 390 }); await alignedDetail(page);
    await page.setViewportSize({ width: 1440, height: 900 }); await alignedDetail(page);
    expect((await rect(floating(page))).height).toBe(460);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('floating');
    expect(await editor.getPageCode()).toBe(code);
  });
}
