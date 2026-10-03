import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
async function settleSurface(page: Page) {
  const surface = page.locator('[data-portrait-surface], [data-desktop-quick-tools]').first();
  if (!await surface.count()) return;
  await expect.poll(() => surface.evaluate(el => {
    const style = getComputedStyle(el);
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
    const blur = parseFloat(style.filter.match(/blur\(([^p]+)px\)/)?.[1] || '0');
    return Number(style.opacity) >= .999 && Math.abs(matrix.a - 1) < .001 && Math.abs(matrix.d - 1) < .001 && Math.abs(matrix.f) < .05 && blur < .05;
  })).toBe(true);
}

test('portrait owns purpose-built tools, browse and focused editing without changing desktop preferences', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked'));
    localStorage.setItem('field:prefs:dockedInspectorOpen:v1', 'true');
  });
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await expect(page.locator('[data-portrait-workspace]')).toBeAttached();
  await expect(page.getByRole('button', { name: 'Open tools', exact: true })).toBeVisible();
  await expect(page.locator('[data-workspace-right-body]')).toHaveCount(0);
  await expect(page.locator('[data-left-menu-rail]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open tools', exact: true }).tap();
  const tools = page.locator('[data-portrait-surface="tools"]');
  await expect(tools).toBeVisible();
  await expect(tools.locator('.field-quick-tile')).toHaveCount(4);
  await tools.getByRole('button', { name: 'Hand', exact: true }).tap();
  await expect(tools).toHaveCount(0);
  await page.getByRole('button', { name: 'Open tools', exact: true }).tap();
  await tools.getByRole('button', { name: 'Move', exact: true }).tap();
  await page.getByRole('button', { name: 'Open browse', exact: true }).tap();
  await page.getByRole('button', { name: 'Pages Choose a page or manage routes', exact: false }).tap();
  await expect(page.locator('[data-portrait-pages]')).toBeVisible();
  await settleSurface(page);
  await page.screenshot({ path: testInfo.outputPath('portrait-pages-390.png') });
  await page.getByRole('button', { name: 'Close Pages', exact: true }).tap();
  // Browser Back dismisses the workspace rather than navigating away from the project.
  await page.getByRole('button', { name: 'Open tools', exact: true }).tap();
  await page.goBack();
  await expect(page.locator('[data-portrait-surface]')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: 'Open tools', exact: true }).tap();
  const metrics = await tools.evaluate(el => ({ width: el.getBoundingClientRect().width, overflow: el.scrollWidth > el.clientWidth }));
  expect(metrics.width).toBeLessThanOrEqual(320); expect(metrics.overflow).toBe(false);
  await settleSurface(page);
  await page.screenshot({ path: testInfo.outputPath('portrait-tools-320.png') });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-portrait-workspace]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('docked');
  await page.setViewportSize({ width:390, height:844 });
  await expect(page.locator('[data-portrait-surface="tools"]')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('field:prefs:dockedInspectorOpen:v1')!))).toBe(true);
});

test('a short object tap opens focused properties; real drag and second finger do not', async ({ page }, testInfo) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.waitForStableGeometry('hero');
  const beforeCode = await editor.getPageCode();
  const box = await editor.node('hero').boundingBox();
  expect(box).not.toBeNull();
  const point = { x: Math.max(70, Math.min(310, box!.x + box!.width / 2)), y: Math.max(100, Math.min(400, box!.y + box!.height / 2)) };
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.locator('[data-portrait-surface="inspect"]')).toBeVisible();
  expect(await editor.getPageCode()).toBe(beforeCode);
  await page.getByRole('button', { name: 'All properties', exact: true }).tap();
  await expect(page.getByRole('navigation', { name: 'All property categories' })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced', exact: true }).tap();
  await expect(page.locator('[data-portrait-inspector-task="advanced"]')).toBeVisible();
  await settleSurface(page);
  await page.screenshot({ path: testInfo.outputPath('portrait-inspector-390.png') });
  await page.setViewportSize({ width:844, height:390 });
  await page.setViewportSize({ width:390, height:844 });
  await expect(page.locator('[data-portrait-inspector-task="advanced"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close Properties', exact: true }).tap();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + 28, y: point.y + 18, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-portrait-surface="inspect"]')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }, { x: point.x + 30, y: point.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-portrait-surface="inspect"]')).toHaveCount(0);
});

