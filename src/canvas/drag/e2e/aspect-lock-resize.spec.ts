// Persistent aspect lock (Inspector "Lock aspect ratio") on canvas resize.
//
// Audit 2026-10-04: with the lock on, a bottom-right drag of Field's
// Rectangle (a single-shape SVG) returned 200x140 instead of 200x150 — the
// SVG geometry-baking resize path only honoured Shift. The lock must hold on
// corner AND edge handles, keep the opposite anchor, and undo in one step.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '650px', background: '#ffffff' }}>
      <svg data-id="rect" data-name="Rectangle" viewBox="0 0 160 120" preserveAspectRatio="none" style={{ position: 'absolute', left: '48px', top: '128px', width: '160px', height: '120px', overflow: 'visible' }}>
        <rect data-id="rect-shape" x="0" y="0" width="160" height="120" fill="#d9d9d9" />
      </svg>
      <div data-id="box" data-name="Box" style={{ position: 'absolute', left: '400px', top: '128px', width: '160px', height: '120px', background: '#3b82f6' }} />
    </div>
  );
}
`;

async function seed(page: Page, editor: EditorPage) {
  const project = {
    format: 'revyme-v1',
    files: {
      'app/page.tsx': `import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n`,
      'app/page.client.tsx': PAGE,
    },
  };
  await page.addInitScript((data) => {
    window.localStorage.setItem('revyme-project-local', JSON.stringify(data));
    window.localStorage.setItem('revyme-onboarding-completed', 'true');
  }, project);
  await page.goto('/work/local');
  await editor.sandbox().locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await editor.node('rect').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await page.waitForTimeout(500);
}

async function dragHandle(page: Page, selector: string, delta: { x: number; y: number }) {
  const handle = page.locator(selector);
  await handle.waitFor({ state: 'visible', timeout: 10_000 });
  const hb = (await handle.boundingBox())!;
  const start = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(start.x + (delta.x * i) / 10, start.y + (delta.y * i) / 10);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(800);
}

async function lock(page: Page, id: string) {
  await page.evaluate((nodeId) => (window as any).__e2e.select([nodeId]), id);
  await page.waitForTimeout(400);
  const button = page.locator('[title="Lock aspect ratio"]').first();
  await button.waitFor({ state: 'visible', timeout: 10_000 });
  await button.click();
  await expect(page.locator('[title="Unlock aspect ratio"]').first()).toBeVisible();
  await page.waitForTimeout(400);
}

const undo = (page: Page) => page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');

for (const id of ['rect', 'box'] as const) {
  test.describe(`persistent aspect lock — ${id === 'rect' ? 'Rectangle (svg)' : 'Frame'}`, () => {
    test('corner resize keeps the ratio and the opposite corner, and undoes in one step', async ({ page }) => {
      test.setTimeout(120_000);
      const editor = new EditorPage(page);
      await seed(page, editor);
      await lock(page, id);
      const before = await editor.nodeBox(id);
      const ratio = before.width / before.height;
      expect(ratio).toBeCloseTo(4 / 3, 1);

      await dragHandle(page, '[data-resize-dir="bottomRight"]', { x: before.width * 0.25, y: before.height * 0.1 });
      const after = await editor.nodeBox(id);
      expect(after.width).toBeGreaterThan(before.width * 1.15);
      expect(Math.abs(after.width / after.height - ratio)).toBeLessThan(0.02);
      expect(Math.abs(after.x - before.x)).toBeLessThan(1.5);
      expect(Math.abs(after.y - before.y)).toBeLessThan(1.5);
      // The lock survives the gesture.
      await expect(page.locator('[title="Unlock aspect ratio"]').first()).toBeVisible();

      await undo(page);
      await page.waitForTimeout(800);
      const undone = await editor.nodeBox(id);
      expect(Math.abs(undone.width - before.width)).toBeLessThan(1.5);
      expect(Math.abs(undone.height - before.height)).toBeLessThan(1.5);
    });

    test('edge resize keeps the ratio', async ({ page }) => {
      test.setTimeout(120_000);
      const editor = new EditorPage(page);
      await seed(page, editor);
      await lock(page, id);
      const before = await editor.nodeBox(id);
      const ratio = before.width / before.height;

      await dragHandle(page, '[data-resize-edge="right"]', { x: before.width * 0.25, y: 0 });
      const after = await editor.nodeBox(id);
      expect(after.width).toBeGreaterThan(before.width * 1.15);
      expect(Math.abs(after.width / after.height - ratio)).toBeLessThan(0.02);
      // Left edge stays anchored.
      expect(Math.abs(after.x - before.x)).toBeLessThan(1.5);
    });
  });
}
