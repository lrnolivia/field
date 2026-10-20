// Rotation outline/handles follow the painted geometry immediately.
//
// Audit 2026-10-04: after an Inspector rotation or an undo/redo the selection
// outline and handles could keep the previous rotation until the layer was
// re-selected. Probes at the painted corners give the true quad; every resize
// handle must sit on the matching probe without changing selection.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const probes = ['tl', 'tr', 'br', 'bl'].map((corner) => {
  const left = corner === 'tl' || corner === 'bl' ? '0px' : '100%';
  const top = corner === 'tl' || corner === 'tr' ? '0px' : '100%';
  return `<div data-id="p-${corner}" data-name="p ${corner}" style={{ position: 'absolute', left: '${left}', top: '${top}', width: '0px', height: '0px' }} />`;
}).join('\n        ');

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '650px', background: '#ffffff' }}>
      <svg data-id="shape" data-name="Rectangle" viewBox="0 0 160 120" preserveAspectRatio="none" style={{ position: 'absolute', left: '560px', top: '200px', width: '160px', height: '120px', overflow: 'visible' }}>
        <rect data-id="shape-rect" x="0" y="0" width="160" height="120" fill="#d9d9d9" />
      </svg>
      <div data-id="card" data-name="Card" style={{ position: 'absolute', left: '200px', top: '200px', width: '240px', height: '120px', background: '#3b82f6' }}>
        ${probes}
      </div>
    </div>
  );
}
`;

const HANDLE_FOR: Record<string, string> = { tl: 'topLeft', tr: 'topRight', br: 'bottomRight', bl: 'bottomLeft' };

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
  await editor.node('card').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await page.waitForTimeout(500);
}

/** Max distance between each resize handle centre and its painted corner. */
async function overlayError(page: Page, editor: EditorPage): Promise<number> {
  let worst = 0;
  for (const [corner, dir] of Object.entries(HANDLE_FOR)) {
    const probe = await editor.nodeBox(`p-${corner}`);
    const hb = await page.locator(`[data-resize-dir="${dir}"]`).boundingBox();
    if (!hb) return Infinity;
    const dx = hb.x + hb.width / 2 - probe.x;
    const dy = hb.y + hb.height / 2 - probe.y;
    worst = Math.max(worst, Math.hypot(dx, dy));
  }
  return worst;
}

async function expectOverlayOnPaint(page: Page, editor: EditorPage, label: string) {
  await expect.poll(() => overlayError(page, editor), { message: label, timeout: 3_000 }).toBeLessThan(2.5);
}

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('Inspector rotation, undo and redo refresh the selection outline without reselection', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(page);
  await seed(page, editor);
  await page.evaluate(() => (window as any).__e2e.select(['card']));
  await page.waitForTimeout(400);
  await expectOverlayOnPaint(page, editor, 'initial');

  const input = page.getByRole('textbox', { name: 'Rotation' }).or(page.locator('input[aria-label="Rotation"]')).first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  // The right half of the field is a scrub zone; type into the left half.
  await input.click({ position: { x: 8, y: 8 } });
  await input.fill('30');
  await input.press('Enter');
  await expect.poll(async () => {
    const tl = await editor.nodeBox('p-tl');
    const tr = await editor.nodeBox('p-tr');
    return Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  }).toBe(30);
  await expectOverlayOnPaint(page, editor, 'after Inspector rotation');
  expect(await page.evaluate(() => (window as any).__e2e.selection())).toEqual(['card']);

  // Focus the canvas side before history shortcuts.
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => (window as any).__e2e.select(['card']));
  await page.keyboard.press(`${mod}+z`);
  await expect.poll(async () => {
    const tl = await editor.nodeBox('p-tl');
    const tr = await editor.nodeBox('p-tr');
    return Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  }).toBe(0);
  await expectOverlayOnPaint(page, editor, 'after undo');

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect.poll(async () => {
    const tl = await editor.nodeBox('p-tl');
    const tr = await editor.nodeBox('p-tr');
    return Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  }).toBe(30);
  await expectOverlayOnPaint(page, editor, 'after redo');
});

/** Painted quad of the svg's inner shape (screen coords of the top page). */
async function svgQuad(page: Page): Promise<Record<string, { x: number; y: number }>> {
  const frameBox = (await page.locator('iframe[src*="5174"]').boundingBox())!;
  const frame = page.frames().find((f) => f.url().includes('5174'))!;
  const local = await frame.evaluate(() => {
    const el = document.querySelector('[data-id="shape"] rect, [data-id="shape"] > *') as SVGGraphicsElement;
    const m = el.getScreenCTM()!;
    const bb = el.getBBox();
    const pt = (x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    return {
      tl: pt(bb.x, bb.y), tr: pt(bb.x + bb.width, bb.y),
      br: pt(bb.x + bb.width, bb.y + bb.height), bl: pt(bb.x, bb.y + bb.height),
    };
  });
  const out: Record<string, { x: number; y: number }> = {};
  for (const [k, v] of Object.entries(local)) out[k] = { x: v.x + frameBox.x, y: v.y + frameBox.y };
  return out;
}

async function svgOverlayError(page: Page): Promise<number> {
  const quad = await svgQuad(page);
  const handles: Array<{ x: number; y: number }> = [];
  for (const dir of Object.values(HANDLE_FOR)) {
    const hb = await page.locator(`[data-resize-dir="${dir}"]`).boundingBox();
    if (!hb) return Infinity;
    handles.push({ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 });
  }
  // Rotation may relabel which handle sits on which painted corner; match
  // each painted corner to its nearest handle.
  let worst = 0;
  for (const p of Object.values(quad)) {
    worst = Math.max(worst, Math.min(...handles.map((h) => Math.hypot(h.x - p.x, h.y - p.y))));
  }
  return worst;
}

async function svgAngle(page: Page): Promise<number> {
  const q = await svgQuad(page);
  return Math.round(Math.atan2(q.tr.y - q.tl.y, q.tr.x - q.tl.x) * 180 / Math.PI);
}

test('svg Rectangle: Inspector rotation, undo and redo refresh the outline without reselection', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(page);
  await seed(page, editor);
  await page.evaluate(() => (window as any).__e2e.select(['shape']));
  await page.waitForTimeout(400);
  await expect.poll(() => svgOverlayError(page), { timeout: 3_000 }).toBeLessThan(2.5);

  const input = page.locator('input[aria-label="Rotation"]').first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.click({ position: { x: 8, y: 8 } });
  await input.fill('30');
  await input.press('Enter');
  await expect.poll(() => svgAngle(page)).toBe(30);
  await expect.poll(() => svgOverlayError(page), { message: 'after Inspector rotation', timeout: 3_000 }).toBeLessThan(2.5);

  await page.evaluate(() => (window as any).__e2e.select(['shape']));
  await page.keyboard.press(`${mod}+z`);
  await expect.poll(() => svgAngle(page)).toBe(0);
  await expect.poll(() => svgOverlayError(page), { message: 'after undo', timeout: 3_000 }).toBeLessThan(2.5);

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect.poll(() => svgAngle(page)).toBe(30);
  await expect.poll(() => svgOverlayError(page), { message: 'after redo', timeout: 3_000 }).toBeLessThan(2.5);
});
