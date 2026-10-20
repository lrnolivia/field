// Auto layout reads the same in Layers and on the canvas, and a drawn text
// layer is only as tall as its text so auto-layout alignment centres it.
import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

const PAGE = `/** @canvas { "viewports": [{"id":"desktop","name":"Desktop","width":900}] } */
'use client';
export default function Page() {
  return (
    <div data-id="root" data-name="Page" style={{ position: 'relative', width: '900px', minHeight: '600px', background: '#ffffff' }}>
      <div data-id="row" data-name="Row" style={{ position: 'absolute', left: '60px', top: '60px', width: '720px', height: '240px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f1f5f9' }}>
        <p data-id="label" data-name="Label" style={{ order: 1, fontSize: '16px', lineHeight: '1.2', margin: 0 }}>Hello there</p>
        <div data-id="pic" data-name="Picture" style={{ order: 0, width: '100px', height: '80px', background: '#fb7185' }} />
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
  }, PAGE);
  const editor = new EditorPage(page);
  await page.goto('/work/local');
  await editor.node('pic').waitFor({ state: 'visible', timeout: 60_000 });
  await editor.fitCamera();
  return editor;
}

test('Layers lists an auto layout in the order the canvas lays it out', async ({ page }) => {
  const editor = await open(page);
  const canvasOrder = await Promise.all(['label', 'pic'].map(async (id) => ({ id, x: (await editor.nodeBox(id)).x })));
  canvasOrder.sort((a, b) => a.x - b.x);
  expect(canvasOrder.map((c) => c.id)).toEqual(['pic', 'label']);

  await editor.select(['pic']); // reveals the frame's children in Layers
  const rows = page.locator('[data-layer-id^="desktop:"]');
  await expect(rows.filter({ hasText: 'Picture' })).toHaveCount(1);
  const listed = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-layer-id')!.split(':')[1])
    .filter((id) => id === 'pic' || id === 'label'));
  expect(listed).toEqual(['pic', 'label']);
});

/** Drag a text box inside the row with the Text tool; returns the new text. */
async function drawText(page: Page, editor: EditorPage, text: string, fixedSize: boolean) {
  const row = await editor.nodeBox('row');
  await page.locator('[data-toolbar-tool="text"]').first().click();
  await expect(page.locator('[data-tool-hint="text"]')).toContainText('fixed-size box');
  const from = { x: row.x + 20, y: row.y + 10 };
  await page.mouse.move(from.x, from.y);
  if (fixedSize) await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(from.x + 160, from.y + 150, { steps: 8 });
  await page.mouse.up();
  if (fixedSize) await page.keyboard.up('Alt');
  await page.keyboard.type(text);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // The snapshot is keyed by id: the new text is the row's <p> that isn't Label.
  const findCreated = () => page.evaluate(() => {
    const snap = (window as any).__e2e.nodesSnapshot() as Record<string, any>;
    const hit = Object.entries(snap).find(([id, n]) => n.parentId === 'row' && n.type === 'p' && id !== 'label');
    return hit ? { id: hit[0], styles: hit[1].styles } : null;
  });
  await expect.poll(findCreated, { timeout: 15_000 }).not.toBeNull();
  return (await findCreated())!;
}

test('a plain drag with the Text tool makes an auto-size text that centres in auto layout', async ({ page }) => {
  const editor = await open(page);
  const created = await drawText(page, editor, 'Hug me', false);
  expect(created.styles.height ?? 'auto').toBe('auto');
  expect(created.styles.width ?? 'auto').toMatch(/^(auto|max-content)$/);

  const box = await editor.waitForStableGeometry(created.id).then(() => editor.nodeBox(created.id));
  const rowNow = await editor.nodeBox('row');
  const scale = await page.evaluate(() => (window as any).__e2e.cameraScale());
  // One line: 16px × 1.2 line height, in screen px at the current zoom.
  expect(box.height).toBeLessThan(16 * 1.2 * scale * 1.6);
  const rowMid = rowNow.y + rowNow.height / 2;
  expect(Math.abs(box.y + box.height / 2 - rowMid)).toBeLessThan(2);
});

test('holding the modifier while dragging draws a fixed-size text box', async ({ page }) => {
  const editor = await open(page);
  const created = await drawText(page, editor, 'Fixed', true);
  expect(created.styles.width).toMatch(/^\d+px$/);
  expect(created.styles.height).toMatch(/^\d+px$/);
  expect(parseInt(created.styles.height, 10)).toBeGreaterThan(100);
});
