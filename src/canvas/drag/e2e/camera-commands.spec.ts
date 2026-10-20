// Camera command parity (Figma audit 2026-10-04).
//
//  - Fit Selection (⇧2) frames a small selection beyond the 200% whole-canvas
//    fit ceiling.
//  - Double-click drill-down changes selection only; the camera stays put.
//  - Menu zoom pivots on the visible canvas centre, not the last pointer.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '600px', background: '#ffffff' }}>
      <div data-id="outer" data-name="Outer" style={{ position: 'absolute', left: '40px', top: '40px', width: '700px', height: '480px', background: '#f3f4f6' }}>
        <div data-id="rect" data-name="Rectangle" style={{ position: 'absolute', left: '48px', top: '128px', width: '40px', height: '30px', background: '#ef4444' }} />
      </div>
    </div>
  );
}
`;

async function seed(p: Page, editor: EditorPage) {
  const project = {
    format: 'revyme-v1',
    files: {
      'app/page.tsx': `import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n`,
      'app/page.client.tsx': PAGE,
    },
  };
  await p.addInitScript((data) => {
    window.localStorage.setItem('revyme-project-local', JSON.stringify(data));
    window.localStorage.setItem('revyme-onboarding-completed', 'true');
  }, project);
  await p.goto('/work/local');
  await editor.sandbox().locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await editor.node('rect').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await p.waitForTimeout(600);
}

const scaleOf = (p: Page) => p.evaluate(() => (window as any).__e2e.cameraScale() as number);

async function settledScale(p: Page): Promise<number> {
  let prev = -1;
  for (let i = 0; i < 40; i++) {
    const s = await scaleOf(p);
    if (Math.abs(s - prev) < 1e-6) return s;
    prev = s;
    await p.waitForTimeout(100);
  }
  return prev;
}

test('Fit Selection frames a small object beyond the 200% canvas-fit ceiling', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  await p.evaluate(() => (window as any).__e2e.select(['rect']));
  await p.waitForTimeout(300);
  await p.keyboard.press('Shift+2');
  const scale = await settledScale(p);
  expect(scale).toBeGreaterThan(4);
  // Still framed: the object sits inside the window.
  const box = await editor.nodeBox('rect');
  expect(box.x).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThan(1600);
});

test('double-click drill-down selects the child without moving the camera', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const before = await settledScale(p);
  const rect = await editor.nodeBox('rect');
  const at = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await p.mouse.click(at.x, at.y);
  await expect.poll(() => p.evaluate(() => (window as any).__e2e.selection())).toEqual(['outer']);
  await p.mouse.dblclick(at.x, at.y);
  await expect.poll(() => p.evaluate(() => (window as any).__e2e.selection())).toEqual(['rect']);
  await p.waitForTimeout(800);
  expect(await scaleOf(p)).toBeCloseTo(before, 6);
  const after = await editor.nodeBox('rect');
  expect(Math.abs(after.x - rect.x)).toBeLessThan(1);
  expect(Math.abs(after.y - rect.y)).toBeLessThan(1);
});

test('menu zoom pivots on the visible canvas centre, not the last pointer', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  // Park the pointer far off-centre on the canvas, as the audit's double-click did.
  const outer = await editor.nodeBox('outer');
  await p.mouse.move(outer.x + 10, outer.y + 10);
  await p.waitForTimeout(200);

  const area = await p.evaluate(() => {
    const el = document.querySelector('iframe[src*="5174"]')!.getBoundingClientRect();
    return { x: el.x, y: el.y, w: el.width, h: el.height };
  });
  const before = await editor.nodeBox('outer');
  const s0 = await settledScale(p);

  await p.locator('[data-inspector-zoom]').first().click();
  await p.getByText('Zoom out', { exact: true }).first().click();
  const s1 = await settledScale(p);
  expect(s1).toBeLessThan(s0);
  const after = await editor.nodeBox('outer');

  // The fixed point A satisfies p1 = A + (p0 - A) * k  →  A = (p1 - k p0) / (1 - k).
  const k = s1 / s0;
  const ax = (after.x - k * before.x) / (1 - k);
  const ay = (after.y - k * before.y) / (1 - k);
  // Pivot is far from the parked pointer…
  expect(Math.hypot(ax - (outer.x + 10), ay - (outer.y + 10))).toBeGreaterThan(150);
  // …and inside the central part of the canvas.
  expect(ax).toBeGreaterThan(area.x + area.w * 0.2);
  expect(ax).toBeLessThan(area.x + area.w * 0.8);
});
