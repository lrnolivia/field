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

  const previewButton = page.locator('[data-tutorial="header-preview-button"]');
  await expect(previewButton).toHaveCount(1);
  // The editor chrome can still be completing its entrance transform in E2E.
  // Invoke the real button handler without coupling Preview parity to whether
  // that header happens to be inside the current viewport on this frame.
  await previewButton.evaluate((el) => (el as HTMLButtonElement).click());

  const previewIframe = page.locator('iframe[src*="5175"]');
  await expect(previewIframe).toHaveCount(1, { timeout: 10_000 });
  const previewText = page.frameLocator('iframe[src*="5175"]').locator('[data-id="headline"]');
  try {
    await expect(previewText).toBeVisible({ timeout: 30_000 });
  } catch (error) {
    const diagnostic = await previewIframe.evaluate((iframe: HTMLIFrameElement) => ({
      src: iframe.src,
      rect: iframe.getBoundingClientRect().toJSON(),
    })).catch(() => null);
    const frame = page.frames().find((candidate) => candidate.url().includes('5175'));
    const frameState = frame ? await frame.evaluate(() => ({
      href: location.href,
      text: document.body?.innerText?.slice(0, 2000) ?? '',
      html: document.body?.innerHTML?.slice(0, 4000) ?? '',
    })).catch(() => null) : null;
    console.error('PREVIEW_PARITY_DIAGNOSTIC', JSON.stringify({ diagnostic, frameState }, null, 2));
    throw error;
  }
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
  await editor.waitForStableGeometry('root');
  const ellipse = page.locator('[data-layer-id="desktop:ellipse"]');
  const headline = page.locator('[data-layer-id="desktop:headline"]');
  await expect(ellipse).toBeVisible();
  await expect(headline).toBeVisible();
  await ellipse.scrollIntoViewIfNeeded();
  const from = (await ellipse.boundingBox())!;
  const to = (await headline.boundingBox())!;
  await page.mouse.move(from.x + 30, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 30, to.y + 3, { steps: 8 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await expect.poll(async () => {
    const code = await editor.getPageCode();
    return code.indexOf('data-id="ellipse"') > code.indexOf('data-id="headline"');
  }).toBe(true);
  const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rows.indexOf('desktop:ellipse')).toBeLessThan(rows.indexOf('desktop:headline'));
});

test('a flex child dragged to the top row becomes the first flow child', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('REORDERED_FLEX_COLUMN');
  await editor.waitForStableGeometry('root');
  const hero = page.locator('[data-layer-id="desktop:hero"]');
  const how = page.locator('[data-layer-id="desktop:how"]');
  const rowsBefore = await page.locator('[data-layers-scroll] [data-layer-id]')
    .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
  expect(rowsBefore.indexOf('desktop:hero')).toBeLessThan(rowsBefore.indexOf('desktop:how'));
  const from = (await how.boundingBox())!;
  const to = (await hero.boundingBox())!;
  await page.mouse.move(from.x + 30, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 30, to.y + 3, { steps: 8 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await expect.poll(async () => {
    const rows = await page.locator('[data-layers-scroll] [data-layer-id]')
      .evaluateAll(elements => elements.map(el => el.getAttribute('data-layer-id')));
    return rows.indexOf('desktop:how') < rows.indexOf('desktop:hero');
  }).toBe(true);
  await expect.poll(async () => editor.node('how').evaluate(el => getComputedStyle(el).order)).toBe('0');
  await expect.poll(() => editor.getRootChildrenVisualOrder()).toEqual(['how', 'hero', 'features']);
});

test('workspace panes collapse independently, persist, and shift the Canvas when enabled', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('field:prefs:canvasFollowsPanels', 'true'));
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('LAYER_PREVIEW_PARITY');
  await editor.waitForStableGeometry('root');
  const viewport = editor.sandbox().locator('[data-viewport]').first();
  const left = page.locator('[data-workspace-collapse][data-side="left"]:visible');
  const right = page.locator('[data-workspace-collapse][data-side="right"]:visible');
  const leftPane = page.locator('[data-editor-panel="left-primary"]');
  const inspector = page.locator('[data-workspace-right-header]');
  await expect(inspector).toBeVisible();
  const initialX = (await viewport.boundingBox())!.x;
  const leftWidth = (await leftPane.boundingBox())!.width;
  const rightWidth = (await inspector.boundingBox())!.width;
  await left.click();
  await expect(leftPane).toHaveAttribute('data-visible', 'false');
  await expect(leftPane).toHaveAttribute('inert', '');
  await expect(page.locator('[data-left-menu-rail]')).toBeVisible();
  await expect(page.locator('[data-properties-panel]')).toBeVisible();
  await expect.poll(async () => (await viewport.boundingBox())!.x - initialX).toBeCloseTo(-leftWidth / 2, 0);

  await editor.waitForStableGeometry('root');
  const leftCollapsedX = (await viewport.boundingBox())!.x;
  await right.click();
  await expect(page.locator('[data-properties-panel]')).toHaveCount(0);
  const compactInspector = page.locator('[data-workspace-right-toggle]');
  await expect(compactInspector).toBeVisible();
  const collapsedReserve = await page.evaluate(() =>
    Number(JSON.parse(localStorage.getItem('field:prefs:rightCollapsedWidth') ?? '60')),
  );
  await expect.poll(async () => (await viewport.boundingBox())!.x - leftCollapsedX).toBeCloseTo((rightWidth - collapsedReserve) / 2, 0);

  await page.reload();
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  await expect(right).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-tutorial="layers-button"]').click();
  await expect(leftPane).toHaveAttribute('data-visible', 'true');
  await expect(right).toHaveAttribute('aria-pressed', 'true');
});
