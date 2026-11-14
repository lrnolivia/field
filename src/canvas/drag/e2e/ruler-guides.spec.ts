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

async function openEditor(page: Page, mode: Workspace, pageSource = source) {
  const editor = new EditorPage(page);
  await page.addInitScript(({ mode, source }) => {
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('revyme:prefs:showRulers', 'true');
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify(mode));
    localStorage.setItem('field:prefs:dockedLeftOpen:v1', String(mode !== 'compact-docked'));
    localStorage.setItem('field:prefs:dockedInspectorOpen:v1', String(mode !== 'compact-docked'));
    localStorage.setItem('field:prefs:leftContentWidth', '360');
    localStorage.setItem('field:prefs:rightPaneWidth:v2', '390');
    if (!localStorage.getItem('revyme-project-local')) localStorage.setItem('revyme-project-local', JSON.stringify({
      format: 'revyme-v1',
      files: {
        'app/page.tsx': "import Client from './page.client'; export const metadata = {}; export default function Page() { return <Client />; }",
        'app/page.client.tsx': source,
        'app/other/page.client.tsx': source.replace('data-id="rect"', 'data-id="other-rect"'),
      },
    }));
  }, { mode, source: pageSource });
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

test('a guide dropped on the selected frame is local to the frame and survives reload', async ({ page }) => {
  const editor = await openEditor(page, 'docked');
  const originalFrame = await editor.nodeBox('rect');
  await page.evaluate(() => window.__e2e.select(['rect']));
  await placeVerticalGuide(page, Math.round(originalFrame.x + 48), Math.round(originalFrame.y + 60));
  const guide = page.locator('[data-ruler-guide-frame="rect"]');
  await expect(guide).toHaveCount(1);
  const initial = parseRulerGuides(await editor.getPageCode())[0];
  expect(initial.frame).toEqual({ id: 'rect', viewportId: 'desktop' });
  expect(initial.position).toBeCloseTo(48, 0);
  const guideBox = (await guide.boundingBox())!;
  expect(guideBox.y).toBeCloseTo(originalFrame.y, 0);
  expect(guideBox.height).toBeCloseTo(originalFrame.height, 0);

  await page.evaluate(() => window.__e2e.select(['rect']));
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await editor.nodeBox('rect')).x).toBeGreaterThan(originalFrame.x);
  await expect.poll(async () => (await guide.boundingBox())!.x - (await editor.nodeBox('rect')).x).toBeCloseTo(initial.position, 0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain(initial.id);
  await page.reload();
  await page.locator('[data-editor-interactive="true"]').waitFor();
  await page.waitForFunction(() => Boolean(window.__e2e?.zoomTo));
  await editor.fitCamera();
  await page.evaluate(() => window.__e2e.zoomTo(1));
  await expect(guide).toHaveCount(1);
  expect(parseRulerGuides(await editor.getPageCode())[0]).toEqual(initial);

  const box = (await guide.boundingBox())!;
  await page.mouse.move(Math.round(box.x), Math.round(box.y + box.height / 2));
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(Math.round(box.x) + 20, Math.round(box.y + box.height / 2), { steps: 8 });
  await expect(page.locator('[data-ruler-guide-preview]')).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(guide).toHaveCount(2);
  expect(parseRulerGuides(await editor.getPageCode()).map(item => item.frame)).toEqual([initial.frame, initial.frame]);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(guide).toHaveCount(1);
});

test('a guide stays attached to a rotated frame through drag, reload and Undo', async ({ page }) => {
  const rotatedSource = source.replace("background:'#ef4444'", "background:'#ef4444', transform:'rotate(30deg)'");
  const editor = await openEditor(page, 'docked', rotatedSource);
  const frame = await editor.nodeBox('rect');
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  await page.evaluate(() => window.__e2e.select(['rect']));
  await placeVerticalGuide(page, cx, cy);
  const guide = page.locator('[data-ruler-guide-frame="rect"]');
  await expect(guide).toHaveCount(1);
  const initial = parseRulerGuides(await editor.getPageCode())[0];
  expect(initial.frame).toEqual({ id: 'rect', viewportId: 'desktop' });
  expect(Math.abs(initial.position - 80)).toBeLessThan(1.2);
  const firstLine = (await guide.boundingBox())!;
  expect(firstLine.width).toBeGreaterThan(58);
  expect(firstLine.height).toBeGreaterThan(100);

  const x = firstLine.x + firstLine.width / 2;
  const y = firstLine.y + firstLine.height / 2;
  await page.mouse.move(x, y);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(x + 24 * Math.cos(Math.PI / 6), y + 24 * Math.sin(Math.PI / 6), { steps: 10 });
  await expect(page.locator('[data-ruler-guide-preview]')).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(guide).toHaveCount(2);
  const copies = parseRulerGuides(await editor.getPageCode());
  expect(copies[1].frame).toEqual(initial.frame);
  expect(Math.abs(copies[1].position - initial.position - 24)).toBeLessThan(1.2);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(guide).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('revyme-project-local'))).toContain(initial.id);

  await page.reload();
  await page.locator('[data-editor-interactive="true"]').waitFor();
  await page.waitForFunction(() => Boolean(window.__e2e?.zoomTo));
  await editor.fitCamera();
  await page.evaluate(() => window.__e2e.zoomTo(1));
  await expect(guide).toHaveCount(1);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual([initial]);
  await expect.poll(async () => (await guide.boundingBox())!.width).toBeGreaterThan(58);
});

