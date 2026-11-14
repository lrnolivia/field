import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

const image = {
  name: 'portrait.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="360"><rect width="180" height="360" fill="rebeccapurple"/></svg>'),
};

async function openMedia(page: Page, surface: 'sidebar' | 'toolbar') {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.locator('[data-tutorial="media-button"]').click();
  await page.locator('[data-media-browser-commandbar] input[type=file]').setInputFiles(image);
  await expect(page.locator('[data-media-grid] img')).toHaveCount(1);
  if (surface === 'toolbar') {
    await page.locator('[data-toolbar-tool="media"]').click();
    await page.locator('[data-media-launcher-featured]').click();
  }
  const tile = surface === 'toolbar'
    ? page.locator('[data-media-toolbar-popover] [data-media-grid] img')
    : page.locator('[data-media-grid] img');
  await expect.poll(() => tile.evaluate((element: HTMLImageElement) => element.naturalHeight)).toBe(360);
  return { editor, tile };
}

for (const surface of ['sidebar', 'toolbar'] as const) {
  test(`drag from ${surface} places one decoded image at the original proportions`, async ({ page }) => {
    const { editor, tile } = await openMedia(page, surface);
    const source = await tile.getAttribute('src');
    const from = (await tile.boundingBox())!;
    const canvas = (await page.locator('[data-canvas-viewport]').boundingBox())!;
    const point = { x: canvas.x + canvas.width * 0.48, y: canvas.y + 190 };
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(point.x, point.y, { steps: 24 });
    await page.mouse.up();
    const placed = editor.sandbox().locator(`[data-content-root] img[data-id][src="${source}"]:visible`);
    await expect(placed).toHaveCount(1);
    await expect.poll(() => placed.evaluate((element: HTMLImageElement) => element.naturalHeight)).toBe(360);
    const box = (await placed.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(0.5, 2);
  });
}

test('click from toolbar keeps the source proportions and the Image Inspector aligns its controls', async ({ page }) => {
  const { editor, tile } = await openMedia(page, 'toolbar');
  const source = await tile.getAttribute('src');
  await tile.locator('..').click();
  const placed = editor.sandbox().locator(`[data-content-root] img[data-id][src="${source}"]:visible`);
  await expect(placed).toHaveCount(1);
  const box = (await placed.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(0.5, 2);
  const section = page.locator('[data-inspector-section="image"]');
  const rows = section.locator('[data-tool-row-value]');
  await expect(rows).toHaveCount(4);
  const resize = await page.getByRole('button', { name: 'Resize properties pane' }).boundingBox();
  for (const inspectorDelta of [0, 100]) {
    if (inspectorDelta && resize) {
      await page.mouse.move(resize.x + resize.width / 2, resize.y + 60);
      await page.mouse.down();
      await page.mouse.move(resize.x + resize.width / 2 + inspectorDelta, resize.y + 60, { steps: 10 });
      await page.mouse.up();
    }
    const edges = await rows.evaluateAll((elements) => elements.map((element) => {
      const { left, right } = element.getBoundingClientRect();
      return [left, right];
    }));
    for (const edge of edges) expect(edge).toEqual(edges[0]);
    await expect(page.getByRole('button', { name: 'Image position', exact: true })).toBeEnabled();
  }
});

test('cancelling a drag from the Media popover places no image', async ({ page }) => {
  const { editor, tile } = await openMedia(page, 'toolbar');
  const source = await tile.getAttribute('src');
  const box = (await tile.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 4 });
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
  await page.mouse.move(600, 260, { steps: 12 });
  await page.mouse.up();
  await expect(editor.sandbox().locator(`[data-content-root] img[data-id][src="${source}"]`)).toHaveCount(0);
});
