import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

const TEXT_STYLE_KEYS = [
  'position', 'left', 'top', 'width', 'height', 'transform',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
  'letterSpacing', 'textAlign',
] as const;

const LAYOUT_STYLE_KEYS = [
  'position', 'left', 'top', 'width', 'height',
  'display', 'flexDirection', 'alignItems', 'justifyContent',
  'gap', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'overflow', 'backgroundColor', 'color',
] as const;

const SIZING_STYLE_KEYS = [
  'width', 'height', 'flexGrow', 'flexShrink', 'flexBasis',
] as const;

test('Layers are front-to-back and Canvas computed styles match Preview', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LAYER_PREVIEW_PARITY');

  const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rows.indexOf('desktop:headline')).toBeGreaterThan(-1);
  expect(rows.indexOf('desktop:headline')).toBeLessThan(rows.indexOf('desktop:ellipse'));

  const canvasText = editor.node('headline');
  await expect(canvasText).toBeVisible();
  const canvasStyles = await canvasText.evaluate((el, keys) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(keys.map(key => [key, cs[key]]));
  }, TEXT_STYLE_KEYS);

  const canvasLayout = editor.node('layout-frame');
  const canvasFixed = editor.node('fixed-box');
  const canvasHug = editor.node('hug-box');
  const canvasFill = editor.node('fill-box');
  for (const node of [canvasLayout, canvasFixed, canvasHug, canvasFill]) {
    await expect(node).toBeVisible();
  }
  const canvasLayoutStyles = await canvasLayout.evaluate((el, keys) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(keys.map(key => [key, cs[key]]));
  }, LAYOUT_STYLE_KEYS);
  const canvasSizingStyles = await Promise.all(
    [canvasFixed, canvasHug, canvasFill].map(node => node.evaluate((el, keys) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(keys.map(key => [key, cs[key]]));
    }, SIZING_STYLE_KEYS)),
  );

  await page.locator('[data-tutorial="header-preview-button"]').click({ force: true });
  const previewText = page.frameLocator('iframe[src*="5175"]').locator('[data-id="headline"]');
  await expect(previewText).toBeVisible({ timeout: 30_000 });
  const previewStyles = await previewText.evaluate((el, keys) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(keys.map(key => [key, cs[key]]));
  }, TEXT_STYLE_KEYS);

  const previewFrame = page.frameLocator('iframe[src*="5175"]');
  const previewLayout = previewFrame.locator('[data-id="layout-frame"]');
  const previewFixed = previewFrame.locator('[data-id="fixed-box"]');
  const previewHug = previewFrame.locator('[data-id="hug-box"]');
  const previewFill = previewFrame.locator('[data-id="fill-box"]');
  for (const node of [previewLayout, previewFixed, previewHug, previewFill]) {
    await expect(node).toBeVisible();
  }
  const previewLayoutStyles = await previewLayout.evaluate((el, keys) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(keys.map(key => [key, cs[key]]));
  }, LAYOUT_STYLE_KEYS);
  const previewSizingStyles = await Promise.all(
    [previewFixed, previewHug, previewFill].map(node => node.evaluate((el, keys) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(keys.map(key => [key, cs[key]]));
    }, SIZING_STYLE_KEYS)),
  );

  expect(previewStyles).toEqual(canvasStyles);
  expect(previewLayoutStyles).toEqual(canvasLayoutStyles);
  expect(previewSizingStyles).toEqual(canvasSizingStyles);
  expect(canvasLayoutStyles).toMatchObject({
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '16px',
    paddingTop: '20px',
    paddingRight: '28px',
    paddingBottom: '20px',
    paddingLeft: '28px',
    overflow: 'hidden',
    backgroundColor: 'rgb(255, 255, 255)',
    color: 'rgb(17, 17, 17)',
  });
  expect(canvasSizingStyles[0]).toMatchObject({ width: '80px', height: '40px', flexGrow: '0', flexShrink: '0' });
  expect(canvasSizingStyles[1]).toMatchObject({ height: '40px', flexGrow: '0', flexShrink: '0' });
  expect(canvasSizingStyles[2]).toMatchObject({ height: '40px', flexGrow: '1', flexShrink: '0', flexBasis: '0px' });
  await expect(previewText).toHaveText('Canvas Preview');
});

test('canvas roots appear above viewport rows in the layer stack', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('FLEX_WITH_ABSOLUTE_HERO');
  const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rows.indexOf('desktop:hdr')).toBeGreaterThanOrEqual(0);
  expect(rows.indexOf('desktop:hdr')).toBeLessThan(rows.indexOf('__vp_desktop'));
});

test('dragging a lower layer above another writes the frontmost source slot', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LAYER_PREVIEW_PARITY');
  const ellipse = page.locator('[data-layer-id="desktop:ellipse"]');
  const headline = page.locator('[data-layer-id="desktop:headline"]');
  await expect(ellipse).toBeVisible();
  await expect(headline).toBeVisible();
  const from = (await ellipse.boundingBox())!;
  const to = (await headline.boundingBox())!;
  await page.mouse.move(from.x + 70, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 70, to.y + 3, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => {
    const code = await editor.getPageCode();
    return code.indexOf('data-id="ellipse"') > code.indexOf('data-id="headline"');
  }).toBe(true);
  const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rows.indexOf('desktop:ellipse')).toBeLessThan(rows.indexOf('desktop:headline'));
});

test('a flex child dragged to the top row receives the frontmost CSS order', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('REORDERED_FLEX_COLUMN');
  const hero = page.locator('[data-layer-id="desktop:hero"]');
  const how = page.locator('[data-layer-id="desktop:how"]');
  const rowsBefore = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rowsBefore.indexOf('desktop:how')).toBeLessThan(rowsBefore.indexOf('desktop:hero'));
  const from = (await hero.boundingBox())!;
  const to = (await how.boundingBox())!;
  await page.mouse.move(from.x + 70, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 70, to.y + 3, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => {
    const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
      .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
    return rows.indexOf('desktop:hero') < rows.indexOf('desktop:how');
  }).toBe(true);
  await expect.poll(async () => editor.node('hero').evaluate(el => getComputedStyle(el).order)).toBe('2');
});

test('workspace panes collapse independently, persist, and rail clicks reopen content', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LAYER_PREVIEW_PARITY');
  const viewport = editor.sandbox().locator('[data-viewport]').first();
  const initialX = (await viewport.boundingBox())!.x;
  await page.getByRole('button', { name: 'Collapse left pane' }).click();
  await expect(page.locator('[data-editor-panel="left-primary"]')).toHaveCount(0);
  await expect(page.locator('[data-left-menu-rail]')).toBeVisible();
  await expect(page.locator('[data-properties-panel]')).toBeVisible();
  await expect.poll(async () => (await viewport.boundingBox())!.x - initialX).toBeCloseTo(-128, 0);

  const leftCollapsedX = (await viewport.boundingBox())!.x;
  await page.getByRole('button', { name: 'Collapse properties pane' }).click();
  await expect(page.locator('[data-properties-panel]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Expand properties pane' })).toBeVisible();
  await expect.poll(async () => (await viewport.boundingBox())!.x - leftCollapsedX).toBeCloseTo(130, 0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand left pane' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expand properties pane' })).toBeVisible();
  await page.locator('[data-tutorial="layers-button"]').click();
  await expect(page.locator('[data-editor-panel="left-primary"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expand properties pane' })).toBeVisible();
});
