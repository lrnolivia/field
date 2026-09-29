import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1800 } });

const IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAyCAIAAABET8urAAAAcklEQVR4nOXOMQHAMBCAQIqWeoqK+orFbHWRHzgD8Jy9mfC9a6QrMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRLj9MBtPy+eA5U8gxfjAAAAAElFTkSuQmCC';

const project = {
  format: 'revyme-v1' as const,
  files: {
    'app/page.tsx': `import PageClient from './page.client';
export const metadata = {};
export default function Page() { return <PageClient />; }`,
    'app/page.client.tsx': `/** @canvas { "viewports": [{"id":"desktop","width":1280}] } */
'use client';
import Card from '../components/Card';
import FilmGrain from '../components/FilmGrain';
import team from '@/cms/team.json';
import { useState } from 'react';

const IMG = '${IMG}';

export default function Page() {
  const [overlayOpen, setOverlayOpen] = useState(true);
  return (
    <div data-id="root" data-name="Page" style={{
      width: '1280px', minHeight: '1500px', background: '#161616',
      display: 'flex', flexDirection: 'column', gap: '28px', padding: '40px',
      color: '#f4f4f4',
    }}>
      <div data-id="box" data-name="Plain frame" style={{
        width: '500px', height: '140px', background: '#242424',
        border: '1px solid #555', borderRadius: '14px', boxShadow: '0 10px 28px rgba(0,0,0,.28)',
      }} />

      <div data-id="frame" data-name="Auto frame" style={{
        width: '720px', minHeight: '220px', background: '#20252a',
        display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px',
        borderRadius: '18px', overflow: 'hidden',
      }}>
        <p data-id="text" data-name="Headline" style={{
          margin: 0, color: '#f3efe7', fontSize: '38px', fontWeight: 650,
          lineHeight: '1.08', letterSpacing: '-0.02em',
        }}>field inspector visual QA</p>
        <p data-id="body" data-name="Body" style={{
          margin: 0, color: '#aeb6be', fontSize: '15px', lineHeight: '1.5',
        }}>A compact node used to verify typography, fills, layout, effects and card rhythm.</p>
      </div>

      <img data-id="image" data-name="Image" src={IMG} alt="" style={{
        width: '360px', height: '225px', objectFit: 'cover', borderRadius: '16px',
        border: '2px solid #6d7680',
      }} />

      <svg data-id="svg" data-name="Vector" viewBox="0 0 160 100" style={{
        width: '320px', height: '200px', color: '#ffb86b', display: 'block',
      }}>
        <path d="M10 80 L80 10 L150 80 Z" fill="currentColor" stroke="#fff" strokeWidth="4" />
      </svg>

      <Card data-id="component" title="Design component" accent="#75d7c7" />
      <FilmGrain data-id="code-component" intensity={0.62} accentColor="#f79d84" />

      <video data-id="video" data-name="Video" controls style={{
        width: '420px', height: '236px', background: '#111', borderRadius: '12px',
      }} />

      <audio data-id="audio" data-name="Audio" controls style={{
        width: '420px',
      }} />

      <form data-id="form" data-name="Form" action="/submit" method="post" style={{
        width: '420px', padding: '18px', display: 'flex', flexDirection: 'column',
        gap: '12px', border: '1px solid #555', borderRadius: '12px',
      }}>
        <input data-id="input" data-name="Input" name="email" type="email"
          placeholder="name@example.com" required style={{
            height: '38px', padding: '0 10px', background: '#202020', color: '#fff',
            border: '1px solid #555', borderRadius: '8px',
          }} />
      </form>

      <a data-id="link" data-name="Link" href="#target" style={{
        color: '#8ac7ff', fontSize: '16px', textDecoration: 'underline',
      }}>Navigation link</a>
      <div data-id="target" data-name="Target" style={{ height: '20px' }} />

      <div data-id="collection-list" data-name="Collection list" data-collection-list="team" style={{
        width: '420px', padding: '14px', display: 'flex', flexDirection: 'column',
        gap: '10px', background: '#202020', borderRadius: '12px',
      }}>
        {team.map((item, idx) => (
          <div data-id="collection-row" data-name="Row" key={idx} style={{
            minHeight: '44px', padding: '10px', background: '#2b2b2b', borderRadius: '8px',
          }}>
            <p data-id="collection-name" style={{ margin: 0, color: '#fff' }}>{item.name}</p>
          </div>
        ))}
      </div>

      <button data-id="overlay-trigger" data-name="Overlay trigger"
        data-overlay-trigger='{"trigger":"click"}'
        onClick={() => setOverlayOpen(!overlayOpen)}
        style={{ width: '180px', height: '40px' }}>Overlay trigger</button>
      {overlayOpen && (
        <div data-id="overlay" data-name="Overlay"
          data-overlay='{"type":"relative","triggerId":"overlay-trigger","side":"bottom","align":"center","offsetX":0,"offsetY":8}'
          style={{
            position: 'absolute', width: '240px', height: '120px',
            background: '#27323a', border: '1px solid #6688aa', borderRadius: '12px',
          }} />
      )}
    </div>
  );
}`,
    'components/Card.tsx': `'use client';
/** @pageVariables { "variables": [
  { "name":"title","type":"text","default":"Design component" },
  { "name":"accent","type":"color","default":"#75d7c7" }
] } */
export default function Card({ title = 'Design component', accent = '#75d7c7', ...props }: any) {
  return (
    <div {...props} style={{
      width: '420px', minHeight: '130px', padding: '22px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderRadius: '16px', border: '1px solid ' + accent,
      background: '#202020', color: '#fff',
    }}>
      <strong style={{ color: accent, fontSize: '18px' }}>{title}</strong>
      <span style={{ color: '#a6a6a6', fontSize: '13px' }}>Component instance properties</span>
    </div>
  );
}`,
    'cms/team.schema.json': '{"slug":"team","name":"Team","fields":[{"id":"name","name":"Name","type":"text"}]}',
    'cms/team.json': '[{"_id":"1","_slug":"one","_status":"published","name":"Ada"},{"_id":"2","_slug":"two","_status":"published","name":"Grace"}]',
    'components/FilmGrain.tsx': `'use client';
/** @controls {
  "intensity": { "type":"slider", "label":"Intensity", "default":0.5, "min":0, "max":1, "step":0.01 },
  "accentColor": { "type":"color", "label":"Accent Color", "default":"#f79d84" },
  "enabled": { "type":"toggle", "label":"Enabled", "default":true }
} */
export default function FilmGrain({ intensity = 0.5, accentColor = '#f79d84', enabled = true, ...props }: any) {
  return (
    <div {...props} style={{
      width: '420px', minHeight: '120px', padding: '20px',
      borderRadius: '16px', border: '1px solid #555',
      background: enabled ? '#252525' : '#1d1d1d',
      color: accentColor, opacity: 0.65 + Number(intensity) * 0.35,
    }}>Code component</div>
  );
}`,
  },
};

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
  const image = await panel.screenshot({ type: 'jpeg', quality: 64 });
  console.log('FIELD_QA_IMAGE:' + name + ':' + image.toString('base64'));
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

  // Prototype is a separate Inspector stack. A normal frame exercises
  // Interactions, Navigation, Overlay and Animation together.
  await select(page, ['box']);
  await page.getByRole('tab', { name: /prototype/i }).click();
  await page.waitForTimeout(250);
  await capture(page, 'prototype-frame-dark');

  // An authored overlay takes the active Overlay path rather than the add state.
  await select(page, ['overlay']);
  await capture(page, 'prototype-overlay-dark');

  // Return to Design before the remaining Design-state checks.
  await page.getByRole('tab', { name: /design/i }).click();
  await page.waitForTimeout(200);

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
  expect(expanded.bottom).toBeCloseTo(expanded.toolbarBottom, 0);

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
  expect(window.innerHeight - (compactBox.y + compactBox.height)).toBeCloseTo(expanded.toolbarBottom, 0);
});
