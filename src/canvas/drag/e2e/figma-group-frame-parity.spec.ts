import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

type Box = { x: number; y: number; width: number; height: number };

function expectBoxClose(received: Box, expected: Box, tolerance = 3) {
  expect(Math.abs(received.x - expected.x)).toBeLessThan(tolerance);
  expect(Math.abs(received.y - expected.y)).toBeLessThan(tolerance);
  expect(Math.abs(received.width - expected.width)).toBeLessThan(tolerance);
  expect(Math.abs(received.height - expected.height)).toBeLessThan(tolerance);
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

async function selection(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__e2e.selection?.() ?? []);
}

async function parentId(editor: EditorPage, id: string): Promise<string | null> {
  return editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) =>
    el.parentElement?.getAttribute('data-id') ?? null,
  );
}

test.describe('Figma hierarchy parity — Groups vs Frames', () => {
  test('first click selects Group, double-click drills to child, and child motion refits Group bounds', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('GROUP_FRAME_SEMANTICS');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const aBefore = await editor.nodeBox('g-a');
    const click = { x: aBefore.x + aBefore.width / 2, y: aBefore.y + aBefore.height / 2 };

    await page.mouse.click(click.x, click.y);
    await expect.poll(() => selection(page)).toEqual(['native-group']);

    await page.mouse.dblclick(click.x, click.y);
    await expect.poll(() => selection(page)).toEqual(['g-a']);

    await editor.waitForStableGeometry('g-a');
    const bBefore = await editor.nodeBox('g-b');
    const currentA = await editor.nodeBox('g-a');
    const target = { x: currentA.x + currentA.width / 2 + 80, y: currentA.y + currentA.height / 2 + 20 };
    await editor.dragNodeFromTo('g-a', target, { steps: 12 });
    await page.waitForTimeout(350);

    const aAfter = await editor.nodeBox('g-a');
    const bAfter = await editor.nodeBox('g-b');
    const groupAfter = await editor.nodeBox('native-group');

    // The untouched child must not jump when the wrapper rebases.
    expectBoxClose(bAfter, bBefore);
    // The Group itself is exactly the current union of its children.
    expectBoxClose(groupAfter, union(aAfter, bAfter));
  });

  test('moving a Frame child does not resize the Frame', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('GROUP_FRAME_SEMANTICS');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const child = await editor.nodeBox('f-a');
    const childCenter = { x: child.x + child.width / 2, y: child.y + child.height / 2 };

    await page.mouse.click(childCenter.x, childCenter.y);
    await expect.poll(() => selection(page)).toEqual(['fixed-frame']);
    await page.mouse.dblclick(childCenter.x, childCenter.y);
    await expect.poll(() => selection(page)).toEqual(['f-a']);

    await editor.waitForStableGeometry('f-a');
    const frameBefore = await editor.nodeBox('fixed-frame');
    const currentChild = await editor.nodeBox('f-a');
    await editor.dragNodeFromTo('f-a', { x: currentChild.x + currentChild.width / 2 + 80, y: currentChild.y + currentChild.height / 2 + 60 }, { steps: 12 });
    await page.waitForTimeout(300);

    expect(await parentId(editor, 'f-a')).toBe('fixed-frame');
    expectBoxClose(await editor.nodeBox('fixed-frame'), frameBefore);
  });

  test('Group/Ungroup preserves world geometry and uses the standard primary-G chords', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('GROUP_FRAME_SEMANTICS');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const aBefore = await editor.nodeBox('loose-a');
    const bBefore = await editor.nodeBox('loose-b');

    await editor.select(['loose-a', 'loose-b'], 'desktop');
    await page.keyboard.press('Control+g');
    await page.waitForTimeout(400);

    const grouped = await selection(page);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatch(/^group-/);
    const groupId = grouped[0];
    await expect(editor.sandbox().locator(`[data-id="${groupId}"][data-field-group="true"]`).first()).toHaveCount(1);
    expect(await parentId(editor, 'loose-a')).toBe(groupId);
    expect(await parentId(editor, 'loose-b')).toBe(groupId);
    expectBoxClose(await editor.nodeBox('loose-a'), aBefore);
    expectBoxClose(await editor.nodeBox('loose-b'), bBefore);

    await page.keyboard.press('Control+Shift+g');
    await page.waitForTimeout(400);

    expect(new Set(await selection(page))).toEqual(new Set(['loose-a', 'loose-b']));
    await expect(editor.sandbox().locator(`[data-id="${groupId}"]`)).toHaveCount(0);
    expectBoxClose(await editor.nodeBox('loose-a'), aBefore);
    expectBoxClose(await editor.nodeBox('loose-b'), bBefore);
  });

  test('Ctrl+Alt+G frames the selection and preserves child world geometry', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('GROUP_FRAME_SEMANTICS');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const aBefore = await editor.nodeBox('loose-a');
    const bBefore = await editor.nodeBox('loose-b');

    await editor.select(['loose-a', 'loose-b'], 'desktop');
    await page.keyboard.press('Control+Alt+g');
    await page.waitForTimeout(450);

    const framed = await selection(page);
    expect(framed).toHaveLength(1);
    expect(framed[0]).toMatch(/^frame-/);
    const frameId = framed[0];
    expect(await parentId(editor, 'loose-a')).toBe(frameId);
    expect(await parentId(editor, 'loose-b')).toBe(frameId);
    expectBoxClose(await editor.nodeBox('loose-a'), aBefore);
    expectBoxClose(await editor.nodeBox('loose-b'), bBefore);

    const wrapper = await editor.nodeBox(frameId);
    expectBoxClose(wrapper, union(aBefore, bBefore));
  });
});
