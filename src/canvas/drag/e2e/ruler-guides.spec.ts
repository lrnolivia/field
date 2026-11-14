import { expect, test, type Page } from '@playwright/test';
import { parseRulerGuides } from '@/code/project/ruler-guides-config';
import { EditorPage } from './helpers/editor-page';

const source = `/** @canvas { "viewports": [{"id":"desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" style={{position:'relative', width:'900px', height:'520px', background:'#ffffff'}}>
      <div data-id="rect" style={{position:'absolute', left:'424px', top:'128px', width:'160px', height:'120px', background:'#ef4444'}} />
    </div>
  );
}
`;

type Workspace = 'docked' | 'floating' | 'compact-docked';
declare global {
  interface Window {
    __e2e: {
      zoomTo(scale: number): void;
      cameraScale(): number;
      select(ids: string[]): void;
      openFile(path: string): void;
      readFile(path: string): string;
    };
  }
}

async function openEditor(page: Page, mode: Workspace) {
  const editor = new EditorPage(page);
  await page.addInitScript(({ mode, source }) => {
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('revyme:prefs:showRulers', 'true');
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify(mode));
    localStorage.setItem('field:prefs:dockedLeftOpen:v1', String(mode !== 'compact-docked'));
    localStorage.setItem('field:prefs:dockedInspectorOpen:v1', String(mode !== 'compact-docked'));
    localStorage.setItem('field:prefs:leftContentWidth', '360');
    localStorage.setItem('field:prefs:rightPaneWidth:v2', '390');
    localStorage.setItem('revyme-project-local', JSON.stringify({
      format: 'revyme-v1',
      files: {
        'app/page.tsx': "import Client from './page.client'; export const metadata = {}; export default function Page() { return <Client />; }",
        'app/page.client.tsx': source,
        'app/other/page.client.tsx': source.replace('data-id="rect"', 'data-id="other-rect"'),
      },
    }));
  }, { mode, source });
  await page.goto('/work/local');
  await page.locator('[data-editor-interactive="true"]').waitFor();
  await editor.node('rect').waitFor();
  await page.waitForFunction(() => Boolean(window.__e2e?.zoomTo));
  await editor.fitCamera();
  await page.evaluate(() => window.__e2e.zoomTo(1));
  await expect.poll(() => page.evaluate(() => window.__e2e.cameraScale())).toBe(1);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return editor;
}

async function placeVerticalGuide(page: Page, x: number, y: number) {
  const ruler = await page.locator('[data-ruler]').nth(1).boundingBox();
  expect(ruler).not.toBeNull();
  const grabX = ruler!.x === 0 ? 6 : ruler!.x + ruler!.width - 8;
  await page.mouse.move(grabX, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
}

for (const mode of ['docked', 'floating', 'compact-docked'] as const) {
  test(`rulers and vertical guides share the Canvas origin in ${mode}`, async ({ page }) => {
    const editor = await openEditor(page, mode);
    const ruler = await page.locator('[data-ruler]').nth(1).boundingBox();
    expect(ruler?.x).toBe({ docked: 400, floating: 0, 'compact-docked': 40 }[mode]);
    const rect = await editor.nodeBox('rect');
    const y = rect.y + rect.height / 2;
    await placeVerticalGuide(page, Math.round(rect.x), y);
    const guide = page.locator('[data-ruler-guide]');
    await expect(guide).toHaveCount(1);

    const previous = await guide.boundingBox();
    expect(Math.abs(previous!.x - rect.x)).toBeLessThan(1.1);

    await page.evaluate(() => window.__e2e.zoomTo(1.2));
    await expect.poll(async () => Math.abs((await guide.boundingBox())!.x - (await editor.nodeBox('rect')).x)).toBeLessThan(1.3);
  });
}

test('moving and removing a ruler guide each commit once and can be undone', async ({ page }) => {
  const editor = await openEditor(page, 'docked');
  const rect = await editor.nodeBox('rect');
  const y = rect.y + rect.height / 2;
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await placeVerticalGuide(page, Math.round(rect.x), y);
  const guide = page.locator('[data-ruler-guide]');
  await expect(guide).toHaveCount(1);
  const original = parseRulerGuides(await editor.getPageCode());

  // Grabbing the hit area two pixels away from the line keeps that offset.
  const startX = Math.round((await guide.boundingBox())!.x) + 2;
  await page.mouse.click(startX, y);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 32, y, { steps: 12 });
  await expect.poll(async () => (await guide.boundingBox())!.x).toBeCloseTo(startX + 30, 0);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(async () => (await guide.boundingBox())!.x).toBeCloseTo(startX - 2, 0);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 32, y, { steps: 12 });
  await page.mouse.up();
  const moved = parseRulerGuides(await editor.getPageCode());
  expect(moved[0].position - original[0].position).toBeCloseTo(32, 0);

  const ruler = (await page.locator('[data-ruler]').nth(1).boundingBox())!;
  await page.mouse.move(startX + 32, y);
  await page.mouse.down();
  await page.mouse.move(ruler.x + ruler.width - 8, y, { steps: 12 });
  await page.mouse.up();
  await expect(guide).toHaveCount(0);

  await page.keyboard.press(`${mod}+z`);
  await expect.poll(async () => parseRulerGuides(await editor.getPageCode())).toEqual(moved);
  await page.keyboard.press(`${mod}+z`);
  await expect.poll(async () => parseRulerGuides(await editor.getPageCode())).toEqual(original);
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect.poll(async () => parseRulerGuides(await editor.getPageCode())).toEqual(moved);
});

