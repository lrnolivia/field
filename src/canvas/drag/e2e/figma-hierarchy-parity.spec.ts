import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

async function parentDataId(editor: EditorPage, id: string): Promise<string | null> {
  return editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) =>
    el.parentElement?.getAttribute('data-id') ?? null,
  );
}

async function allNodeIds(editor: EditorPage): Promise<string[]> {
  return editor.sandbox().locator('[data-id]').evaluateAll((els) =>
    [...new Set(els.map((el) => el.getAttribute('data-id')).filter(Boolean) as string[])],
  );
}

async function drawFrame(
  page: Page,
  editor: EditorPage,
  holdSpace: boolean,
): Promise<string> {
  const hero = await editor.nodeBox('hero');
  const before = new Set(await allNodeIds(editor));

  // Use an empty patch of Hero, away from abs-child.
  const from = { x: hero.x + hero.width * 0.42, y: hero.y + 90 };
  const to = { x: from.x + 120, y: from.y + 90 };

  await page.keyboard.press('f');
  if (holdSpace) await page.keyboard.down('Space');
  try {
    await editor.dragFromTo(from, to, { steps: 10 });
  } finally {
    if (holdSpace) await page.keyboard.up('Space');
  }
  await page.waitForTimeout(450);

  const added = (await allNodeIds(editor)).filter((id) => !before.has(id));
  const frames: string[] = [];
  for (const id of added) {
    const name = await editor.sandbox().locator(`[data-id="${id}"]`).first().getAttribute('data-name');
    if (name === 'Frame') frames.push(id);
  }
  expect(frames, `expected one created Frame; new ids were ${added.join(', ')}`).toHaveLength(1);
  return frames[0];
}

async function dragWithSpaceAfterStart(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();

  // Cross DragCoordinator's threshold as an ordinary object drag first.
  await page.mouse.move(from.x + 10, from.y + 6, { steps: 2 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

  // Figma's "keep current parent" override is a drag modifier, not a request
  // to start Space-pan. Press it after the object drag is already active.
  await page.keyboard.down('Space');
  try {
    for (let i = 1; i <= 14; i += 1) {
      const t = i / 14;
      await page.mouse.move(
        from.x + (to.x - from.x) * t,
        from.y + (to.y - from.y) * t,
        { steps: 1 },
      );
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    }
    await page.mouse.up();
  } finally {
    await page.keyboard.up('Space');
  }
  await page.waitForTimeout(300);
}

test.describe('Figma hierarchy parity — Space parenting overrides', () => {
  test('a new frame drawn over a frame adopts that frame by default', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const createdId = await drawFrame(page, editor, false);
    expect(await parentDataId(editor, createdId)).toBe('hero');
  });

  test('holding Space while adding a frame bypasses automatic parenting', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    const createdId = await drawFrame(page, editor, true);
    expect(await parentDataId(editor, createdId)).not.toBe('hero');
  });

  test('holding Space while dragging an absolute child out keeps its current parent', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(300);

    await editor.select(['abs-child'], 'desktop');
    const before = await editor.nodeBox('abs-child');
    const features = await editor.nodeBox('features');
    const from = {
      x: before.x + before.width / 2,
      y: before.y + before.height / 2,
    };
    const to = {
      x: features.x + features.width * 0.72,
      y: features.y + features.height * 0.55,
    };

    await dragWithSpaceAfterStart(page, from, to);

    expect(await parentDataId(editor, 'abs-child')).toBe('hero');
    const after = await editor.nodeBox('abs-child');
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(100);
  });
});
