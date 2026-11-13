// persist.spec.ts — Local-mode persistence regression guard.
// Standalone (no-cloud) mode must persist edits through the LocalBackend:
// draw a frame, wait past the autosave debounce, boot a fresh page from
// the same localStorage, assert the edit survived byte-identical.
// Guards the bug where a VITE_REVYME_CLOUD gate in triggerAutosave made
// local mode silently never save (backend.saveProject was unreachable).
import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test('P0.1: local-mode edit survives a reload', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('OSS_SMOKE');

  const before = await editor.getPageCode();

  await page.locator('[data-toolbar-tool="smart-zoom"]').click();
  await editor.waitForStableGeometry('hero');

  // Draw a frame inside hero (same gesture as the covenant smoke).
  await page.locator('[data-toolbar-tool="frame"]').click();
  const hero = await editor.nodeBox('hero');
  await editor.dragFromTo(
    { x: hero.x + hero.width * 0.3, y: hero.y + hero.height * 0.3 },
    { x: hero.x + hero.width * 0.47, y: hero.y + hero.height * 0.6 },
  );
  await page.waitForTimeout(600);
  const after = await editor.getPageCode();
  expect(after).not.toEqual(before);

  // Autosave debounce is 2000ms — wait it out, then some slack.
  await page.waitForTimeout(3000);

  // Verify via a SECOND page in the same context: shares localStorage but
  // has no addInitScript (a reload of the first page would re-run the init
  // script and clobber the saved project with the original seed).
  const page2 = await page.context().newPage();
  await page2.goto('/work/local');
  const sandbox2 = page2.frameLocator('iframe[src*="5174"]');
  await sandbox2.locator('[data-viewport]').first().waitFor({ state: 'attached', timeout: 30_000 });
  const persisted = await page2.evaluate(() => (window as any).__e2e.readFile('app/page.client.tsx'));
  expect(persisted).toEqual(after);
});
