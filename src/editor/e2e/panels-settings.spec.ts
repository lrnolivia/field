import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

type SourceWindow = Window & { __e2e: { listFiles: () => string[]; readFile: (path: string) => string | null } };
const source = (page: Page) => page.evaluate(() => {
  const fs = (window as unknown as SourceWindow).__e2e;
  return fs.listFiles().filter(path => !path.startsWith('_meta/')).map(path => [path, fs.readFile(path)]);
});
const layoutSource = (page: Page) => page.evaluate(() => (window as unknown as SourceWindow).__e2e.readFile('app/layout.tsx'));

test.use({ actionTimeout: 10000, viewport: { width: 1440, height: 1000 }, contextOptions: { reducedMotion: 'reduce' } });

async function projectSettings(page: Page) {
  await page.getByRole('button', { name: /^Project menu for/i }).click();
  await page.getByRole('menuitem', { name: /project settings/i }).click();
  await expect(page.locator('[data-project-settings-modal]')).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: Library section gaps match Pages/Layers and browsing preserves initialized source`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme)), theme);
    await new EditorPage(page).gotoWithSeed('LOCALE_TEXT');
    const rail = page.locator('[data-left-menu-rail]');
    await rail.getByRole('button', { name: 'Library', exact: true }).click();
    // Library's existing first-load preset initialization writes globals.css;
    // compare source after that initialization and before browsing sections.
    await expect.poll(() => page.evaluate(() => (window as unknown as SourceWindow).__e2e.readFile('app/globals.css'))).toContain('Design Tokens');
    const before = await source(page);
    const sections = page.locator('[data-library-panel]:visible [data-library-section]');
    await expect(sections).toHaveCount(5);
    const boxes = await sections.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top - boxes[i - 1].bottom).toBeCloseTo(10, 1);
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-library-spacing-${theme}.png` });
    await rail.getByRole('button', { name: 'Pages & Layers', exact: true }).click();
    expect(await page.locator('[data-field-pages-splitter]:visible').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(10, 1);
    expect(await source(page)).toEqual(before);
  });

  for (const width of [1440, 390]) {
    test(`${theme}/${width}: project settings retain drafts, save independent sections and own select keyboard focus`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.addInitScript(theme => localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme)), theme);
      await new EditorPage(page).gotoWithSeed('LOCALE_TEXT');
      await expect(new EditorPage(page).node('intro')).toHaveText('Painter');
      await projectSettings(page);
      const modal = page.locator('[data-project-settings-modal]');
      const tabs = modal.locator('[data-project-settings-tabs]');
      const before = await source(page);
      await modal.locator('#project-site-name').fill('Settings keyboard fixture');
      await tabs.getByRole('tab', { name: 'Appearance', exact: true }).click();
      await modal.locator('#project-default-theme').click();
      await page.getByRole('option', { name: 'Dark', exact: true }).click();
      await tabs.getByRole('tab', { name: 'General', exact: true }).click();
      await expect(modal.locator('#project-site-name')).toHaveValue('Settings keyboard fixture');
      expect(await source(page)).toEqual(before);
      await modal.locator('#project-language').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('option', { name: 'English', exact: true })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('option', { name: 'Spanish', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(modal.locator('#project-language')).toBeFocused();
      await modal.locator('#project-language').click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(modal).toBeVisible();
      await expect(modal.locator('#project-language')).toBeFocused();
      await page.screenshot({ animations: 'disabled', path: `../screenshots/field-project-general-${theme}-${width}.png` });
      await modal.getByRole('button', { name: /^save$/i }).click();
      await expect(modal.getByRole('button', { name: /^save$/i })).toBeDisabled();
      await expect.poll(() => layoutSource(page)).toContain('Settings keyboard fixture');
      await expect.poll(() => layoutSource(page)).toContain('es');
      await tabs.getByRole('tab', { name: 'Appearance', exact: true }).click();
      await expect(modal.getByRole('button', { name: /^save$/i })).toBeEnabled();
      await page.screenshot({ animations: 'disabled', path: `../screenshots/field-project-appearance-${theme}-${width}.png` });
      await modal.getByRole('button', { name: /^save$/i }).click();
      await expect(modal.getByRole('button', { name: /^save$/i })).toBeDisabled();
      await expect.poll(() => layoutSource(page)).toContain('dark');
      await tabs.getByRole('tab', { name: 'Code', exact: true }).click();
      await modal.locator('#project-custom-head').fill('<!-- unsaved fixture -->');
      await page.keyboard.press('Escape');
      const confirm = page.getByRole('dialog', { name: /Discard unsaved project settings/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Keep editing', exact: true }).click();
      await expect(modal.locator('#project-custom-head')).toHaveValue('<!-- unsaved fixture -->');
      await page.keyboard.press('Escape');
      await confirm.getByRole('button', { name: 'Discard', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await projectSettings(page);
      await expect(modal.locator('#project-site-name')).toHaveValue('Settings keyboard fixture');
      await tabs.getByRole('tab', { name: 'Code', exact: true }).click();
      await expect(modal.locator('#project-custom-head')).toHaveValue('');
      await tabs.getByRole('tab', { name: 'General', exact: true }).focus();
      await page.keyboard.press('End');
      await expect(tabs.getByRole('tab', { name: 'Code', exact: true })).toBeFocused();
      await expect(tabs.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    });
  }

  test(`${theme}: Dashboard opens general preferences and returns without project writes`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme)), theme);
    const mutations: string[] = [];
    page.on('request', request => { if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`); });
    await page.route('**/api/field/projects', route => route.fulfill({ json: { projects: [{ id: 'settings-fixture', name: 'Settings fixture', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z', starred: false, trashedAt: null }] } }));
    await page.goto('/');
    await expect(page.getByText('Settings fixture', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(settings).toBeVisible();
    await expect(settings.locator('[data-general-settings]')).toBeVisible();
    await expect(settings.getByText('Domain', { exact: true })).toHaveCount(0);
    const caseToggle = settings.getByRole('button', { name: 'Lowercase headings', exact: true });
    const wasLowercase = await caseToggle.getAttribute('aria-pressed');
    await caseToggle.click();
    await expect(caseToggle).toHaveAttribute('aria-pressed', wasLowercase === 'true' ? 'false' : 'true');
    await settings.getByRole('button', { name: /^appearance$/i }).click();
    await expect(settings.getByRole('button', { name: /^appearance$/i })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ animations: 'disabled', path: `../screenshots/field-dashboard-settings-${theme}.png` });
    await settings.getByRole('button', { name: /^save$/i }).click();
    await expect(settings).toHaveCount(0);
    await expect(page.getByText('Settings fixture', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(caseToggle).toHaveAttribute('aria-pressed', wasLowercase === 'true' ? 'false' : 'true');
    await settings.getByRole('button', { name: /^save$/i }).click();
    expect(mutations).toEqual([]);
  });
}

test('Project branding reports upload failure inline and keeps retry available', async ({ page }) => {
  await new EditorPage(page).gotoWithSeed('LOCALE_TEXT');
  await expect(new EditorPage(page).node('intro')).toHaveText('Painter');
  await projectSettings(page);
  const modal = page.locator('[data-project-settings-modal]');
  await modal.getByRole('tab', { name: 'Branding', exact: true }).click();
  await page.route('**/api/upload', route => route.fulfill({ status: 503, json: { error: 'fixture upload refusal' } }));
  let browserDialog = false;
  page.on('dialog', dialog => { browserDialog = true; void dialog.dismiss(); });
  const before = await source(page);
  await modal.locator('input[type="file"]').first().setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture upload rejected before image parsing') });
  await expect(modal.getByRole('alert')).toContainText('Failed to upload. Please try again.');
  await expect(modal.getByRole('button', { name: /^upload$/i }).first()).toBeEnabled();
  expect(browserDialog).toBe(false);
  expect(await source(page)).toEqual(before);
  await modal.getByRole('button', { name: 'Dismiss error', exact: true }).click();
  await expect(modal.getByRole('alert')).toHaveCount(0);
});

test('Export options use disabled Field controls without changing project source', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LOCALE_TEXT');
  await editor.select(['intro']);
  const before = await source(page);
  await page.getByRole('button', { name: 'Add export setting', exact: true }).click();
  await page.getByRole('button', { name: 'Export options', exact: true }).click();
  for (const [name, value] of [['Color profile (unavailable)', 'sRGB'], ['Image resampling (unavailable)', 'Detailed']]) {
    const control = page.getByRole('button', { name, exact: true });
    await expect(control).toBeVisible();
    await expect(control).toBeDisabled();
    await expect(control).toContainText(new RegExp(value, 'i'));
  }
  await expect(page.locator('[data-properties-panel] select')).toHaveCount(0);
  expect(await source(page)).toEqual(before);
  await page.screenshot({ animations: 'disabled', path: '../screenshots/field-export-native-controls.png' });
});
