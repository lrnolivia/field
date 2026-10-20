// Image Position mode: drag a Frame's image directly on the canvas INSIDE its
// fixed box. Camera-aware (90% zoom here), fit/fill model (the image tracks the
// pointer 1:1 and stops at the cover limits), the Frame never moves, Done
// commits one undo step, Escape cancels without a write.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

// 800×400 natural (2:1) image in a 320×240 frame with cover: painted 480×240,
// so 160px of horizontal overflow and none vertically.
const IMG = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="400" height="400" fill="#ef4444"/><rect x="400" width="400" height="400" fill="#3b82f6"/></svg>',
).toString('base64')}`;

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '600px', background: '#ffffff' }}>
      <div data-id="pic" data-name="Picture" style={{ position: 'absolute', left: '120px', top: '120px', width: '320px', height: '240px', backgroundImage: 'url("${IMG}")', backgroundSize: 'cover', backgroundPosition: '50% 50%', backgroundRepeat: 'no-repeat' }} />
    </div>
  );
}
`;

async function seed(p: Page, editor: EditorPage) {
  const project = {
    format: 'revyme-v1',
    files: {
      'app/page.tsx': `import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n`,
      'app/page.client.tsx': PAGE,
    },
  };
  await p.addInitScript((data) => {
    // Seed once per tab so a reload exercises the SAVED project.
    if (window.sessionStorage.getItem('e2e-seeded')) return;
    window.sessionStorage.setItem('e2e-seeded', '1');
    window.localStorage.setItem('revyme-project-local', JSON.stringify(data));
    window.localStorage.setItem('revyme-onboarding-completed', 'true');
  }, project);
  await p.goto('/work/local');
  await editor.sandbox().locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await editor.node('pic').waitFor({ state: 'attached', timeout: 60_000 });
  await editor.fitCamera();
  await p.evaluate(() => (window as any).__e2e.zoomTo(0.9));
  await expect.poll(() => p.evaluate(() => (window as any).__e2e.cameraScale())).toBeCloseTo(0.9, 3);
  await p.waitForTimeout(400);
}

const sourcePosition = (p: Page) =>
  p.evaluate(() => (window as any).__e2e.nodesSnapshot().pic.styles.backgroundPosition as string);
const livePosition = (editor: EditorPage) =>
  editor.node('pic').evaluate((el) => (el as HTMLElement).style.backgroundPosition);

async function enterPositionMode(p: Page) {
  await p.evaluate(() => (window as any).__e2e.select(['pic']));
  await p.waitForTimeout(300);
  const rows = p.locator('[data-inspector-section="fill"] button');
  await rows.filter({ hasText: /image/i }).first().click();
  await expect(p.getByRole('dialog', { name: 'Paint picker' })).toBeVisible();
  const adjust = p.locator('[data-image-position-adjust]').first();
  await adjust.waitFor({ state: 'visible', timeout: 10_000 });
  await adjust.click();
  await expect(p.locator('[data-image-position-overlay]')).toBeVisible();
}

async function dragInside(p: Page, editor: EditorPage, dx: number) {
  const box = await editor.nodeBox('pic');
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await p.mouse.move(from.x + (dx * i) / 10, from.y + (20 * i) / 10, { steps: 1 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  }
  await p.mouse.up();
  await p.waitForTimeout(200);
}

test('dragging inside the frame moves the image 1:1 at 90%, the frame stays, Done commits one undo', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  await enterPositionMode(p);
  const frameBefore = await editor.nodeBox('pic');

  // Move the image LEFT by 40 local px (36 screen px at 90%): overflow 160 →
  // position 50% + 40/160·100 = 75%. Vertical has no overflow → stays 50%.
  await dragInside(p, editor, -40 * 0.9);
  await expect.poll(() => livePosition(editor)).toBe('75% 50%');
  expect(await sourcePosition(p)).toBe('50% 50%'); // nothing written yet
  const frameAfter = await editor.nodeBox('pic');
  expect(Math.abs(frameAfter.x - frameBefore.x)).toBeLessThan(0.5);
  expect(Math.abs(frameAfter.y - frameBefore.y)).toBeLessThan(0.5);

  // Cover limit: dragging far keeps the image covering the box.
  await dragInside(p, editor, -1000);
  await expect.poll(() => livePosition(editor)).toBe('100% 50%');

  await p.locator('[data-image-position-bar] button', { hasText: 'Done' }).click();
  await expect(p.locator('[data-image-position-overlay]')).toHaveCount(0);
  await expect.poll(() => sourcePosition(p)).toBe('100% 50%');
  await expect.poll(() => editor.getPageCode()).toContain("backgroundPosition: '100% 50%'");

  await p.evaluate(() => (window as any).__e2e.select(['pic']));
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect.poll(() => sourcePosition(p)).toBe('50% 50%');
});

test('Escape cancels without a source write and restores the image', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  const codeBefore = await editor.getPageCode();
  await enterPositionMode(p);
  await dragInside(p, editor, 60);
  await expect.poll(() => livePosition(editor)).not.toBe('50% 50%');
  await p.keyboard.press('Escape');
  await expect(p.locator('[data-image-position-overlay]')).toHaveCount(0);
  await expect.poll(() => livePosition(editor)).toBe('50% 50%');
  expect(await editor.getPageCode()).toBe(codeBefore);
  // Selection survives the cancel (Escape did not also deselect).
  expect(await p.evaluate(() => (window as any).__e2e.selection())).toEqual(['pic']);
});

test('touch drag positions the image too', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1600, height: 950 } });
  const p = await context.newPage();
  const editor = new EditorPage(p);
  await seed(p, editor);
  await enterPositionMode(p);
  const box = await editor.nodeBox('pic');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(p);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', px: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y }] });
  await touch('touchStart', x);
  for (let i = 1; i <= 8; i++) await touch('touchMove', x + (36 * i) / 8);
  await touch('touchEnd', x + 36);
  // Image moved RIGHT by 40 local px → 50% − 25% = 25%.
  await expect.poll(() => livePosition(editor)).toBe('25% 50%');
  await context.close();
});

test('the committed position persists across reload, and clicking outside commits', async ({ page: p }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(p);
  await seed(p, editor);
  await enterPositionMode(p);
  await dragInside(p, editor, -40 * 0.9);
  await expect.poll(() => livePosition(editor)).toBe('75% 50%');

  // Click empty canvas outside the frame: commits (and deselects).
  const box = await editor.nodeBox('pic');
  await p.mouse.click(box.x + box.width + 120, box.y + box.height + 120);
  await expect(p.locator('[data-image-position-overlay]')).toHaveCount(0);
  await expect.poll(() => sourcePosition(p)).toBe('75% 50%');

  await expect.poll(
    () => p.evaluate(() => window.localStorage.getItem('revyme-project-local') ?? ''),
    { timeout: 15_000 },
  ).toContain('75% 50%');
  await p.reload();
  await editor.sandbox().locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await editor.node('pic').waitFor({ state: 'attached', timeout: 60_000 });
  await expect.poll(() => sourcePosition(p)).toBe('75% 50%');
  await expect.poll(() => editor.node('pic').evaluate((el) => getComputedStyle(el).backgroundPosition)).toBe('75% 50%');
});
