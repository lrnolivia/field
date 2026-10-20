// Figma parity: hovering a Layers row outlines that object on the canvas.
// Dashboard: a project's card menu opens its Project settings directly.
import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

test('hovering a Layers row outlines that object on the canvas', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('GROUP_FRAME_SEMANTICS');
  await editor.fitCamera();
  const row = page.locator('[data-layer-id="desktop:loose-a"]').first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  const highlight = page.locator('[data-hover-highlight="loose-a"] path');
  await expect(highlight).toHaveCount(1);
  // Centred on the object's painted box, hugging it (the shared hover outline
  // sits a few px outside the edge).
  await expect.poll(async () => {
    const node = await editor.nodeBox('loose-a');
    const o = (await highlight.boundingBox())!;
    const centre = Math.max(
      Math.abs(o.x + o.width / 2 - (node.x + node.width / 2)),
      Math.abs(o.y + o.height / 2 - (node.y + node.height / 2)),
    );
    const outset = Math.max(Math.abs(o.width - node.width), Math.abs(o.height - node.height)) / 2;
    return centre < 1 && outset <= 4;
  }, { timeout: 5_000 }).toBe(true);

  // Leaving the row clears the outline.
  await page.mouse.move(5, 500);
  await expect(page.locator('[data-hover-highlight="loose-a"]')).toHaveCount(0);
});

test('the Dashboard card menu opens a project with its settings showing', async ({ page }) => {
  // Disposable project list (the local dev server has no projects API); the
  // project id `local` opens the seeded local project.
  await page.route('**/api/field/projects**', (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: { projects: [{
      id: 'local', name: 'QA fixture', createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z', starred: false, trashedAt: null, thumbnail: null,
    }] } })
    : route.continue());
  await page.addInitScript((data) => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, SEEDS.ABSOLUTE_IN_FRAME);
  await page.goto('/');
  const more = page.getByRole('button', { name: 'Project actions for QA fixture' });
  await more.waitFor({ state: 'visible', timeout: 30_000 });
  await more.click();
  await page.getByRole('menuitem', { name: 'Project settings…' }).click();
  await expect(page).toHaveURL(/\/work\/local/);
  await expect(page.locator('[data-project-settings-modal]')).toBeVisible({ timeout: 30_000 });
  // The flag is consumed so reload/back doesn't reopen it.
  await expect(page).not.toHaveURL(/project-settings/);
});
