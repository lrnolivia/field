import { test, expect } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

async function marquee(
  page: import('@playwright/test').Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  modifier?: 'Control' | 'Meta',
) {
  if (modifier) await page.keyboard.down(modifier);
  try {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(160);
  } finally {
    if (modifier) await page.keyboard.up(modifier);
  }
}

test.describe('Figma selection parity — marquee depth', () => {
  test('normal marquee selects the containing surface; Ctrl-marquee selects the nested child', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
    await editor.fitCamera();

    const hero = await editor.nodeBox('hero');
    const child = await editor.nodeBox('abs-child');

    // Begin on open canvas just outside the page, then sweep across the
    // nested child. The rectangle intersects both Hero and AbsChild.
    const start = { x: hero.x - 24, y: hero.y + 12 };
    const end = { x: child.x + child.width + 12, y: child.y + child.height + 12 };

    await marquee(page, start, end);
    let selection: string[] = await page.evaluate(() => (window as any).__e2e.selection?.() ?? []);
    expect(selection).toEqual(['hero']);

    await page.evaluate(() => (window as any).__e2e.select([]));
    await page.waitForTimeout(80);

    // Linux CI uses Control; product code treats Ctrl/Meta identically.
    await marquee(page, start, end, 'Control');
    selection = await page.evaluate(() => (window as any).__e2e.selection?.() ?? []);
    expect(selection).toEqual(['abs-child']);
  });
});