test('a rotated frame guide snaps its directly positioned child in frame coordinates', async ({ page }) => {
  const rotatedSource = source.replace(
    "background:'#ef4444'}} />",
    "background:'#ef4444', transform:'rotate(30deg)'}}><div data-id=\"child\" style={{position:'absolute', left:'20px', top:'42px', width:'18px', height:'22px', background:'#000'}} /></div>",
  );
  const editor = await openEditor(page, 'docked', rotatedSource);
  const frame = await editor.nodeBox('rect');
  await page.evaluate(() => window.__e2e.select(['rect']));
  await placeVerticalGuide(page, frame.x + frame.width / 2, frame.y + frame.height / 2);
  const guide = page.locator('[data-ruler-guide-frame="rect"]');
  await expect(guide).toHaveCount(1);
  const line = (await guide.boundingBox())!;
  await page.evaluate(() => window.__e2e.select(['child']));
  const child = await editor.nodeBox('child');
  const x = child.x + child.width / 2;
  const y = child.y + child.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const cos = Math.cos(Math.PI / 6);
  const sin = Math.sin(Math.PI / 6);
  for (let step = 1; step <= 28; step++) {
    const distance = 58 * step / 28;
    await page.mouse.move(x + distance * cos, y + distance * sin);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  }
  await expect.poll(() => page.locator('svg line[stroke="#f472b6"]').evaluateAll((lines, expected) =>
    lines.some(line => {
      const box = line.getBoundingClientRect();
      return Math.abs(box.x - expected.x) < 2 && Math.abs(box.width - expected.width) < 2;
    }), line),
  ).toBe(true);
  await page.mouse.up();
  const actual = await editor.nodeBox('child');
  expect(Math.abs(actual.x - child.x - 60 * cos)).toBeLessThan(1.5);
  expect(Math.abs(actual.y - child.y - 60 * sin)).toBeLessThan(1.5);
});

