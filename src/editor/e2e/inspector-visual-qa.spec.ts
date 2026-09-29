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

const IMG = '${IMG}';

export default function Page() {
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
  ];

  for (const [name, ids] of states) {
    await select(page, ids);
    await capture(page, name);
  }

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
