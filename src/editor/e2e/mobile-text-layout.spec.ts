// Phone layouts for a selected / edited text item: nothing in the landscape
// Inspector or the portrait text bar may sit outside the visible viewport.
import { test, expect, type Page } from '@playwright/test';

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '600px', background: '#ffffff' }}>
      <div data-id="card" data-name="Card" style={{ position: 'absolute', left: '80px', top: '80px', width: '320px', height: '200px', background: '#e0e7ff' }}>
        <p data-id="hello" data-name="Hello" style={{ position: 'absolute', left: '20px', top: '20px', fontSize: '28px', margin: 0 }}>Hello there</p>
      </div>
    </div>
  );
}
`;

async function open(page: Page) {
  await page.addInitScript((code) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('revyme-project-local', JSON.stringify({ format: 'revyme-v1', files: {
      'app/page.tsx': "import PageClient from './page.client';\n\nexport const metadata = {};\n\nexport default function Page() {\n  return <PageClient />;\n}\n",
      'app/page.client.tsx': code,
    } }));
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('field:prefs:dockedInspectorOpen:v1', 'true');
  }, PAGE);
  await page.goto('/work/local');
  await page.frameLocator('iframe[src*="5174"]').locator('[data-id="hello"]').first().waitFor({ state: 'attached', timeout: 60_000 });
  await page.evaluate(() => (window as any).__e2e.select(['hello']));
}

/** Elements inside `root` whose painted box leaves the visible viewport. */
async function outside(page: Page, root: string) {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel);
    if (!host) return ['missing ' + sel];
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: string[] = [];
    for (const el of [host, ...host.querySelectorAll('*')]) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Content scrolled inside a scroller is reachable; only flag boxes that
      // escape EVERY clipping ancestor up to the viewport.
      let clip: Element | null = el.parentElement;
      let clipped = false;
      while (clip && clip !== document.body) {
        const s = getComputedStyle(clip);
        if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) { clipped = true; break; }
        clip = clip.parentElement;
      }
      if (clipped && el !== host) continue;
      if (r.left < -0.5 || r.right > vw + 0.5 || r.top < -0.5 || r.bottom > vh + 0.5) {
        out.push(`${el.tagName}.${(el.className?.toString?.() || '').slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}]x[${Math.round(r.top)},${Math.round(r.bottom)}]`);
      }
    }
    return out.slice(0, 10);
  }, root);
}

for (const size of [{ width: 844, height: 390 }, { width: 932, height: 430 }, { width: 667, height: 375 }]) {
  test(`landscape ${size.width}×${size.height}: the Inspector for a text item stays on screen`, async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await open(page);
    const pane = page.locator('[data-workspace-right-body]');
    if (!await pane.isVisible()) await page.getByRole('button', { name: /expand|inspector|properties/i }).last().click();
    await expect(pane).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: testInfo.outputPath(`landscape-${size.width}.png`) });
    // iOS Safari lets an overflowing document scroll/zoom sideways, which
    // slides every right-anchored pane past the screen edge.
    const docOverflow = await page.evaluate(() => {
      const vw = window.innerWidth;
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 0.5) return false;
        let p = el.parentElement;
        while (p && p !== document.body) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) return false; p = p.parentElement; }
        return getComputedStyle(el).position !== 'fixed' || true;
      }).slice(0, 8).map((el) => `${el.tagName}.${(el.className?.toString?.() || '').slice(0, 50)} r=${Math.round(el.getBoundingClientRect().right)} ${[...el.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name).join(',')}`);
      return { scrollW: document.documentElement.scrollWidth, vw, wide };
    });
    expect(docOverflow.scrollW).toBeLessThanOrEqual(size.width);
    expect(await outside(page, '[data-workspace-right-body]')).toEqual([]);
    const box = (await pane.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    await context.close();
  });
}

test('portrait: the text bar fits the phone while editing text', async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('field:start-text-edit', { detail: { nodeId: 'hello', vpId: 'desktop' } })));
  const bar = page.locator('[data-field-mobile-text-toolbar]');
  await expect(bar).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('portrait-text-bar.png') });
  // One Done (the bar's own), no sideways strip, and every control row visible
  // inside the bar's own vertical scroller.
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(1);
  const grid = await page.locator('[data-mobile-text-controls]').evaluate((el) => ({
    sideways: el.scrollWidth - el.clientWidth,
    cells: [...el.children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => {
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  }));
  expect(grid.sideways).toBeLessThanOrEqual(1);
  for (const cell of grid.cells) expect(cell.h, JSON.stringify(cell)).toBeGreaterThan(0);
  const barBox = (await bar.boundingBox())!;
  expect(barBox.height).toBeLessThan(150);
  expect(await outside(page, '[data-field-mobile-text-toolbar]')).toEqual([]);
  await context.close();
});
