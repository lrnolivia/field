// Object snapping reaches its target from either side, at any zoom, however
// the pointer arrives.
//
// Figma audit 2026-10-04: dragging a rectangle so its left edge stopped at
// 422 (or 426) next to a text whose left edge is 424 committed 422/426 in
// Field at 100% and 90%; Figma committed 424. The snap must engage within its
// screen-space threshold, the committed position must equal the guide, and
// the guide must sit on the committed edge.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const page = (rectLeft: number) => `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '520px', background: '#ffffff' }}>
      <div data-id="rect" data-name="Rectangle" style={{ position: 'absolute', left: '${rectLeft}px', top: '128px', width: '160px', height: '120px', background: '#ef4444' }} />
      <p data-id="label" data-name="Label" style={{ position: 'absolute', left: '424px', top: '320px', width: '320px', margin: '0px', fontSize: '32px', lineHeight: '56px' }}>Snap target</p>
    </div>
  );
}
`;

async function seed(p: Page, editor: EditorPage, rectLeft: number, scale: number) {
  const project = {
    format: 'revyme-v1',
    files: {
      'app/page.tsx': `import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n`,
      'app/page.client.tsx': page(rectLeft),
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
  await p.evaluate((s) => (window as any).__e2e.zoomTo(s), scale);
  await expect.poll(() => p.evaluate(() => (window as any).__e2e.cameraScale())).toBeCloseTo(scale, 3);
  await p.waitForTimeout(500);
}

/** Drag the rectangle body so its left edge ends at `targetLeft` design px.
 *  `finalStep` = screen px covered by the last pointer move (a quick final
 *  approach vs a careful one). */
async function dragLeftEdgeTo(p: Page, editor: EditorPage, startLeft: number, targetLeft: number, scale: number, finalStep: number) {
  const box = await editor.nodeBox('rect');
  const from = { x: box.x + 40, y: box.y + 40 };
  const totalDx = (targetLeft - startLeft) * scale;
  const to = { x: from.x + totalDx, y: from.y };
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  const dir = Math.sign(totalDx);
  const approach = to.x - dir * finalStep;
  for (let i = 1; i <= 20; i++) {
    await p.mouse.move(from.x + (approach - from.x) * (i / 20), from.y, { steps: 1 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  }
  await p.mouse.move(to.x, to.y, { steps: 1 });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  await p.waitForTimeout(150);
  // Guide visible while held, aligned with the rectangle's live left edge.
  const live = await editor.nodeBox('rect');
  const guides = await p.locator('svg line[stroke="#f472b6"]').evaluateAll((els) =>
    els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  await p.mouse.up();
  await p.waitForTimeout(700);
  return { live, guides };
}

for (const scale of [1, 0.9]) {
  for (const [startLeft, stopAt] of [[48, 422], [500, 426]] as const) {
    for (const finalStep of [1, 12]) {
      test(`${Math.round(scale * 100)}%: stopping at ${stopAt} (final move ${finalStep}px) snaps the left edge to 424`, async ({ page: p }) => {
        test.setTimeout(120_000);
        const editor = new EditorPage(p);
        await seed(p, editor, startLeft, scale);
        await p.evaluate(() => (window as any).__e2e.select(['rect']));
        await p.waitForTimeout(300);

        const { live, guides } = await dragLeftEdgeTo(p, editor, startLeft, stopAt, scale, finalStep);
        // Dynamic pinning may store the centre band as a percentage of the
        // 900px page; resolve it to design px.
        const committed: string = await p.evaluate(() => (window as any).__e2e.nodesSnapshot().rect.styles.left);
        const px = committed.endsWith('%') ? parseFloat(committed) * 9 : parseFloat(committed);
        expect(px, `committed left ${committed}`).toBeCloseTo(424, 2);

        const label = await editor.nodeBox('label');
        const rect = await editor.nodeBox('rect');
        expect(Math.abs(rect.x - label.x)).toBeLessThan(0.75);
        // While held, a vertical guide sat on the snapped edge.
        expect(Math.abs(live.x - label.x)).toBeLessThan(0.75);
        expect(guides.some((g) => g.h > g.w && Math.abs(g.x + g.w / 2 - label.x) < 1.5)).toBe(true);
      });
    }
  }
}

test('releasing immediately after a quick final move still commits the snapped position', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor, 48, 1);
  await p.evaluate(() => (window as any).__e2e.select(['rect']));
  await p.waitForTimeout(300);
  const box = await editor.nodeBox('rect');
  const from = { x: box.x + 40, y: box.y + 40 };
  const to = { x: from.x + (422 - 48), y: from.y };
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await p.mouse.move(from.x + (to.x - 12 - from.x) * (i / 20), from.y, { steps: 1 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  }
  await p.mouse.move(to.x, to.y, { steps: 1 });
  await p.mouse.up();
  await p.waitForTimeout(700);
  const committed: string = await p.evaluate(() => (window as any).__e2e.nodesSnapshot().rect.styles.left);
  const px = committed.endsWith('%') ? parseFloat(committed) * 9 : parseFloat(committed);
  expect(px, `committed left ${committed}`).toBeCloseTo(424, 2);
});
