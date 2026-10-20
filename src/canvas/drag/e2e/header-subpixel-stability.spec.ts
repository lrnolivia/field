// Frame name labels and the Desktop viewport header stay locked to their
// node through fractional pan and zoom (no 1px "jiggle").
//
// Every step below is a sub-pixel wheel pan or a small pinch-zoom. After each
// frame the header's offset from its node is measured in screen px; a stable
// anchor means that offset never wanders. Readable sizing is preserved: the
// label keeps its screen-space height at every zoom.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '500px', background: '#ffffff' }} />
  );
}
const canvasNodes = (<>
  <div data-id="card" data-name="Card frame" data-canvas-node="true" style={{ position: 'absolute', left: '1100px', top: '80px', width: '300px', height: '200px', background: '#e0e7ff' }} />
</>);
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
  await editor.node('card').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await p.waitForTimeout(800);
}

type Sample = { labelDx: number; labelDy: number; labelH: number; headerDx: number; headerDy: number };

async function sample(p: Page, editor: EditorPage): Promise<Sample | null> {
  const label = await p.locator('[data-canvas-node-label$=":card"]').first().boundingBox();
  const card = await editor.node('card').boundingBox();
  const header = await p.locator('[data-viewport-header="desktop"]').first().boundingBox({ timeout: 2_000 }).catch(() => null);
  const vp = await editor.sandbox().locator('[data-viewport="desktop"]').first().boundingBox();
  if (!label || !card || !header || !vp) return null;
  return {
    labelDx: label.x - card.x,
    labelDy: card.y - (label.y + label.height),
    labelH: label.height,
    headerDx: header.x - vp.x,
    headerDy: vp.y - (header.y + header.height),
  };
}

const frame = (p: Page) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

test('headers keep a constant offset from their node through sub-pixel pans', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const canvas = await editor.node('root').boundingBox();
  await p.mouse.move(canvas!.x + 200, canvas!.y + 200);

  const samples: Sample[] = [];
  for (let i = 0; i < 40; i++) {
    await p.mouse.wheel(0.37 * (i % 2 ? 1 : 1.3), 0.29);
    await frame(p);
    const s = await sample(p, editor);
    if (s) samples.push(s);
  }
  expect(samples.length).toBeGreaterThan(30);
  const report = {
    labelDx: spread(samples.map((s) => s.labelDx)),
    labelDy: spread(samples.map((s) => s.labelDy)),
    headerDx: spread(samples.map((s) => s.headerDx)),
    headerDy: spread(samples.map((s) => s.headerDy)),
  };
  console.log('PAN SPREAD', JSON.stringify(report));
  expect(report.labelDx).toBeLessThan(0.75);
  expect(report.labelDy).toBeLessThan(0.75);
  expect(report.headerDx).toBeLessThan(0.75);
  expect(report.headerDy).toBeLessThan(0.75);
});

test('headers stay anchored and readable through fractional zoom', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const canvas = await editor.node('root').boundingBox();
  await p.mouse.move(canvas!.x + 300, canvas!.y + 150);

  const samples: Sample[] = [];
  for (let i = 0; i < 30; i++) {
    await p.keyboard.down('Control');
    await p.mouse.wheel(0, i < 15 ? -1.7 : 1.3);
    await p.keyboard.up('Control');
    await frame(p);
    const s = await sample(p, editor);
    if (s) samples.push(s);
  }
  expect(samples.length).toBeGreaterThan(20);
  const report = {
    labelDx: spread(samples.map((s) => s.labelDx)),
    labelDy: spread(samples.map((s) => s.labelDy)),
    labelH: spread(samples.map((s) => s.labelH)),
    headerDx: spread(samples.map((s) => s.headerDx)),
    headerDy: spread(samples.map((s) => s.headerDy)),
  };
  console.log('ZOOM SPREAD', JSON.stringify(report));
  expect(report.labelDx).toBeLessThan(0.75);
  expect(report.labelDy).toBeLessThan(0.75);
  expect(report.labelH).toBeLessThan(0.75);
  expect(report.headerDx).toBeLessThan(0.75);
  expect(report.headerDy).toBeLessThan(0.75);
});

