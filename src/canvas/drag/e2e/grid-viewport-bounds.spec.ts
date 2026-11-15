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

async function openGrid(page: Page) {
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
  }, PAGE);
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

for (const action of ['return', 'detach'] as const) {
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
    if (action === 'return') {
      await page.mouse.move(target.x, gapY);
      await expect.poll(slotX).toBeCloseTo(second.x, 0);
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