test('a desktop Canvas object snaps to the visible ruler guide', async ({ page }) => {
  const editor = await openEditor(page, 'docked');
  const rect = await editor.nodeBox('rect');
  const targetX = Math.round(rect.x + 140);
  const y = rect.y + rect.height / 2;
  await placeVerticalGuide(page, targetX, y);
  await expect(page.locator('[data-ruler-guide]')).toHaveCount(1);

  await page.evaluate(() => window.__e2e.select(['rect']));
  const startX = Math.round(rect.x + rect.width / 2);
  const endX = startX + targetX - Math.round(rect.x) - 3;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let step = 1; step <= 25; step++) {
    await page.mouse.move(startX + (endX - startX) * step / 25, y);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  }
  // Initial pointer motion lifts the object. Use its painted position to
  // approach the guide just inside the snap threshold without crossing it.
  const beforeSnap = await editor.nodeBox('rect');
  const settleX = endX + targetX - Math.round(beforeSnap.x) - 2;
  await page.mouse.move(settleX, y, { steps: 6 });
  await expect.poll(() => page.locator('svg line[stroke="#f472b6"]').evaluateAll((lines, x) =>
    lines.some((line) => {
      const box = line.getBoundingClientRect();
      return box.height > 100 && Math.abs(box.x - x) < 0.5;
    }), targetX),
  ).toBe(true);
  await page.mouse.up();
  await expect.poll(async () => (await editor.nodeBox('rect')).x).toBeCloseTo(targetX, 0);
});

test('switching pages cancels a guide drag, and a horizontal guide can be created and undone', async ({ page }) => {
  const editor = await openEditor(page, 'docked');
  const topRuler = (await page.locator('[data-ruler]').first().boundingBox())!;
  const startX = Math.round(topRuler.x + topRuler.width / 2);
  const startY = Math.round(topRuler.y + topRuler.height / 2);
  const endY = Math.round((await editor.nodeBox('rect')).y);
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, endY, { steps: 12 });
  await page.evaluate(() => window.__e2e.openFile('app/other/page.client.tsx'));
  await editor.node('other-rect').waitFor();
  await page.mouse.up();
  const otherSource = await page.evaluate(() => window.__e2e.readFile('app/other/page.client.tsx'));
  expect(parseRulerGuides(await editor.getPageCode())).toEqual([]);
  expect(parseRulerGuides(otherSource)).toEqual([]);

  await page.evaluate(() => window.__e2e.openFile('app/page.client.tsx'));
  await editor.node('rect').waitFor();
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, endY, { steps: 12 });
  await page.mouse.up();
  const guide = page.locator('[data-ruler-guide]');
  await expect(guide).toHaveCount(1);
  expect((await guide.boundingBox())?.y).toBeCloseTo(endY, 0);
  expect(parseRulerGuides(await editor.getPageCode())[0].type).toBe('horizontal');

  await page.keyboard.press(`${mod}+z`);
  await expect(guide).toHaveCount(0);
});

test('read-only Canvas keeps existing guides and refuses guide edits', async ({ page, context }) => {
  const editor = await openEditor(page, 'docked');
  const rect = await editor.nodeBox('rect');
  const x = Math.round(rect.x);
  const y = Math.round(rect.y + rect.height / 2);
  await placeVerticalGuide(page, x, y);
  const guide = page.locator('[data-ruler-guide]');
  await expect(guide).toHaveCount(1);
  const before = await editor.getPageCode();

  await context.setOffline(true);
  await expect(page.getByText(/reconnect/i).last()).toBeVisible();
  await placeVerticalGuide(page, x + 100, y);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 12 });
  await page.mouse.up();
  await page.mouse.click(x, y, { button: 'right' });
  await expect(page.locator('[data-ruler-guide-menu]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  await expect(guide).toHaveCount(1);
  expect(await editor.getPageCode()).toBe(before);
});