test('Gallery portrait tasks keep source-backed ordering, removal and undo', async ({ page }, testInfo) => {
  const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#26798b"/><circle cx="95" cy="75" r="42" fill="#e7dbca"/><path d="M0 200L90 122L151 164L240 99L300 200" fill="#202632"/></svg>').toString('base64');
  const source = `/** @canvas { "viewports": [{"id":"desktop","width":1440}] } */
'use client';
export default function Page() { return <div data-id="root" data-name="Page" style={{ width:'1440px', minHeight:'900px', padding:'80px' }}>
  <div data-id="gallery" data-name="Gallery" role="region" aria-label="Test gallery" style={{ '--field-gallery-view':'grid', display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'24px', width:'800px' }}>
    <figure data-id="gallery-item-1" data-name="Gallery Item" style={{ '--field-gallery-item':'1', margin:'0px' }}><img data-id="gallery-image-1" data-name="Gallery Image" src="${image}" alt="First" style={{ width:'100%', height:'200px', objectFit:'cover' }}/></figure>
    <figure data-id="gallery-item-2" data-name="Gallery Item" style={{ '--field-gallery-item':'1', margin:'0px' }}><img data-id="gallery-image-2" data-name="Gallery Image" src="${image}" alt="Second" style={{ width:'100%', height:'200px', objectFit:'cover' }}/></figure>
  </div></div>; }`;
  await page.addInitScript(data => {
    localStorage.setItem('revyme-project-local', JSON.stringify({ format:'revyme-v1', files:{ 'app/page.client.tsx':data, 'app/page.tsx':"import PageClient from './page.client'; export default function Page(){return <PageClient/>;}" } }));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, source);
  await page.goto('/work/local');
  const editor = new EditorPage(page);
  await editor.waitForStableGeometry('gallery');
  const box = await editor.node('gallery').boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const inspector = page.locator('[data-portrait-surface="inspect"]');
  await expect(inspector.locator('[data-gallery-item-list]')).toBeVisible();
  await expect(inspector.getByRole('listitem')).toHaveCount(2);
  await settleSurface(page);
  await page.screenshot({ path: '/tmp/field-portrait-gallery-review.png' });
  const gallerySearch = inspector.getByRole('textbox', { name: /search gallery images/i });
  await gallerySearch.fill('Second');
  await expect(inspector.getByRole('listitem')).toHaveCount(1);
  expect(await editor.getPageCode()).toContain('alt="First"');
  await gallerySearch.fill('');
  await inspector.getByRole('listitem', { name: 'Gallery image 2: Second', exact: true }).tap();
  await inspector.getByRole('button', { name: 'Move selected image up', exact: true }).tap();
  await expect.poll(async () => { const code = await editor.getPageCode(); return code.indexOf('data-id="gallery-item-2"') < code.indexOf('data-id="gallery-item-1"'); }).toBe(true);
  await settleSurface(page);
  await page.screenshot({ path: testInfo.outputPath('portrait-gallery-order-390.png') });
  await inspector.getByRole('button', { name: 'Layout', exact: true }).tap();
  await expect(inspector.locator('[data-gallery-item-list]')).toHaveCount(0);
  await expect(inspector.locator('[data-portrait-inspector-task="geometry"]')).toBeVisible();
  await inspector.getByRole('button', { name: 'Images', exact: true }).tap();
  await expect(inspector.getByRole('listitem')).toHaveCount(2);
  await inspector.getByRole('button', { name: 'Remove selected image', exact: true }).tap();
  await expect(inspector.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).tap();
  await expect(inspector.getByRole('listitem')).toHaveCount(2);
});

test('desktop middle tap opens quick tools while middle drag preserves panning', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.waitForStableGeometry('hero');
  const box = await editor.node('hero').boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
  await page.mouse.click(x, y, { button:'middle' });
  await expect(page.locator('[data-desktop-quick-tools]')).toBeVisible();
  await settleSurface(page);
  const palette = page.locator('[data-desktop-quick-tools]');
  const paletteBox = await palette.boundingBox();
  expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(900 - 11);
  await page.screenshot({ path: testInfo.outputPath('desktop-quick-tools.png') });
  await palette.getByRole('button', { name:'Search commands', exact:true }).scrollIntoViewIfNeeded();
  await expect(palette.getByRole('button', { name:'Search commands', exact:true })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-desktop-quick-tools]')).toHaveCount(0);
  const code = await editor.getPageCode();
  await page.mouse.move(x, y); await page.mouse.down({ button:'middle' });
  await page.mouse.move(x + 45, y + 25, { steps:4 }); await page.mouse.up({ button:'middle' });
  await expect(page.locator('[data-desktop-quick-tools]')).toHaveCount(0);
  expect(await editor.getPageCode()).toBe(code);
});

