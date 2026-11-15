import { expect, test, type Page } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" style={{position:'relative', width:'900px', background:'#fff'}}>
      <div data-id="grid" style={{position:'absolute', left:'424px', top:'128px', width:'170px', height:'120px', display:'grid', gridTemplateColumns:'repeat(3, 35px)', gridAutoRows:'24px', gap:'10px', padding:'10px', boxSizing:'border-box', background:'#aaa'}}>
        <div data-id="a" style={{width:'30px', height:'24px', background:'#f00'}} />
        <div data-id="b" style={{width:'30px', height:'24px', background:'#0f0'}} />
        <div data-id="c" style={{width:'30px', height:'24px', background:'#00f'}} />
      </div>
      <div data-id="section" style={{position:'absolute', left:'420px', top:'310px', width:'170px', height:'30px', background:'#aaa'}} />
    </div>
  );
}
`;

async function openGrid(page: Page, source = PAGE) {
  await page.addInitScript(source => {
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked'));
    localStorage.setItem('field:prefs:dockedLeftOpen:v1', 'true');
    localStorage.setItem('field:prefs:dockedInspectorOpen:v1', 'true');
    localStorage.setItem('revyme-project-local', JSON.stringify({
      format: 'revyme-v1',
      files: {
        'app/page.tsx': "import Client from './page.client'; export const metadata = {}; export default function Page() { return <Client />; }",
        'app/page.client.tsx': source,
      },
    }));
  }, source);
  const editor = new EditorPage(page);
  await page.goto('/work/local');
  await page.locator('[data-editor-interactive="true"]').waitFor();
  await editor.node('a').waitFor();
  await page.waitForFunction(() => Boolean((window as Window & { __e2e?: object }).__e2e));
  await editor.fitCamera();
  await editor.waitForStableGeometry('a');
  await editor.select(['a']);
  return editor;
}

const center = (box: { x: number; y: number; width: number; height: number }) => ({
  x: box.x + box.width / 2, y: box.y + box.height / 2,
});

for (const action of ['return', 'detach', 'cancel'] as const) {
  test(`a grid beyond the root box can reorder and ${action} across the actual page boundary`, async ({ page }) => {
    const editor = await openGrid(page);
    const before = await editor.getPageCode();
    const grid = await editor.nodeBox('grid');
    const section = await editor.nodeBox('section');
    const rootBottom = await editor.node('root').evaluate(el => el.getBoundingClientRect().bottom);
    const gridTop = await editor.node('grid').evaluate(el => el.getBoundingClientRect().top);
    expect(rootBottom).toBeLessThan(gridTop);
    const first = center(await editor.nodeBox('a'));
    const second = await editor.nodeBox('b');
    const target = center(second);
    const slot = editor.sandbox().locator('[data-placeholder-id="ph-grid-a"]');
    const slotX = async () => (await slot.boundingBox())?.x;

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 7, first.y);
    await expect(slot).toBeVisible();
    await page.mouse.move(target.x, target.y);
    await expect.poll(slotX).toBeCloseTo(second.x, 0);

    // The page extends down to its last section, even though the root
    // box above the grid contributes no height.
    const gapY = (grid.y + grid.height + section.y) / 2;
    await page.mouse.move(target.x, gapY);
    await expect.poll(slotX).toBeCloseTo(second.x, 0);
    await page.mouse.move(target.x, section.y + section.height + 70);
    await expect(slot).toHaveCount(0);
    if (action !== 'detach') {
      await page.mouse.move(target.x, gapY);
      await expect.poll(slotX).toBeCloseTo(second.x, 0);
    }

    if (action === 'cancel') {
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect.poll(async () => center(await editor.nodeBox('a')).x).toBeCloseTo(first.x, 0);
      await expect.poll(async () => (await editor.nodeBox('b')).x).toBeCloseTo(second.x, 0);
      expect(await editor.getPageCode()).toBe(before);
      return;
    }

    await page.mouse.up();
    const inside = editor.sandbox().locator('[data-id="grid"] > [data-id="a"]');
    if (action === 'return') {
      await expect(inside).toBeVisible();
      await expect.poll(async () => (await editor.nodeBox('a')).x).toBeCloseTo(second.x, 0);
    } else {
      await expect(inside).toHaveCount(0);
      await expect(editor.node('a')).toBeVisible();
    }
    await expect.poll(() => editor.getPageCode()).not.toBe(before);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect.poll(() => editor.getPageCode()).toBe(before);
    await expect(inside).toBeVisible();
  });
}

for (const placement of ['numbered lines', 'named areas'] as const) {
  test(`Grid drag swaps ${placement} without reordering JSX`, async ({ page }) => {
    const named = placement === 'named areas';
    const placed = (['a', 'b', 'c'] as const).reduce((code, id, index) => code.replace(
      `data-id="${id}" style={{`,
      `data-id="${id}" style={{${named ? `gridArea:'${id}',` : `gridColumn:'${index + 1}', gridRow:'1',`}`,
    ), PAGE).replace("gridAutoRows:'24px',", named ? `gridAutoRows:'24px', gridTemplateAreas:'"a b c"',` : "gridAutoRows:'24px',");
    const editor = await openGrid(page, placed);
    const before = await editor.getPageCode();
    const a = center(await editor.nodeBox('a'));
    const c = center(await editor.nodeBox('c'));
    const slot = editor.sandbox().locator('[data-placeholder-id="ph-grid-a"]');
    const xOf = async (id: string) => center(await editor.nodeBox(id)).x;
    const slotCenter = async () => {
      const rect = await slot.boundingBox();
      return rect ? center(rect).x : undefined;
    };
    const dragToC = async () => {
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(a.x + 7, a.y);
      await expect.poll(slotCenter).toBeCloseTo(a.x, 0);
      await page.mouse.move(c.x, c.y);
      await expect.poll(slotCenter).toBeCloseTo(c.x, 0);
      await expect.poll(() => xOf('c')).toBeCloseTo(a.x, 0);
    };

    await dragToC();
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect.poll(() => xOf('a')).toBeCloseTo(a.x, 0);
    await expect.poll(() => xOf('c')).toBeCloseTo(c.x, 0);
    expect(await editor.getPageCode()).toBe(before);

    await editor.waitForStableGeometry('a');
    await editor.select(['a']);
    await dragToC();
    await page.mouse.up();
    await expect.poll(() => xOf('a')).toBeCloseTo(c.x, 0);
    await expect.poll(() => xOf('c')).toBeCloseTo(a.x, 0);
    const prop = named ? 'gridArea' : 'gridColumn';
    await expect.poll(() => editor.getInlineStyleProp('a', prop)).toBe(named ? 'c' : '3');
    await expect.poll(() => editor.getInlineStyleProp('c', prop)).toBe(named ? 'a' : '1');
    const sourceOrder = async () => (await editor.getPageCode()).match(/data-id="[abc]"/g);
    expect(await sourceOrder()).toEqual(['data-id="a"', 'data-id="b"', 'data-id="c"']);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect.poll(() => editor.getPageCode()).toBe(before);

    if (!named) {
      await editor.waitForStableGeometry('a');
      await editor.select(['a']);
      await dragToC();
      const section = await editor.nodeBox('section');
      await page.mouse.move(c.x, section.y + section.height + 70);
      await expect(slot).toHaveCount(0);
      await page.mouse.up();
      await expect(editor.sandbox().locator('[data-id="grid"] > [data-id="a"]')).toHaveCount(0);
      await expect.poll(() => xOf('c')).toBeCloseTo(c.x, 0);
      await expect.poll(() => editor.getInlineStyleProp('c', prop)).toBe('3');
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
      await expect.poll(() => editor.getPageCode()).toBe(before);
    }
  });
}

test('explicit Grid swaps within the compact desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 950 });
  const compactId = 'desktopCompact';
  const compactOverrides = `<style>{\`
      @media (max-width: 1100px) {
        [data-id="a"] { grid-column: 2 !important; }
        [data-id="b"] { grid-column: 3 !important; }
        [data-id="c"] { grid-column: 1 !important; }
      }
      \`}</style>`;
  const source = (['a', 'b', 'c'] as const).reduce((code, id, i) => code.replace(
    `data-id="${id}" style={{`, `data-id="${id}" style={{gridColumn:'${i + 1}', gridRow:'1',`,
  ), PAGE)
    .replace('/** @canvas { "viewports": [{"id":"desktop","width":900}] } */', `/** @canvas {
      "viewports": [
        {"id":"desktop","label":"Desktop","width":1440,"isPrimary":true,"order":0},
        {"id":"${compactId}","label":"Compact desktop","width":1100,"isPrimary":false,"order":1}
      ],
      "positions": {"desktop":{"x":0,"y":0},"${compactId}":{"x":1540,"y":0}}
    } */`)
    .replace('<div data-id="grid"', `${compactOverrides}<div data-id="grid"`);
  const editor = await openGrid(page, source);
  const base = editor.sandbox().locator('[data-viewport="desktop"]');
  const compact = editor.sandbox().locator(`[data-viewport="${compactId}"]`);
  const layer = (id: string) => compact.locator(`[data-id="${id}"]`);
  const initial = await editor.getPageCode();
  await expect(base.locator('[data-id="a"]')).toHaveCSS('grid-column-start', '1');
  await expect(layer('a')).toHaveCSS('grid-column-start', '2');
  await expect(layer('c')).toHaveCSS('grid-column-start', '1');

  await editor.select(['a'], compactId);
  const a = center(await editor.nodeBoxIn(compactId, 'a'));
  const c = center(await editor.nodeBoxIn(compactId, 'c'));
  const slot = compact.locator('[data-placeholder-id="ph-grid-a"]');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x, a.y + 4);
  await expect(slot).toHaveCSS('grid-column-start', '2');
  await page.mouse.move(c.x, c.y);
  await expect(slot).toHaveCSS('grid-column-start', '1');
  await expect(layer('c')).toHaveCSS('grid-column-start', '2');
  await page.mouse.up();

  await expect(layer('a')).toHaveCSS('grid-column-start', '1');
  await expect(layer('c')).toHaveCSS('grid-column-start', '2');
  await expect(base.locator('[data-id="a"]')).toHaveCSS('grid-column-start', '1');
  await expect(base.locator('[data-id="c"]')).toHaveCSS('grid-column-start', '3');
  await expect.poll(() => editor.getPageCode()).toMatch(/<div data-id="c"[^>]*gridColumn:\s*'3'/);
  await expect.poll(() => editor.getBandStyleProp(1100, 'c', 'grid-column')).toBe('2');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect.poll(() => editor.getPageCode()).toBe(initial);
});
