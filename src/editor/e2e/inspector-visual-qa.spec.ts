import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1800 } });

import { project } from './inspector-project';

async function boot(page: Page, mode: 'dark' | 'light') {
  await page.addInitScript(({ data, mode }) => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(mode));
    localStorage.setItem('revyme:prefs:neutralLevel', JSON.stringify('3'));
  }, { data: project, mode });

  await page.goto('/work/local');
  const sandbox = page.frameLocator('iframe[src*="5174"]');
  await sandbox.locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await sandbox.locator('[data-viewport]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await page.locator('[data-properties-panel]').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(400);
}

async function select(page: Page, ids: string[]) {
  await page.evaluate((selected) => (window as any).__e2e.select(selected), ids);
  await page.waitForTimeout(350);
}

async function capture(page: Page, name: string) {
  const panel = page.locator('[data-properties-panel]').first();
  await expect(panel).toBeVisible();

  const metrics = await panel.evaluate((el) => {
    const panelRect = el.getBoundingClientRect();
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-inspector-section-card]')).map((card) => {
      const r = card.getBoundingClientRect();
      const cs = getComputedStyle(card);
      const header = card.querySelector<HTMLElement>('[data-inspector-section-header]');
      const content = card.querySelector<HTMLElement>('[data-inspector-section-content]');
      const contentStyle = content ? getComputedStyle(content) : null;
      return {
        title: card.dataset.inspectorSectionTitle || card.dataset.inspectorSection || '',
        kind: card.dataset.inspectorSectionKind || '',
        x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height),
        radius: cs.borderRadius,
        border: cs.borderColor,
        background: cs.backgroundColor,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        contentGap: contentStyle?.gap || null,
        clippedX: r.left < panelRect.left - 1 || r.right > panelRect.right + 1,
        overflowX: card.scrollWidth > card.clientWidth + 1,
      };
    });
    return {
      mode: document.documentElement.dataset.themeMode,
      neutral: document.documentElement.dataset.neutralLevel,
      panelWidth: Math.round(panelRect.width),
      panelHeight: Math.round(panelRect.height),
      cardCount: cards.length,
      cards,
    };
  });

  console.log('FIELD_QA_METRICS:' + name + ':' + JSON.stringify(metrics));
  await panel.screenshot({ path: `/tmp/field-review-${name}.png` });
}

test('Inspector category cards visual sweep', async ({ page }) => {
  await boot(page, 'dark');

  const states: Array<[string, string[]]> = [
    ['plain-frame-dark', ['box']],
    ['auto-layout-dark', ['frame']],
    ['text-dark', ['text']],
    ['image-dark', ['image']],
    ['svg-dark', ['svg']],
    ['component-dark', ['component']],
    ['code-component-dark', ['code-component']],
    ['selection-colors-dark', ['box', 'text']],
    ['viewport-root-dark', ['root']],
    ['video-dark', ['video']],
    ['audio-dark', ['audio']],
    ['form-dark', ['form']],
    ['input-dark', ['input']],
    ['collection-list-dark', ['collection-list']],
    ['overlay-design-dark', ['overlay']],
  ];

  for (const [name, ids] of states) {
    await select(page, ids);

    if (name === 'code-component-dark') {
      await expect(
        page.locator('[data-properties-panel] [data-inspector-section-card]').first(),
      ).toHaveAttribute('data-inspector-section', 'component');
    }

    if (name === 'svg-dark') {
      await expect(
        page.locator('[data-properties-panel] [data-inspector-section="export"]'),
      ).toBeVisible();
    }

    await capture(page, name);
  }

  // Exercise nested Advanced cards, which is where web-specific Inspector
  // categories live. This catches card-inside-card spacing and density drift.
  await select(page, ['box']);
  const advancedHeader = page.locator(
    '[data-properties-panel] [data-inspector-section="advanced"] [data-inspector-section-header] button',
  ).first();
  await advancedHeader.click();
  await page.waitForTimeout(250);
  await capture(page, 'advanced-expanded-dark');

  // Working behavior controls now belong to the unified Inspector.
  await select(page, ['box']);
  await expect(page.getByRole('tab', { name: /prototype/i })).toHaveCount(0);
  await expect(page.locator('[data-inspector-group="behavior"]')).toHaveCount(1);
  await page.waitForTimeout(250);
  await capture(page, 'behavior-frame-dark');

  // An authored overlay takes the active Overlay path rather than the add state.
  await select(page, ['overlay']);
  await capture(page, 'behavior-overlay-dark');


  // No selection is still an Inspector surface: Route / SEO / Social /
  // Search engines should use the same compact category-card grammar.
  await select(page, []);
  await capture(page, 'page-settings-dark');

  // Exercise the actual collapsed-card state on the auto-layout selection.
  await select(page, ['frame']);
  const firstCardHeader = page.locator('[data-properties-panel] [data-inspector-section-card] [data-inspector-section-header] button').first();
  if (await firstCardHeader.count()) {
    await firstCardHeader.click();
    await page.waitForTimeout(250);
    await capture(page, 'auto-layout-collapsed-dark');
  }
});

test('Inspector category cards light-mode spot check', async ({ page }) => {
  await boot(page, 'light');
  await select(page, ['frame']);
  await capture(page, 'auto-layout-light');
});