test('floating Inspector has one full-height structural island around header and body', async ({ page }, testInfo) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.addInitScript(() => localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('floating')));
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button', { name: /open design inspector/i }).click();
  const island = page.locator('[data-workspace-island="right"]');
  const header = page.locator('[data-workspace-right-header]');
  const body = page.locator('[data-workspace-right-body]');
  await expect(body).toBeVisible();
  const a = await island.boundingBox(), b = await header.boundingBox(), c = await body.boundingBox();
  expect(a).not.toBeNull(); expect(b).not.toBeNull(); expect(c).not.toBeNull();
  expect(a!.height).toBeGreaterThan(300);
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  expect(c!.y + c!.height).toBeLessThanOrEqual(a!.y + a!.height + 2);
  expect(await body.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
  await settleSurface(page);
  await page.screenshot({ path:testInfo.outputPath('desktop-unified-inspector.png') });
});

test('portrait Media selection is reversible until explicit placement', async ({ page }, testInfo) => {
  // Stub only the external clipboard boundary. All app actions use visible UI.
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ readText: async () => 'https://field-test.example/image.svg' } }));
  await page.route('https://field-test.example/image.svg', route => route.fulfill({ contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#ff6f78"/></svg>' }));
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const before = await editor.getPageCode();
  await page.getByRole('button', { name:'Open browse', exact:true }).tap();
  await page.getByRole('button', { name:'Media Choose images, video and audio', exact:false }).tap();
  const media = page.locator('[data-portrait-media]');
  await expect(media).toBeVisible();
  await media.getByRole('button', { name:/paste from clipboard$/i }).tap();
  await expect(media.locator('[data-portrait-media-placement]')).toBeVisible();
  expect(await editor.getPageCode()).toBe(before);
  await media.getByRole('button', { name:'Choose another', exact:true }).tap();
  expect(await editor.getPageCode()).toBe(before);
  await media.getByRole('button', { name:/paste from clipboard$/i }).tap();
  await expect.poll(() => media.locator('img[alt="Selected media preview"]').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(media.locator('[data-preview-state="ready"]')).toBeVisible();
  await media.getByRole('button', { name:'Place image', exact:true }).focus();
  await page.keyboard.press('Tab');
  await expect(media.getByRole('button', { name:'Back to canvas', exact:true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(media.getByRole('button', { name:'Place image', exact:true })).toBeFocused();
  await page.screenshot({ path:testInfo.outputPath('portrait-media-confirm-390.png') });
  await media.getByRole('button', { name:'Place image', exact:true }).tap();
  await expect(media).toHaveCount(0);
  await expect.poll(() => editor.getPageCode()).toContain('https://field-test.example/image.svg');
});