test('a frame guide snaps its positioned child at the visible guide', async ({ page }) => {
  const frameSource = source.replace("background:'#ef4444'}} />", "background:'#ef4444'}}><div data-id=\"child\" style={{position:'absolute', left:'20px', top:'42px', width:'18px', height:'22px', background:'#000'}} /></div>");
  const editor = await openEditor(page, 'docked', frameSource);
  const frame = await editor.nodeBox('rect');
  const targetX = Math.round(frame.x + 85);
  const rulerY = Math.round(frame.y + 80);
  await page.evaluate(() => window.__e2e.select(['rect']));
  await placeVerticalGuide(page, targetX, rulerY);
  await expect(page.locator('[data-ruler-guide-frame="rect"]')).toHaveCount(1);

  await page.evaluate(() => window.__e2e.select(['child']));
  const child = await editor.nodeBox('child');
  const x = Math.round(child.x + child.width / 2);
  const y = Math.round(child.y + child.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const nearGuide = x + targetX - Math.round(child.x) - 2;
  await page.mouse.move(nearGuide, y, { steps: 28 });
  await expect.poll(() => page.locator('svg line[stroke="#f472b6"]').evaluateAll((lines, expected) =>
    lines.some(line => {
      const box = line.getBoundingClientRect();
      return Math.abs(box.x - expected.x) < 1 && Math.abs(box.height - expected.height) < 2;
    }), { x: targetX, height: frame.height }),
  ).toBe(true);
  await page.mouse.up();
  await expect.poll(async () => (await editor.nodeBox('child')).x).toBeCloseTo(targetX, 0);
});

for (const scenario of [
  { name: 'direct child', nested: false, shift: false, angle: 30, travel: 40, width: '60px', height: '24px', top: '42px' },
  { name: 'nested child in a scaled frame', nested: true, shift: false, angle: 30, travel: 13, width: '28px', height: '24px', top: '42px' },
  { name: 'nested child with scale but no rotation', nested: true, shift: false, angle: 0, travel: 13, width: '28px', height: '24px', top: '42px' },
  { name: 'nested child with Shift held', nested: true, shift: true, angle: 30, travel: 13, width: '28px', height: '37px', top: '35px' },
] as const) {
  test(`a ${scenario.name} resizes to its ancestor guide and undoes cleanly`, async ({ page }) => {
    const childSource = `<div data-id="child" style={{position:'absolute', left:'20px', top:'42px', width:'18px', height:'24px', background:'#000'}} />`;
    const content = scenario.nested
      ? `<div data-id="inner" style={{position:'absolute', left:'8px', top:'10px', width:'80px', height:'70px', transform:'scale(1.5)', transformOrigin:'0 0'}}>${childSource}</div>`
      : childSource;
    const rotatedSource = source.replace(
      "background:'#ef4444'}} />",
      `background:'#ef4444', transform:'rotate(${scenario.angle}deg)'}}>${content}</div>`,
    );
    const editor = await openEditor(page, 'docked', rotatedSource);
    const frame = await editor.nodeBox('rect');
    await editor.select(['rect']);
    await placeVerticalGuide(page, frame.x + frame.width / 2, frame.y + frame.height / 2);
    const guide = page.locator('[data-ruler-guide-frame="rect"]');
    await expect(guide).toHaveCount(1);
    const line = (await guide.boundingBox())!;
    await editor.select(['child']);
    const edge = page.locator('[data-resize-edge="right"]');
    const box = (await edge.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const angle = scenario.angle * Math.PI / 180;
    if (scenario.shift) await page.keyboard.down('Shift');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + scenario.travel * Math.cos(angle), y + scenario.travel * Math.sin(angle), { steps: 30 });
    await expect.poll(() => page.locator('svg line[stroke="#f472b6"]').evaluateAll((lines, expected) =>
      lines.some(candidate => {
        const bounds = candidate.getBoundingClientRect();
        return Math.abs(bounds.x - expected.x) < 2 && Math.abs(bounds.width - expected.width) < 2;
      }), line), { timeout: 2500 }).toBe(true);
    await page.mouse.up();
    if (scenario.shift) await page.keyboard.up('Shift');
    const child = editor.node('child');
    await expect(child).toHaveCSS('width', scenario.width);
    await expect(child).toHaveCSS('height', scenario.height);
    await expect(child).toHaveCSS('left', '20px');
    await expect(child).toHaveCSS('top', scenario.top);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect(child).toHaveCSS('width', '18px');
    await expect(child).toHaveCSS('height', '24px');
    await expect(guide).toHaveCount(1);
  });
}

for (const { travel, top, placement } of [
  { travel: 30, top: '25.12345%', placement: 'after growing the box' },
  { travel: -176, top: '128px', placement: 'after crossing the opposite edge' },
]) {
  test(`releasing Shift before drop preserves Auto height and top ${placement}`, async ({ page }) => {
    const variedSource = source.replace("top:'128px', width:'160px', height:'120px', background:'#ef4444'}} />",
      `top:'${top}', width:'160px', height:'auto', background:'#ef4444'}}><div style={{height:'64px'}} /></div>`);
    const editor = await openEditor(page, 'docked', variedSource);
    await editor.select(['rect']);
    const box = (await page.locator('[data-resize-edge="right"]').boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const child = editor.node('rect');
    const initialTop = await child.evaluate(element => getComputedStyle(element).top);
    await page.keyboard.down('Shift');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + travel, y, { steps: 12 });
    await expect(child).not.toHaveCSS('height', '64px');
    await page.keyboard.up('Shift');
    await page.mouse.up();
    await expect(child).toHaveCSS('height', '64px');
    await expect(child).toHaveCSS('top', initialTop);
    const readTop = (code: string) => code.match(/data-id="rect"[^>]*top:\s*'([^']+)'/)?.[1];
    await expect.poll(async () => readTop(await editor.getPageCode())).toBe(top);
    await expect.poll(() => editor.getPageCode()).toMatch(/data-id="rect"[^>]*height:\s*'auto'/);
  });
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

test('Option-drag duplicates a guide in one undo step', async ({ page }) => {
  const editor = await openEditor(page, 'docked');
  const rect = await editor.nodeBox('rect');
  const x = Math.round(rect.x);
  const y = Math.round(rect.y + rect.height / 2);
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await placeVerticalGuide(page, x, y);
  const guide = page.locator('[data-ruler-guide]');
  await expect(guide).toHaveCount(1);
  const original = parseRulerGuides(await editor.getPageCode());

  await page.keyboard.down('Alt');
  await page.mouse.click(x, y);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y, { steps: 8 });
  await expect(page.locator('[data-ruler-guide-preview]')).toBeVisible();
  await expect(guide).toHaveCount(1);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('[data-ruler-guide-preview]')).toHaveCount(0);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);

  const ruler = (await page.locator('[data-ruler]').nth(1).boundingBox())!;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(ruler.x + ruler.width - 8, y, { steps: 12 });
  await page.mouse.up();
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(guide).toHaveCount(2);
  const [source, copy] = parseRulerGuides(await editor.getPageCode());
  expect(source).toEqual(original[0]);
  expect(copy.id).not.toBe(source.id);
  expect(copy.position - source.position).toBeCloseTo(40, 0);
  await page.keyboard.press(`${mod}+z`);
  await expect(guide).toHaveCount(1);
  expect(parseRulerGuides(await editor.getPageCode())).toEqual(original);
});