test('floating Inspector honors toolbar alignment and hard viewport margins', async ({ page }) => {
  await page.addInitScript(({ data }) => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('floating'));
    localStorage.setItem('field:prefs:rightFloatingHeight', JSON.stringify(680));
  }, { data: project });

  await page.goto('/work/local');
  const sandbox = page.frameLocator('iframe[src*="5174"]');
  await sandbox.locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await sandbox.locator('[data-viewport]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await select(page, ['frame']);

  const header = page.locator('[data-workspace-right-header]').first();
  const body = page.locator('[data-workspace-right-body]').first();
  const toolbar = page.locator('#bottom-toolbar-container').first();
  await expect(header).toBeVisible();
  await expect(body).toBeVisible();
  await expect(toolbar).toBeVisible();

  const island = page.locator('[data-workspace-island="right"]').first();
  await expect(island).toBeVisible();
  const floatChrome = await island.evaluate(el => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, radius: style.borderRadius, shadow: style.boxShadow };
  });
  expect(floatChrome.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(parseFloat(floatChrome.radius)).toBeGreaterThanOrEqual(7);
  expect(floatChrome.shadow).not.toBe('none');

  await page.waitForTimeout(450);
  const expanded = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-workspace-right-header]')!.getBoundingClientRect();
    const body = document.querySelector<HTMLElement>('[data-workspace-right-body]')!.getBoundingClientRect();
    const toolbar = document.querySelector<HTMLElement>('#bottom-toolbar-container')!.getBoundingClientRect();
    return {
      top: header.top,
      right: window.innerWidth - header.right,
      bottom: window.innerHeight - body.bottom,
      toolbarBottom: window.innerHeight - toolbar.bottom,
      left: header.left,
      width: header.width,
    };
  });

  expect(expanded.top).toBeGreaterThanOrEqual(12);
  expect(expanded.right).toBeGreaterThanOrEqual(12);
  expect(expanded.bottom).toBeCloseTo(18, 0);

  const drag = page.locator('[data-right-pane-drag-handle]').first();
  const box = await drag.boundingBox();
  if (!box) throw new Error('missing right Inspector drag handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(-500, -500, { steps: 8 });
  await page.mouse.up();

  const afterDrag = await header.boundingBox();
  if (!afterDrag) throw new Error('floating Inspector disappeared after drag');
  expect(afterDrag.x).toBeGreaterThanOrEqual(11.5);
  expect(afterDrag.y).toBeGreaterThanOrEqual(11.5);

  const collapse = page.locator('[data-workspace-collapse][data-side="right"]').first();
  await collapse.click();
  const compact = page.locator('[data-workspace-right-toggle]').first();
  await expect(compact).toBeVisible();
  const compactBox = await compact.boundingBox();
  if (!compactBox) throw new Error('missing compact floating Inspector');
  expect(compactBox.y).toBeGreaterThanOrEqual(11.5);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(viewportHeight - (compactBox.y + compactBox.height)).toBeCloseTo(18, 0);

  // The compact Inspector should visually mirror the left command rail:
  // same 52px shell width, 32px primary controls, and a 10px optical inset.
  const leftRail = page.locator('[data-left-menu-rail]').first();
  const leftRailBox = await leftRail.boundingBox();
  const designButton = await compact.getByRole('button', { name: /open design inspector/i }).boundingBox();
  if (!leftRailBox || !designButton) throw new Error('missing rail geometry for symmetry check');

  expect(compactBox.width).toBeCloseTo(leftRailBox.width, 0);
  expect(compactBox.width).toBeCloseTo(52, 0);
  expect(designButton.width).toBeCloseTo(32, 0);
  expect((compactBox.width - designButton.width) / 2).toBeCloseTo(10, 0);

  console.log('FIELD_QA_RAIL_GEOMETRY:' + JSON.stringify({
    leftWidth: leftRailBox.width,
    rightWidth: compactBox.width,
    designWidth: designButton.width,
    rightInset: (compactBox.width - designButton.width) / 2,
  }));

  // Short windows must behave like the left command rail: the middle tools
  // yield/scroll first while the auto-hide + expand controls remain visible.
  for (const height of [620, 440]) {
    await page.setViewportSize({ width: 1000, height });
    await page.waitForTimeout(180);

    const shell = await compact.boundingBox();
    const main = await page.locator('[data-inspector-compact-main-tools]').first().boundingBox();
    const actions = await page.locator('[data-inspector-compact-actions]').first().boundingBox();
    if (!shell || !main || !actions) throw new Error(`missing compact Inspector geometry at ${height}px`);

    expect(actions.y).toBeGreaterThanOrEqual(shell.y - 0.5);
    expect(actions.y + actions.height).toBeLessThanOrEqual(shell.y + shell.height + 0.5);
    expect(main.y + main.height).toBeLessThanOrEqual(actions.y + 0.5);

    await expect(page.locator('[data-inspector-compact-actions] [data-workspace-autohide]').first()).toBeVisible();
    await expect(page.locator('[data-inspector-compact-actions] [data-workspace-collapse]').first()).toBeVisible();

    const overflow = await page.locator('[data-inspector-compact-main-tools]').first().evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));
    expect(overflow.clientHeight).toBeGreaterThan(0);
    expect(overflow.scrollHeight).toBeGreaterThanOrEqual(overflow.clientHeight);
  }
});