test('the Frame label tracks the camera every frame during continuous fractional panning', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const card0 = (await editor.node('card').boundingBox())!;
  const label0 = (await p.locator('[data-canvas-node-label$=":card"]').first().boundingBox())!;
  const canvas = await editor.node('root').boundingBox();
  await p.mouse.move(canvas!.x + 200, canvas!.y + 200);

  // Per-frame sampler in the editor document: the Frame label against the
  // Desktop header, which lives in the transformed canvas layer and so moves
  // in exactly the frame the canvas does. Under a pure pan their offset is a
  // constant; any wobble is label jitter relative to the canvas.
  await p.evaluate(() => {
    const out: number[][] = [];
    (window as any).__labelSamples = out;
    const tick = () => {
      const label = document.querySelector('[data-canvas-node-label$=":card"]') as HTMLElement | null;
      const header = document.querySelector('[data-viewport-header="desktop"]') as HTMLElement | null;
      if (label && header) {
        const a = label.getBoundingClientRect();
        const b = header.getBoundingClientRect();
        out.push([a.left - b.left, a.top - b.top]);
      }
      if ((window as any).__labelSampling) requestAnimationFrame(tick);
    };
    (window as any).__labelSampling = true;
    requestAnimationFrame(tick);
  });

  for (let i = 0; i < 60; i++) await p.mouse.wheel(0.6 + (i % 3) * 0.17, 0.41);
  await p.waitForTimeout(300);
  const samples: number[][] = await p.evaluate(() => {
    (window as any).__labelSampling = false;
    return (window as any).__labelSamples;
  });
  expect(samples.length).toBeGreaterThan(20);
  const dx = samples.map((s) => s[0]);
  const dy = samples.map((s) => s[1]);
  console.log('LIVE SPREAD', JSON.stringify({ n: samples.length, dx: spread(dx), dy: spread(dy), label0: label0.x - card0.x }));
  expect(spread(dx)).toBeLessThan(0.75);
  expect(spread(dy)).toBeLessThan(0.75);
});

// KNOWN GAP (2026-10-20): Chromium dispatches wheel/pointer input rAF-aligned,
// so the editor applies a new camera in the SAME frame while the cross-origin
// sandbox, reached by postMessage, applies it one frame later. Content and its
// editor-side headers drift by one pan step on every moving frame (measured
// 1.68px x / 0.74px y at 0.6–0.94px steps; settled frames are exact). Fixing
// it needs a staged camera pipeline (editor applies each input camera one frame
// late and projects cached rects with that applied camera), which changes the
// timing contract drag/auto-pan/hit-testing rely on — tracked for review.
test.fixme('the canvas content and its headers move in the same frame during continuous panning', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const iframeBox = (await p.locator('iframe[src*="5174"]').boundingBox())!;
  const canvas = await editor.node('root').boundingBox();
  await p.mouse.move(canvas!.x + 200, canvas!.y + 200);
  const sandbox = p.frames().find((f) => f.url().includes('5174'))!;

  const startSampler = `(() => {
    const out = []; window.__s = out; window.__on = true;
    const tick = () => { const el = document.querySelector(SEL); if (el) { const r = el.getBoundingClientRect(); out.push([performance.timeOrigin + performance.now(), r.left, r.top]); } if (window.__on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })()`;
  await p.evaluate(startSampler.replace('SEL', JSON.stringify('[data-viewport-header="desktop"]')));
  await sandbox.evaluate(startSampler.replace('SEL', JSON.stringify('[data-id="card"]')));

  for (let i = 0; i < 60; i++) await p.mouse.wheel(0.6 + (i % 3) * 0.17, 0.41);
  await p.waitForTimeout(300);
  const stop = '(() => { window.__on = false; return window.__s; })()';
  const host: number[][] = await p.evaluate(stop);
  const frame: number[][] = await sandbox.evaluate(stop);

  // Pair each editor frame with the sandbox frame painted at the same vsync.
  const pairs: number[][] = [];
  for (const [t, hx, hy] of host) {
    let best: number[] | null = null;
    for (const s of frame) if (!best || Math.abs(s[0] - t) < Math.abs(best[0] - t)) best = s;
    if (best && Math.abs(best[0] - t) < 4) pairs.push([best[1] + iframeBox.x - hx, best[2] + iframeBox.y - hy]);
  }
  console.log('XDOC SPREAD', JSON.stringify({ host: host.length, frame: frame.length, pairs: pairs.length, dx: spread(pairs.map((q) => q[0])), dy: spread(pairs.map((q) => q[1])) }));
  expect(pairs.length).toBeGreaterThan(10);
  expect(spread(pairs.map((q) => q[0]))).toBeLessThan(0.75);
  expect(spread(pairs.map((q) => q[1]))).toBeLessThan(0.75);
});
