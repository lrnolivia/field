// Stale tab vs deployed build: a newer /api/build shows a quiet notice, and
// Reload saves the project first so no edit is lost. Runs on a disposable local
// project; /api/build is intercepted to stand in for a newer deploy.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

const NEWER = {
  version: '1.0.1',
  commitSha: 'f'.repeat(40),
  shortSha: 'ffffffff',
  builtAt: '2026-10-20T00:00:00.000Z',
  environment: 'Production',
  deployedAt: '2026-10-20T00:01:00.000Z',
  deploymentId: 'test-deployment',
};

async function open(page: Page, newer: boolean) {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
  if (newer) {
    await page.route('**/api/build', (route) => route.fulfill({ json: NEWER, headers: { 'Cache-Control': 'no-store' } }));
  }
  const editor = new EditorPage(page);
  await page.goto('/work/local');
  await editor.node('abs-child').waitFor({ state: 'visible' });
  return editor;
}

test('no notice while the running build is the deployed one', async ({ page }) => {
  await open(page, false);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-update-available]')).toHaveCount(0);
});

test('a newer deploy shows the notice; Reload saves a fresh edit first and keeps it', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await open(page, true);
  const notice = page.locator('[data-update-available]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('ffffffff');

  // Fresh edit, still inside the autosave debounce when Reload is pressed.
  const original = await editor.getPageCode();
  await editor.select(['abs-child']);
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(() => editor.getPageCode()).not.toBe(original);
  const edited = await editor.getPageCode();
  expect(edited).toContain("left: '50px'");

  await notice.getByRole('button', { name: 'Reload' }).click();
  await page.waitForLoadState('domcontentloaded');
  await editor.node('abs-child').waitFor({ state: 'visible', timeout: 60_000 });
  await expect.poll(() => editor.getPageCode()).toBe(edited);
});

test('Later hides the notice for that build; a BFCache-style pageshow re-checks', async ({ page }) => {
  await open(page, true);
  const notice = page.locator('[data-update-available]');
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Dismiss update notice' }).click();
  await expect(notice).toHaveCount(0);
  let checks = 0;
  await page.route('**/api/build', (route) => { checks++; return route.fulfill({ json: NEWER }); });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(() => checks).toBeGreaterThan(0);
});
