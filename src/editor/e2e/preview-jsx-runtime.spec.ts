import { expect, test, type Page } from '@playwright/test';
import { SEEDS } from '../../canvas/drag/e2e/fixtures/seeds';

async function openPreview(page: Page, pageSource?: string, layoutSource?: string) {
  const seed = structuredClone(SEEDS.ABSOLUTE_IN_FRAME);
  if (pageSource) seed.files['app/page.client.tsx'] = pageSource;
  if (layoutSource) seed.files['app/layout.tsx'] = layoutSource;
  await page.addInitScript(data => {
    localStorage.setItem('revyme-project-local', JSON.stringify(data));
    localStorage.setItem('revyme-onboarding-completed', 'true');
  }, seed);
  await page.goto('/work/local');
  const warnings: string[] = [];
  page.on('console', message => {
    if (message.text().includes('unique "key" prop')) warnings.push(message.text());
  });
  await page.getByRole('button', { name: 'preview', exact: true }).click();
  return { frame: page.frameLocator('[data-preview-overlay] iframe'), warnings };
}

test('Preview renders static siblings and document wrappers without missing-key warnings', async ({ page }) => {
  const { frame, warnings } = await openPreview(page, `
    import { jsxDEV } from 'react/jsx-dev-runtime';

    export default function StaticPage() {
      return <main data-id="root">
        <span>First static child</span>
        <span>Second static child</span>
        <input data-id="preview-void" aria-label="Demo input"><span>Stray child</span></input>
        {jsxDEV('section', { children: [<span>First dev child</span>, <span>Second dev child</span>] }, undefined, true)}
        <ul>{['first', 'second'].map(item => <li key={item}>{item}</li>)}</ul>
      </main>;
    }
  `, `
    import { Providers } from './providers';

    export default function RootLayout({ children }) {
      return <html className="preview-layout">
        <body style={{ color: 'purple' }}><header>Layout header</header><Providers>{children}</Providers></body>
      </html>;
    }
  `);
  await expect(frame.locator('html')).toHaveClass(/\bpreview-layout\b/);
  await expect(frame.locator('body')).toHaveCSS('color', 'rgb(128, 0, 128)');
  await expect(frame.getByText('Layout header')).toBeVisible();
  await expect(frame.getByText('First static child')).toBeVisible();
  await expect(frame.getByText('Second static child')).toBeVisible();
  await expect(frame.getByText('First dev child')).toBeVisible();
  await expect(frame.getByText('Second dev child')).toBeVisible();
  await expect(frame.getByRole('textbox', { name: 'Demo input' })).toBeVisible();
  await expect(frame.getByText('Stray child')).toHaveCount(0);
  await expect(frame.getByRole('listitem')).toHaveCount(2);
  expect(warnings).toEqual([]);
});

test('Preview diagnoses a truly unkeyed dynamic list', async ({ page }) => {
  const { frame, warnings } = await openPreview(page, `
    export default function DynamicPage() {
      return <ul data-id="root">{['first', 'second'].map(item => <li>{item}</li>)}</ul>;
    }
  `);
  await expect(frame.getByRole('listitem')).toHaveCount(2);
  await expect.poll(() => warnings.length).toBeGreaterThan(0);
});
