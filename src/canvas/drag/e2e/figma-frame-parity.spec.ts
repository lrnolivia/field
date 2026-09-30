import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

async function allNodeIds(editor: EditorPage): Promise<string[]> {
  return editor.sandbox().locator('[data-id]').evaluateAll((els) =>
    [...new Set(els.map((el) => el.getAttribute('data-id')).filter(Boolean) as string[])],
  );
}

async function clickCreateFrame(
  page: import('@playwright/test').Page,
  editor: EditorPage,
  point: { x: number; y: number },
  holdSpace = false,
): Promise<string> {
  const before = new Set(await allNodeIds(editor));
  await page.keyboard.press('f');
  if (holdSpace) await page.keyboard.down('Space');
  try {
    await page.mouse.click(point.x, point.y);
  } finally {
    if (holdSpace) await page.keyboard.up('Space');
  }
  await page.waitForTimeout(500);

  const added = (await allNodeIds(editor)).filter((id) => !before.has(id) && id.startsWith('frame-'));
  expect(added).toHaveLength(1);
  return added[0];
}

async function parentId(editor: EditorPage, id: string): Promise<string | null> {
  return editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) =>
    el.parentElement?.getAttribute('data-id') ?? null,
  );
}

test.describe('Figma frame parity — click creation and nesting', () => {
  test('clicking with Frame inside a frame creates a nested fixed 100×100 frame', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const hero = await editor.nodeBox('hero');
    const point = { x: hero.x + hero.width * 0.62, y: hero.y + 90 };
    const id = await clickCreateFrame(page, editor, point);

    expect(await parentId(editor, id)).toBe('hero');
    const size = await editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.width, height: cs.height };
    });
    expect(size).toEqual({ width: '100px', height: '100px' });
  });

  test('Space + Frame click inside a frame creates the default frame outside that parent', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const hero = await editor.nodeBox('hero');
    const point = { x: hero.x + hero.width * 0.62, y: hero.y + 90 };
    const id = await clickCreateFrame(page, editor, point, true);

    expect(await parentId(editor, id)).not.toBe('hero');
    const size = await editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.width, height: cs.height };
    });
    expect(size).toEqual({ width: '100px', height: '100px' });
  });
});
