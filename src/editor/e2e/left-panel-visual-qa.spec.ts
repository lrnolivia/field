import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1200 } });

const project = {
  format: 'revyme-v1' as const,
  files: {
    'app/page.tsx': `import PageClient from './page.client';
export const metadata = {};
export default function Page() { return <PageClient />; }`,
    'app/page.client.tsx': `'use client';
import Card from '../components/Card';
import team from '@/cms/team.json';

export default function Page() {
  return (
    <main data-id="root" data-name="Page" style={{
      width: '1280px', minHeight: '1200px', padding: '48px',
      background: '#171717', color: '#f4f4f4',
    }}>
      <h1 data-id="heading" data-name="Heading" style={{ fontSize: '48px', margin: 0 }}>field left panel QA</h1>
      <Card data-id="card" />
      <section data-id="team" data-name="Team" data-collection-list="team">
        {team.map((item) => <p data-id="member" key={item._id}>{item.name}</p>)}
      </section>
    </main>
  );
}`,
    'components/Card.tsx': `'use client';
export default function Card(props: any) {
  return <div {...props} data-name="Card" style={{
    width: '360px', minHeight: '120px', marginTop: '28px',
    border: '1px solid #555', borderRadius: '14px', background: '#242424',
  }} />;
}`,
    'cms/team.schema.json': '{"slug":"team","name":"Team","fields":[{"id":"name","name":"Name","type":"text"}]}',
    'cms/team.json': '[{"_id":"1","_slug":"ada","_status":"published","name":"Ada"},{"_id":"2","_slug":"grace","_status":"published","name":"Grace"}]',
  },
};

const routes = [
  'layers',
  'insert',
  'library',
  'presets',
  'media',
  'locale',
  'cms',
  'branches',
  'vibe',
] as const;

type Route = (typeof routes)[number];
type Theme = 'dark' | 'light';

async function seed(page: Page) {
  await page.addInitScript(({ data }) => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
    localStorage.setItem('field:prefs:workspaceMode', JSON.stringify('docked'));
    localStorage.setItem('field:prefs:dockedLeftOpen:v1', JSON.stringify(true));
    localStorage.setItem('revyme:prefs:neutralLevel', JSON.stringify('3'));
  }, { data: project });
}

async function show(page: Page, route: Route, theme: Theme, contrast: number) {
  await page.evaluate(({ route, theme, contrast }) => {
    localStorage.setItem('field:prefs:leftLastPanel', JSON.stringify(route));
    localStorage.setItem('revyme:prefs:themeMode', JSON.stringify(theme));
    localStorage.setItem('field:prefs:interfaceContrast', JSON.stringify(contrast));
    localStorage.setItem('field:prefs:dockedLeftOpen:v1', JSON.stringify(true));
  }, { route, theme, contrast });

  await page.reload();
  const sandbox = page.frameLocator('iframe[src*="5174"]');
  await sandbox.locator('[data-content-root]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await sandbox.locator('[data-viewport]').first().waitFor({ state: 'attached', timeout: 30_000 });

  const panel = page.locator('[data-editor-panel="left-primary"]').first();
  await panel.waitFor({ state: 'visible', timeout: 30_000 });
  await expect(panel).toHaveAttribute('data-left-panel-surface', route);
  await page.waitForTimeout(250);
}

async function capture(page: Page, name: string) {
  const panel = page.locator('[data-editor-panel="left-primary"]').first();
  const metrics = await panel.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const root = document.documentElement;
    const labels = el.querySelectorAll('[data-field-chrome-section-label]').length;
    const rows = el.querySelectorAll('[data-field-chrome-row]').length;
    const searches = el.querySelectorAll('[data-field-searchbar]').length;
    const emptyStates = el.querySelectorAll('[data-field-empty-state]').length;
    return {
      route: el.getAttribute('data-left-panel-surface'),
      theme: root.dataset.themeMode,
      neutral: root.dataset.neutralLevel,
      contrast: root.dataset.interfaceContrast,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      background: cs.backgroundColor,
      borderRight: cs.borderRightColor,
      labels,
      rows,
      searches,
      emptyStates,
      overflowX: el.scrollWidth > el.clientWidth + 1,
    };
  });

  expect(metrics.width).toBeGreaterThanOrEqual(220);
  expect(metrics.overflowX).toBe(false);
  console.log('FIELD_LEFT_QA_METRICS:' + name + ':' + JSON.stringify(metrics));
  const image = await panel.screenshot({ type: 'jpeg', quality: 64 });
  console.log('FIELD_LEFT_QA_IMAGE:' + name + ':' + image.toString('base64'));
}

test('left-panel chrome route and contrast matrix', async ({ page }) => {
  test.setTimeout(180_000);
  await seed(page);
  await page.goto('/work/local');

  for (const route of routes) {
    for (const contrast of [0, 28, 100]) {
      await show(page, route, 'dark', contrast);
      await capture(page, `${route}-dark-c${contrast}`);
    }
  }

  for (const route of routes) {
    await show(page, route, 'light', 28);
    await capture(page, `${route}-light-c28`);
  }
});
