// Native Group corner resize — ONE shared affine for every descendant.
//
// A Group is not a Frame: dragging its corner maps every descendant's painted
// geometry through the same anchor-preserving scale. Rotated children and a
// rotated nested Group are the cases where a per-box approximation drifts, so
// zero-size probes sit at the painted corners of those nodes and every probe
// must land exactly where the Group's own resize map sends it. Undo restores
// the original painted geometry in one step.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const probes = (prefix: string) => ['tl', 'tr', 'br', 'bl'].map((corner) => {
  const left = corner === 'tl' || corner === 'bl' ? '0px' : '100%';
  const top = corner === 'tl' || corner === 'tr' ? '0px' : '100%';
  return `<div data-id="${prefix}-${corner}" data-name="${prefix} ${corner}" style={{ position: 'absolute', left: '${left}', top: '${top}', width: '0px', height: '0px' }} />`;
}).join('\n          ');

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '650px', background: '#ffffff' }}>
      <div data-id="grp" data-name="Group" data-field-group="true" style={{ position: 'absolute', left: '100px', top: '100px', width: '300px', height: '200px' }}>
        <div data-id="c-a" data-name="Corner A" style={{ position: 'absolute', left: '0px', top: '0px', width: '20px', height: '20px', background: '#ef4444' }} />
        <div data-id="c-b" data-name="Corner B" style={{ position: 'absolute', left: '280px', top: '180px', width: '20px', height: '20px', background: '#3b82f6' }} />
        <div data-id="rot" data-name="Rotated" style={{ position: 'absolute', left: '40px', top: '60px', width: '100px', height: '40px', transform: 'rotate(30deg)', background: '#22c55e' }}>
          ${probes('rot')}
        </div>
        <div data-id="nested" data-name="Nested" data-field-group="true" style={{ position: 'absolute', left: '160px', top: '20px', width: '120px', height: '100px', transform: 'rotate(15deg)' }}>
          <div data-id="n-a" data-name="Nested A" style={{ position: 'absolute', left: '0px', top: '0px', width: '50px', height: '50px', background: '#a855f7' }}>
            ${probes('na')}
          </div>
          <div data-id="n-b" data-name="Nested B" style={{ position: 'absolute', left: '70px', top: '50px', width: '50px', height: '50px', background: '#f59e0b' }}>
            ${probes('nb')}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// Audit fixture: a rectangle and a regular nested Frame inside one outer Frame.
