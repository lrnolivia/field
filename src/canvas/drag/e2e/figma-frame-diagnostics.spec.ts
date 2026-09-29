import { test } from '@playwright/test';
import { EditorPage } from './helpers/editor-page';

test.use({ viewport: { width: 1600, height: 950 } });

async function parentOf(editor: EditorPage, id: string) {
  return editor.sandbox().locator(`[data-id="${id}"]`).first().evaluate((el) =>
    el.parentElement?.getAttribute('data-id') ?? null,
  );
}

test('DIAG frame encapsulation source plan vs render', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ENCAPSULATE_MIXED');
  await page.keyboard.press('Shift+Digit1');
  await page.waitForTimeout(500);

  const beforeIds = await editor.sandbox().locator('[data-id]').evaluateAll((els) =>
    [...new Set(els.map((e) => e.getAttribute('data-id')).filter(Boolean) as string[])],
  );
  const capBox = await editor.nodeBox('cap');
  const boxBox = await editor.nodeBox('box');
  const minX = Math.min(capBox.x, boxBox.x) - 20;
  const minY = Math.min(capBox.y, boxBox.y) - 20;
  const maxX = Math.max(capBox.x + capBox.width, boxBox.x + boxBox.width) + 20;
  const maxY = Math.max(capBox.y + capBox.height, boxBox.y + boxBox.height) + 20;

  await page.keyboard.press('f');
  await editor.dragFromTo({ x: minX, y: minY }, { x: maxX, y: maxY }, { steps: 12 });
  await page.waitForTimeout(900);

  const afterIds = await editor.sandbox().locator('[data-id]').evaluateAll((els) =>
    [...new Set(els.map((e) => e.getAttribute('data-id')).filter(Boolean) as string[])],
  );
  const added = afterIds.filter((id) => !beforeIds.includes(id));
  const code = await editor.readFile('app/page.client.tsx');
  console.log('ENCAP_DIAG', JSON.stringify({
    capParent: await parentOf(editor, 'cap'),
    boxParent: await parentOf(editor, 'box'),
    added,
    capBox,
    boxBox,
    code: code.slice(0, 7000),
  }, null, 2));
});

test('DIAG wrap centered SVG source vs time-series render', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('CENTERED_ABS_SVG');
  await page.keyboard.press('Shift+Digit1');
  await page.waitForTimeout(500);

  const before = await editor.nodeBox('star');
  await editor.select(['star'], 'desktop');
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+Alt+g');

  const samples: Array<{ t: number; box: unknown; parent: string | null }> = [];
  for (const t of [50, 250, 600, 1200, 2500]) {
    await page.waitForTimeout(t - (samples.at(-1)?.t ?? 0));
    samples.push({
      t,
      box: await editor.nodeBox('star'),
      parent: await parentOf(editor, 'star'),
    });
  }
  const code = await editor.readFile('app/page.client.tsx');
  console.log('WRAP_DIAG', JSON.stringify({ before, samples, code: code.slice(0, 7000) }, null, 2));
});
