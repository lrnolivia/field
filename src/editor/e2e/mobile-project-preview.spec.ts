import { expect, test, type Page } from '@playwright/test';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

const mobileEditor = (process.env.VITE_FIELD_MOBILE_EDITOR ?? 'true') === 'true';
const phone = { width: 390, height: 844 };
const landscape = { width: 844, height: 390 };

test.use({ hasTouch: true });

async function seedProject(page: Page) {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  seed.files['app/page.client.tsx'] = `
    import Link from 'next/link';
    export default function Home() {
      return <main data-id="root">
        <h1 data-id="title">Phone project home</h1>
        <Link href="/about">About this project</Link>
      </main>;
    }
  `;
  seed.files['app/about/page.client.tsx'] = `
    export default function About() {
      return <main data-id="about"><h1>Phone project about</h1></main>;
    }
  `;
  await page.addInitScript(project => {
    localStorage.setItem('revyme-project-local', JSON.stringify(project));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
}

async function expectProjectPreview(page: Page, width: number) {
  const preview = page.locator('[data-project-preview-only]');
  await expect(preview).toBeVisible();
  await expect(page.locator('[data-editor-interactive], iframe[data-canvas-iframe]')).toHaveCount(0);
  await expect(page.locator('.field-shell')).toHaveAttribute('data-dashboard-state', 'hidden');
  const frame = preview.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Phone project home' })).toBeVisible();
  await expect.poll(() => frame.locator('html').evaluate(el => el.clientWidth)).toBe(width);
  return frame;
}

test('a phone opens a Dashboard project with the configured editor access', async ({ page }) => {
  await page.setViewportSize(phone);
  await seedProject(page);
  await page.route('**/api/field/projects**', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { projects: [{
      id: 'local', name: 'Phone QA fixture', createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z', starred: false, trashedAt: null, thumbnail: null,
    }] } })
    : route.continue());
  await page.goto('/');
  const card = page.getByRole('button', { name: 'Open Phone QA fixture', exact: true });
  await card.click();
  await expect(page).toHaveURL(/\/work\/local$/);
  if (mobileEditor) {
    await expect(page.locator('[data-portrait-workspace]')).toBeVisible();
    await expect(page.locator('[data-project-preview-only]')).toHaveCount(0);
    return;
  }
  const frame = await expectProjectPreview(page, phone.width);
  await page.getByRole('button', { name: 'Reload preview' }).click();
  await expect(frame.getByRole('heading', { name: 'Phone project home' })).toBeVisible();
  await frame.getByRole('link', { name: 'About this project' }).click();
  await expect(frame.getByRole('heading', { name: 'Phone project about' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-project-preview-only]')).toBeVisible();
  await page.getByRole('button', { name: 'Back to projects' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(card).toBeVisible();
});

test('direct project opening follows phone orientation and keeps the desktop editor available', async ({ page }) => {
  await page.setViewportSize(landscape);
  await seedProject(page);
  await page.goto('/work/local');
  if (mobileEditor) {
    await expect(page.locator('iframe[data-canvas-iframe]')).toBeVisible();
    await expect(page.locator('[data-project-preview-only]')).toHaveCount(0);
  } else {
    await expectProjectPreview(page, landscape.width);
    await page.setViewportSize(phone);
    await expectProjectPreview(page, phone.width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-editor-interactive="true"]')).toBeVisible();
  await expect(page.locator('iframe[data-canvas-iframe]')).toBeVisible();
  await expect(page.locator('[data-project-preview-only]')).toHaveCount(0);
});
