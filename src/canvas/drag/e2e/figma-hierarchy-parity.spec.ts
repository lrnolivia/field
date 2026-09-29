import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

type Box = { x: number; y: number; width: number; height: number };

async function nodeParent(page: Page, id: string): Promise<string | null | undefined> {
  return page.evaluate((nodeId) => {
    const node = (window as any).__e2e.nodesSnapshot?.()?.[nodeId];
    return node ? (node.parentId ?? null) : undefined;
  }, id);
}

async function snapshotIds(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys((window as any).__e2e.nodesSnapshot?.() ?? {}));
}

async function drawFrame(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  holdSpace: boolean,
): Promise<void> {
  await page.keyboard.press('f');
  if (holdSpace) await page.keyboard.down('Space');
  try {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  } finally {
    if (holdSpace) await page.keyboard.up('Space');
  }
  await page.waitForTimeout(250);
}

function creatorRectInside(box: Box) {
  // Deliberately away from abs-child (which begins near Hero's top-left).
  const start = { x: box.x + box.width * 0.58, y: box.y + box.height * 0.58 };
  const end = { x: start.x + 76, y: start.y + 54 };
  return { start, end };
}

async function dragAbsoluteChild(
  page: Page,
  editor: EditorPage,
  holdSpaceDuringDrag: boolean,
): Promise<void> {
  await editor.select(['abs-child']);
  const child = await editor.nodeBox('abs-child');
  const root = await editor.nodeBox('root');
  const surface = await page.locator('[data-canvas-input-surface]').boundingBox();
  if (!surface) throw new Error('canvas input surface has no bounding box');

  const from = { x: child.x + child.width / 2, y: child.y + child.height / 2 };

  // Drive the center far enough beyond the PAGE ROOT that the entire child is
  // outside Hero and no sibling can accidentally become the intended drop
  // parent. Prefer the right side; use the left if the fitted page is too close
  // to the workspace edge.
  const right = {
    x: root.x + root.width + child.width + 48,
    y: Math.max(surface.y + 24, Math.min(surface.y + surface.height - 24, from.y)),
  };
  const left = {
    x: root.x - child.width - 48,
    y: right.y,
  };
  const to = right.x < surface.x + surface.width - 12 ? right : left;
  if (to.x <= surface.x + 8 || to.x >= surface.x + surface.width - 8) {
    throw new Error('no safe outside-root drag target exists in the canvas surface');
  }

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  try {
    // Engage the actual drag before Space is pressed. Figma's documented
    // keep-parent gesture is contextual DURING an active move.
    await page.mouse.move(from.x + 14, from.y, { steps: 4 });
    await page.waitForTimeout(50);
    if (holdSpaceDuringDrag) await page.keyboard.down('Space');
    await page.mouse.move(to.x, to.y, { steps: 24 });

    // AbsoluteInFrame has entry/exit grace designed for real pointer streams.
    // Hold the pointer outside for long enough that a NORMAL drag unquestionably
    // takes the exit path; the Space case must suppress that same path.
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(to.x + (i % 2), to.y + ((i % 3) - 1), { steps: 1 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
    }
    await page.mouse.up();
  } finally {
    if (holdSpaceDuringDrag) await page.keyboard.up('Space');
  }
  await page.waitForTimeout(300);
}

test.describe('Figma hierarchy parity — Space parenting overrides', () => {
  test('Space prevents a newly drawn frame from adopting the frame under it', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(250);

    let hero = await editor.nodeBox('hero');
    let rect = creatorRectInside(hero);
    let before = new Set(await snapshotIds(page));
    await drawFrame(page, rect.start, rect.end, false);

    const normalAdded = (await snapshotIds(page)).filter(id => !before.has(id));
    expect(normalAdded).toHaveLength(1);
    await expect.poll(() => nodeParent(page, normalAdded[0])).toBe('hero');

    // Fresh fixture: same geometry, this time Space is held before pointerdown.
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(250);

    hero = await editor.nodeBox('hero');
    rect = creatorRectInside(hero);
    before = new Set(await snapshotIds(page));
    await drawFrame(page, rect.start, rect.end, true);

    const spaceAdded = (await snapshotIds(page)).filter(id => !before.has(id));
    expect(spaceAdded).toHaveLength(1);
    await expect.poll(() => nodeParent(page, spaceAdded[0])).toBeNull();
  });

  test('Space held during drag-out keeps an absolute child in its current parent', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(250);

    // Baseline: the same move without Space really does cross the parent
    // boundary and reparent upward.
    await dragAbsoluteChild(page, editor, false);
    await expect.poll(async () => (await nodeParent(page, 'abs-child')) !== 'hero', { timeout: 10_000 }).toBe(true);

    // Fresh fixture + same move, but Space is pressed after drag engagement.
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();
    await page.waitForTimeout(250);

    await dragAbsoluteChild(page, editor, true);
    await expect.poll(() => nodeParent(page, 'abs-child'), { timeout: 10_000 }).toBe('hero');

    // It is not merely a snap-back/no-op: the child visually remains outside
    // Hero while its source hierarchy stays parented to Hero.
    const child = await editor.nodeBox('abs-child');
    const hero = await editor.nodeBox('hero');
    const fullyOutsideHorizontally =
      child.x >= hero.x + hero.width || child.x + child.width <= hero.x;
    expect(fullyOutsideHorizontally).toBe(true);
  });
});
