import { expect, test } from '@playwright/test';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

const original = {
  id: 'fixture',
  name: 'Safari source',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  starred: false,
  trashedAt: null,
  thumbnail: null,
};
const copy = { ...original, id: 'fixture-copy', name: 'Safari source Copy' };

test('a freshly duplicated project opens even if Safari suspends Dashboard motion', async ({ page }) => {
  await page.addInitScript(({ id, project }) => {
    if (window.top !== window) return;
    const key = 'revyme-project-' + id;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(project));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, { id: copy.id, project: SEEDS.ABSOLUTE_IN_FRAME });
  let projects: Array<Omit<typeof original, "thumbnail"> & { thumbnail: string | null }> = [original];
  await page.route('**/api/field/projects**', async (route) => {
    if (route.request().method() === 'POST' && new URL(route.request().url()).pathname.endsWith('/duplicate')) {
      const duplicated = { ...copy, thumbnail: new URL('/tutorial_images/frame.png', route.request().url()).href };
      projects = [duplicated, original];
      await route.fulfill({ status: 201, json: { project: duplicated } });
    } else {
      await route.fulfill({ json: { projects } });
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Project actions for Safari source' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  const openCopy = page.getByRole('button', { name: 'Open Safari source Copy' });
  await expect(openCopy).toBeVisible();
  await expect(openCopy.locator('img')).toHaveJSProperty('complete', true);
  // Freeze only the Dashboard fade. Safari can stop its animation timeline
  // after the Canvas has already loaded. The editor must still get input.
  await page.evaluate(() => {
    const layer = document.querySelector('.field-dashboard-layer')!;
    const animate = layer.animate.bind(layer);
    layer.animate = (...args) => {
      const animation = animate(...args);
      animation.pause();
      return animation;
    };
  });
  await openCopy.click();
  await expect(page).toHaveURL(/\/work\/fixture-copy$/);
  await expect(page.locator('.field-shell')).toHaveAttribute('data-dashboard-state', 'hidden');
  await expect(page.locator('.field-shell-builder')).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'preview', exact: true })).toBeEnabled();
  const editor = new EditorPage(page);
  const edited = editor.node('abs-child');
  await expect(edited).toHaveCSS('left', '40px');
  await editor.select(['abs-child']);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(edited).toHaveCSS('left', '50px');
  await expect.poll(() => page.evaluate((id) => {
    const saved = localStorage.getItem('revyme-project-' + id);
    return saved && JSON.parse(saved).files['app/page.client.tsx'];
  }, copy.id)).toContain("left: '50px'");

  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('.field-shell')).toHaveAttribute('data-dashboard-state', 'visible');
  await page.goForward({ waitUntil: 'commit' });
  await expect(page.locator('.field-shell')).toHaveAttribute('data-dashboard-state', 'hidden');
  await expect(edited).toHaveCSS('left', '50px');
  await page.reload();
  await expect(edited).toHaveCSS('left', '50px');
});

test('a direct reopen enables editor controls when Safari pauses the first animation frame', async ({ page }) => {
  await page.addInitScript(({ id, project }) => {
    if (window.top !== window) return;
    const key = 'revyme-project-' + id;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(project));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, { id: copy.id, project: SEEDS.ABSOLUTE_IN_FRAME });
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    // Suppress the editor's reveal frame, after Canvas sent its first paint.
    window.requestAnimationFrame = (callback) => {
      const editor = document.querySelector('[data-editor-interactive="false"]');
      if (editor && window.__safariQaPauseReveal) return 0;
      return request(callback);
    };
    window.addEventListener('message', event => {
      if (event.data?.__sandbox && event.data.payload?.type === 'renderComplete') {
        window.__safariQaPauseReveal = true;
      }
    });
  });
  await page.goto('/work/fixture-copy');
  await expect(new EditorPage(page).node('abs-child')).toBeVisible();
  await expect(page.locator('[data-editor-interactive]')).toHaveAttribute('data-editor-interactive', 'true');
});

declare global {
  interface Window {
    __safariQaPauseReveal?: boolean;
  }
}
