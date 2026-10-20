// Hierarchy-aware dragging in nested regular Frames (Figma audit 2026-10-04).
//
//  - An explicitly selected nested child keeps its identity when dragged:
//    the gesture moves the child, never its parent Frame.
//  - Dropping a child into / out of a regular (no-layout) Frame reparents it,
//    converts world → local coordinates so it stays where it was dropped,
//    and one undo restores the original parent and position.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '700px', background: '#ffffff' }}>
      <div data-id="outer" data-name="Outer" style={{ position: 'absolute', left: '20px', top: '20px', width: '840px', height: '640px', overflow: 'hidden', background: '#f3f4f6' }}>
        <div data-id="rect" data-name="Rectangle" style={{ position: 'absolute', left: '48px', top: '128px', width: '120px', height: '90px', background: '#ef4444' }} />
        <div data-id="inner" data-name="Inner" style={{ position: 'absolute', left: '400px', top: '300px', width: '320px', height: '260px', overflow: 'hidden', background: '#bfdbfe' }}>
          <div data-id="n-child" data-name="Nested child" style={{ position: 'absolute', left: '40px', top: '40px', width: '100px', height: '80px', background: '#22c55e' }} />
        </div>
      </div>
    </div>
  );
}
`;

type Box = { x: number; y: number; width: number; height: number };

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
  await editor.node('n-child').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await page.waitForTimeout(500);
}

async function parentOf(page: Page, id: string): Promise<string | null> {
  return page.evaluate((nodeId) => (window as any).__e2e.nodesSnapshot()[nodeId]?.parentId ?? null, id);
}

async function stylesOf(page: Page, id: string): Promise<Record<string, string>> {
  return page.evaluate((nodeId) => (window as any).__e2e.nodesSnapshot()[nodeId]?.styles ?? {}, id);
}

function expectNear(received: number, expected: number, label: string, tolerance = 2) {
  expect(Math.abs(received - expected), `${label}: ${received} vs ${expected}`).toBeLessThan(tolerance);
}

const undo = (page: Page) => page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');

/** Drags by `delta` and returns the start box plus the box just before release. */
async function dragBodyBy(editor: EditorPage, id: string, delta: { x: number; y: number }): Promise<Box & { release: Box }> {
  const box = await editor.nodeBox(id);
  // Grab near the top-left so the drop point is predictable for reparenting.
  const from = { x: box.x + Math.min(20, box.width / 3), y: box.y + Math.min(20, box.height / 3) };
  const page = editor.page();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = Number(process.env.E2E_STEPS ?? 16);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (delta.x * i) / steps, from.y + (delta.y * i) / steps, { steps: 1 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  }
  await editor.pumpDrag({ x: from.x + delta.x, y: from.y + delta.y }, 8);
  await page.mouse.move(from.x + delta.x, from.y + delta.y);
  const release = await editor.nodeBox(id);
  await page.mouse.up();
  await page.waitForTimeout(700);
  return { ...box, release };
}

test.describe('Frame hierarchy drag', () => {
  test('explicitly selected nested child moves itself, not its parent Frame', async ({ page }) => {
    test.setTimeout(120_000);
    const editor = new EditorPage(page);
    await seed(page, editor);
    await page.evaluate(() => (window as any).__e2e.select(['n-child']));
    await page.waitForTimeout(400);

    const innerBefore = await editor.nodeBox('inner');
    const childBefore = await dragBodyBy(editor, 'n-child', { x: 60, y: 40 });
    const innerAfter = await editor.nodeBox('inner');
    const childAfter = await editor.nodeBox('n-child');

    expectNear(innerAfter.x, innerBefore.x, 'inner.x');
    expectNear(innerAfter.y, innerBefore.y, 'inner.y');
    // Follows the pointer (object snapping may pull it a few px), and the
    // commit lands exactly where the gesture released.
    expectNear(childAfter.x - childBefore.x, 60, 'child dx', 8);
    expectNear(childAfter.y - childBefore.y, 40, 'child dy', 8);
    expectNear(childAfter.x, childBefore.release.x, 'commit x == release x');
    expectNear(childAfter.y, childBefore.release.y, 'commit y == release y');
    expect(await parentOf(page, 'n-child')).toBe('inner');
    expect(await page.evaluate(() => (window as any).__e2e.selection())).toEqual(['n-child']);
  });

  test('explicitly selected nested child dragged out of its Frame reparents with world geometry and undoes', async ({ page }) => {
    test.setTimeout(120_000);
    const editor = new EditorPage(page);
    await seed(page, editor);
    await page.evaluate(() => (window as any).__e2e.select(['n-child']));
    await page.waitForTimeout(400);

    const innerBefore = await editor.nodeBox('inner');
    const outerBox = await editor.nodeBox('outer');
    const scale = innerBefore.width / 320;
    const childBefore = await dragBodyBy(editor, 'n-child', { x: -260 * scale, y: -220 * scale });
    const childAfter = await editor.nodeBox('n-child');
    const innerAfter = await editor.nodeBox('inner');

    expectNear(innerAfter.x, innerBefore.x, 'inner.x stays');
    expect(await parentOf(page, 'n-child')).toBe('outer');
    expectNear(childAfter.x - childBefore.x, -260 * scale, 'world dx', 8);
    expectNear(childAfter.y - childBefore.y, -220 * scale, 'world dy', 8);
    expectNear(childAfter.x, childBefore.release.x, 'commit x == release x');
    expectNear(childAfter.y, childBefore.release.y, 'commit y == release y');
    const styles = await stylesOf(page, 'n-child');
    expectNear(parseFloat(styles.left), (childAfter.x - outerBox.x) / scale, 'outer-local left', 2);
    expectNear(parseFloat(styles.top), (childAfter.y - outerBox.y) / scale, 'outer-local top', 2);

    await undo(page);
    await page.waitForTimeout(800);
    expect(await parentOf(page, 'n-child')).toBe('inner');
    const childUndone = await editor.nodeBox('n-child');
    expectNear(childUndone.x, childBefore.x, 'undo x');
    expectNear(childUndone.y, childBefore.y, 'undo y');
  });

  test('dragging a child into a regular nested Frame reparents with local coordinates and undoes', async ({ page }) => {
    test.setTimeout(120_000);
    const editor = new EditorPage(page);
    await seed(page, editor);
    await page.evaluate(() => (window as any).__e2e.select(['rect']));
    await page.waitForTimeout(400);

    const innerBox = await editor.nodeBox('inner');
    const scale = innerBox.width / 320;
    const rectBefore = await editor.nodeBox('rect');
    // Drop so the rectangle's top-left lands 45,40 inside the inner Frame.
    const target = { x: innerBox.x + 45 * scale, y: innerBox.y + 40 * scale };
    const drag = await dragBodyBy(editor, 'rect', { x: target.x - rectBefore.x, y: target.y - rectBefore.y });

    expect(await parentOf(page, 'rect')).toBe('inner');
    const rectAfter = await editor.nodeBox('rect');
    const innerAfter = await editor.nodeBox('inner');
    expectNear(rectAfter.x, target.x, 'world x', 8);
    expectNear(rectAfter.y, target.y, 'world y', 8);
    expectNear(rectAfter.x, drag.release.x, 'commit x == release x');
    expectNear(rectAfter.y, drag.release.y, 'commit y == release y');
    const styles = await stylesOf(page, 'rect');
    expectNear(parseFloat(styles.left), (rectAfter.x - innerAfter.x) / scale, 'inner-local left', 1.5);
    expectNear(parseFloat(styles.top), (rectAfter.y - innerAfter.y) / scale, 'inner-local top', 1.5);

    await undo(page);
    await page.waitForTimeout(800);
    expect(await parentOf(page, 'rect')).toBe('outer');
    const rectUndone = await editor.nodeBox('rect');
    expectNear(rectUndone.x, rectBefore.x, 'undo x');
    expectNear(rectUndone.y, rectBefore.y, 'undo y');
  });

  for (const op of ['copy', 'cut'] as const) {
    test(`${op}, select a regular nested Frame, paste lands inside it at the clip's local position in one undo`, async ({ page }) => {
      test.setTimeout(120_000);
      const editor = new EditorPage(page);
      await seed(page, editor);
      const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

      await page.evaluate(() => (window as any).__e2e.select(['rect']));
      await page.waitForTimeout(300);
      await page.keyboard.press(`${mod}+${op === 'copy' ? 'c' : 'x'}`);
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => Object.keys((window as any).__e2e.nodesSnapshot()));
      if (op === 'cut') expect(before).not.toContain('rect');

      await page.evaluate(() => (window as any).__e2e.select(['inner']));
      await page.waitForTimeout(300);
      await page.keyboard.press(`${mod}+v`);
      await page.waitForTimeout(800);

      const snap = await page.evaluate(() => (window as any).__e2e.nodesSnapshot());
      const added = Object.keys(snap).filter((id) => !before.includes(id) && snap[id].styles?.background === '#ef4444');
      expect(added.length, 'one pasted rectangle').toBe(1);
      const pasted = added[0];
      expect(snap[pasted].parentId).toBe('inner');
      expect(parseFloat(snap[pasted].styles.left)).toBeCloseTo(48, 0);
      expect(parseFloat(snap[pasted].styles.top)).toBeCloseTo(128, 0);
      if (op === 'copy') expect(snap.rect?.parentId).toBe('outer');
      const innerBox = await editor.nodeBox('inner');
      const pastedBox = await editor.nodeBox(pasted);
      const scale = innerBox.width / 320;
      expectNear((pastedBox.x - innerBox.x) / scale, 48, 'rendered local x', 1.5);

      await undo(page);
      await page.waitForTimeout(800);
      const undone = await page.evaluate(() => (window as any).__e2e.nodesSnapshot());
      expect(undone[pasted]).toBeUndefined();
      expect(undone.inner.children).toEqual(['n-child']);
    });
  }
});