const MULTI_PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '700px', background: '#ffffff' }}>
      <div data-id="outer" data-name="Outer" style={{ position: 'absolute', left: '20px', top: '20px', width: '820px', height: '640px', background: '#f3f4f6' }}>
        <div data-id="rect" data-name="Rectangle" style={{ position: 'absolute', left: '48px', top: '128px', width: '160px', height: '120px', background: '#ef4444' }} />
        <div data-id="inner" data-name="Inner" style={{ position: 'absolute', left: '400px', top: '350px', width: '250px', height: '200px', background: '#3b82f6' }}>
          <div data-id="inner-child" data-name="Inner child" style={{ position: 'absolute', left: '20px', top: '20px', width: '40px', height: '40px', background: '#22c55e' }} />
        </div>
      </div>
    </div>
  );
}
`;

const PROBE_IDS = ['rot', 'na', 'nb'].flatMap((p) => ['tl', 'tr', 'br', 'bl'].map((c) => `${p}-${c}`));
const BOX_IDS = ['c-a', 'c-b'];

type Pt = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

async function readGeometry(editor: EditorPage): Promise<{ group: Box; points: Record<string, Pt>; boxes: Record<string, Box> }> {
  const group = await editor.nodeBox('grp');
  const points: Record<string, Pt> = {};
  for (const id of PROBE_IDS) {
    const b = await editor.nodeBox(id);
    points[id] = { x: b.x, y: b.y };
  }
  const boxes: Record<string, Box> = {};
  for (const id of BOX_IDS) boxes[id] = await editor.nodeBox(id);
  return { group, points, boxes };
}

async function seed(page: Page, editor: EditorPage, pageSource = PAGE, readyId = 'grp') {
  const project = {
    format: 'revyme-v1',
    files: {
      'app/page.tsx': `import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n`,
      'app/page.client.tsx': pageSource,
    },
  };
  await page.addInitScript((data) => {
    window.localStorage.setItem('revyme-project-local', JSON.stringify(data));
    window.localStorage.setItem('revyme-onboarding-completed', 'true');
  }, project);
  await page.goto('/work/local');
  await editor.sandbox().locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await editor.node(readyId).waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await page.waitForTimeout(500);
}

async function dragHandle(page: Page, dir: string, delta: Pt) {
  const handle = page.locator(`[data-resize-dir="${dir}"]`);
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

function expectNear(received: number, expected: number, label: string, tolerance = 1.5) {
  expect(Math.abs(received - expected), `${label}: ${received} vs ${expected}`).toBeLessThan(tolerance);
}

test.describe('native Group resize — shared affine', () => {
  test('non-uniform corner resize maps rotated and nested descendants through one affine, and undo restores it', async ({ page }) => {
    test.setTimeout(120_000);
    const editor = new EditorPage(page);
    await seed(page, editor);

    await page.evaluate(() => (window as any).__e2e.select(['grp']));
    await page.waitForTimeout(400);
    const before = await readGeometry(editor);
    const parentsBefore = await page.evaluate(() => {
      const snap = (window as any).__e2e.nodesSnapshot();
      return Object.fromEntries(Object.entries(snap).map(([id, n]: [string, any]) => [id, n.parentId]));
    });

    // Non-uniform: widen a lot, heighten a little.
    await dragHandle(page, 'bottomRight', { x: 150, y: 40 });
    const after = await readGeometry(editor);

    // The Group's own anchor (TL) is preserved and it actually resized.
    expectNear(after.group.x, before.group.x, 'group left');
    expectNear(after.group.y, before.group.y, 'group top');
    const sx = after.group.width / before.group.width;
    const sy = after.group.height / before.group.height;
    expect(sx).toBeGreaterThan(1.2);
    expect(Math.abs(sx - sy)).toBeGreaterThan(0.1);

    const map = (p: Pt): Pt => ({
      x: before.group.x + (p.x - before.group.x) * sx,
      y: before.group.y + (p.y - before.group.y) * sy,
    });

    for (const id of PROBE_IDS) {
      const expected = map(before.points[id]);
      expectNear(after.points[id].x, expected.x, `${id}.x`);
      expectNear(after.points[id].y, expected.y, `${id}.y`);
    }
    for (const id of BOX_IDS) {
      const tl = map({ x: before.boxes[id].x, y: before.boxes[id].y });
      expectNear(after.boxes[id].x, tl.x, `${id}.x`);
      expectNear(after.boxes[id].y, tl.y, `${id}.y`);
      expectNear(after.boxes[id].width, before.boxes[id].width * sx, `${id}.width`);
      expectNear(after.boxes[id].height, before.boxes[id].height * sy, `${id}.height`);
    }

    // Hierarchy is untouched.
    const parentsAfter = await page.evaluate(() => {
      const snap = (window as any).__e2e.nodesSnapshot();
      return Object.fromEntries(Object.entries(snap).map(([id, n]: [string, any]) => [id, n.parentId]));
    });
    expect(parentsAfter).toEqual(parentsBefore);

    // One undo returns every painted point.
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(800);
    const undone = await readGeometry(editor);
    expectNear(undone.group.width, before.group.width, 'undo group width');
    expectNear(undone.group.height, before.group.height, 'undo group height');
    for (const id of PROBE_IDS) {
      expectNear(undone.points[id].x, before.points[id].x, `undo ${id}.x`);
      expectNear(undone.points[id].y, before.points[id].y, `undo ${id}.y`);
    }
  });

  test('multi-selection corner resize scales positions and sizes across the shared bounds in one undo', async ({ page }) => {
    test.setTimeout(120_000);
    const editor = new EditorPage(page);
    await seed(page, editor, MULTI_PAGE, 'inner');

    await page.evaluate(() => (window as any).__e2e.select(['rect', 'inner']));
    await page.waitForTimeout(500);
    const rect0 = await editor.nodeBox('rect');
    const inner0 = await editor.nodeBox('inner');
    const child0 = await editor.nodeBox('inner-child');
    const box0 = {
      x: Math.min(rect0.x, inner0.x),
      y: Math.min(rect0.y, inner0.y),
      right: Math.max(rect0.x + rect0.width, inner0.x + inner0.width),
      bottom: Math.max(rect0.y + rect0.height, inner0.y + inner0.height),
    };

    await dragHandle(page, 'bottomRight', { x: 90, y: 40 });

    const rect1 = await editor.nodeBox('rect');
    const inner1 = await editor.nodeBox('inner');
    const sx = (Math.max(rect1.x + rect1.width, inner1.x + inner1.width) - box0.x) / (box0.right - box0.x);
    const sy = (Math.max(rect1.y + rect1.height, inner1.y + inner1.height) - box0.y) / (box0.bottom - box0.y);
    expect(sx).toBeGreaterThan(1.1);
    const map = (p: Pt): Pt => ({ x: box0.x + (p.x - box0.x) * sx, y: box0.y + (p.y - box0.y) * sy });

    for (const [label, before, after] of [['rect', rect0, rect1], ['inner', inner0, inner1]] as const) {
      const tl = map({ x: before.x, y: before.y });
      expectNear(after.x, tl.x, `${label}.x`, 2);
      expectNear(after.y, tl.y, `${label}.y`, 2);
      expectNear(after.width, before.width * sx, `${label}.width`, 2);
      expectNear(after.height, before.height * sy, `${label}.height`, 2);
    }
    // A Frame keeps its children's local geometry (Resize, not Scale).
    const child1 = await editor.nodeBox('inner-child');
    expectNear(child1.width, child0.width, 'inner-child.width');
    expectNear(child1.x - inner1.x, child0.x - inner0.x, 'inner-child local x');

    const parents = await page.evaluate(() => {
      const snap = (window as any).__e2e.nodesSnapshot();
      return [snap.rect.parentId, snap.inner.parentId, snap['inner-child'].parentId];
    });
    expect(parents).toEqual(['outer', 'outer', 'inner']);

    // Source carries the committed geometry.
    const code = await editor.getPageCode();
    expect(code).toMatch(new RegExp(`data-id="inner"[^>]*left: '${Math.round(48 + (400 - 48) * sx)}px'|data-id="inner"[^>]*left: '${Math.round(48 + (400 - 48) * sx) - 1}px'|data-id="inner"[^>]*left: '${Math.round(48 + (400 - 48) * sx) + 1}px'`));

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(800);
    const rect2 = await editor.nodeBox('rect');
    const inner2 = await editor.nodeBox('inner');
    expectNear(rect2.width, rect0.width, 'undo rect.width');
    expectNear(inner2.x, inner0.x, 'undo inner.x');
    expectNear(inner2.y, inner0.y, 'undo inner.y');
    expectNear(inner2.width, inner0.width, 'undo inner.width');
  });
});
