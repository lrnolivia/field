// Every left panel keeps one vertical rhythm: the search row → first section
// and section → section are the same gap.
import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('left panels share one gap under the search bar and between sections', async ({ page }) => {
  test.setTimeout(120_000);
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  const report: Record<string, { first: number; gaps: number[] }> = {};
  for (const name of ['Pages & Layers', 'Library', 'Media', 'Presets', 'CMS', 'Branches']) {
    await page.locator('[data-left-menu-rail] button').and(page.getByRole('button', { name, exact: true })).click();
    await page.waitForTimeout(400);
    report[name] = await page.evaluate(() => {
      const body = document.querySelector('[data-editor-panel="left-primary"]')!;
      const input = body.querySelector('input[data-field-searchbar]')!;
      const ib = input.getBoundingClientRect().bottom;
      const width = body.getBoundingClientRect().width;
      const cards = [...body.querySelectorAll<HTMLElement>('div,section')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < ib || r.width < width * 0.8 || r.height < 24) return false;
        const bg = getComputedStyle(el).backgroundColor;
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      });
      const rects = cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)))
        .map((c) => c.getBoundingClientRect()).sort((a, b) => a.top - b.top);
      return {
        first: Math.round((rects[0].top - ib) * 10) / 10,
        gaps: rects.slice(1).map((r, i) => Math.round((r.top - rects[i].bottom) * 10) / 10),
      };
    });
  }
  console.log('RHYTHM', JSON.stringify(report));
  const gap = report['Library'].first;
  expect(gap).toBeGreaterThan(0);
  for (const [name, { first, gaps }] of Object.entries(report)) {
    expect(first, `${name}: search → first section`).toBeCloseTo(gap, 0);
    for (const g of gaps) expect(g, `${name}: between sections`).toBeCloseTo(gap, 0);
  }
});
