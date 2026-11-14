import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test('Gallery creation shares Media cards and keeps explicit selection, order and finish', async ({ page }) => {
  const source = `/** @canvas { "viewports": [{"id":"desktop","width":1440}] } */
'use client';
export default function Page(){return <div data-id="root" data-name="Page" style={{width:'1440px',minHeight:'900px',padding:'80px'}}><div data-id="gallery" data-name="Gallery" role="region" aria-label="Test gallery" style={{'--field-gallery-view':'grid',display:'grid',width:'800px',height:'300px'}} /></div>;}`;
  await page.addInitScript(code => {
    localStorage.setItem('revyme-project-local', JSON.stringify({ format:'revyme-v1', files:{ 'app/page.client.tsx':code, 'app/page.tsx':"import PageClient from './page.client';export default function Page(){return <PageClient/>;}" }}));
    localStorage.setItem('revyme-onboarding-completed','true');
  }, source);
  await page.goto('/work/local');
  const editor = new EditorPage(page);
  await editor.waitForStableGeometry('gallery');
  await editor.select(['root']);
  await page.locator('[data-toolbar-tool="media"]').click();
  await page.locator('[data-media-launcher]').getByRole('button', { name:'gallery', exact:true }).click();
  const wizard = page.locator('[data-gallery-creation]');
  await expect(wizard).toBeVisible();
  await expect(wizard.locator('[data-field-section-glyph] svg')).toBeVisible();
  await wizard.getByRole('button', { name:'add media', exact:true }).click();
  const picker = page.locator('[data-media-creation-content="image"]');
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(wizard).toBeVisible();
  await wizard.getByRole('button', { name:'add media', exact:true }).click();
  await expect(picker).toBeVisible();
  const files = [0,1,2].map(index => ({ name:`gallery-${index}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="${['#26798b','#95435c','#917624'][index]}"/><circle cx="95" cy="72" r="43" fill="#e7dbca"/><path d="M0 180L80 112L142 157L194 93L240 180" fill="#202632"/></svg>`) }));
  await picker.locator('input[type="file"]').setInputFiles(files);
  await expect(picker.locator('[data-image-multi-select-footer]')).toContainText('3 images selected');
  await picker.getByRole('button', { name:'Add 3', exact:true }).click();
  await expect(wizard.getByRole('listitem')).toHaveCount(3);
  await expect.poll(() => wizard.locator('[role="list"] img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await wizard.getByRole('button', { name:'Move image 3 up',exact:true }).click();
  await wizard.getByRole('button', { name:'Remove image 1',exact:true }).click();
  await expect(wizard.getByRole('listitem')).toHaveCount(2);
  await wizard.getByRole('button', { name:'Next',exact:true }).click();
  const layout = wizard.getByRole('button', { name: 'Initial Gallery view' });
  await layout.click();
  const layoutMenu = page.getByRole('listbox', { name: 'Initial Gallery view' });
  await expect(layoutMenu).toBeVisible();
  await layout.press('Escape');
  await expect(layoutMenu).toHaveCount(0);
  await expect(wizard).toBeVisible();
  await layout.click();
  await layoutMenu.getByRole('option', { name: 'Carousel', exact: true }).click();
  await expect(wizard.getByRole('img', { name: 'Gallery carousel preview', exact: true })).toBeVisible();
  await wizard.getByRole('button', { name:'Next',exact:true }).click();
  await wizard.getByRole('button', { name: 'Initial Gallery media fit' }).click();
  await page.getByRole('listbox', { name: 'Initial Gallery media fit' })
    .getByRole('option', { name: 'Contain', exact: true }).click();
  await wizard.getByRole('button', { name:'Finish',exact:true }).click();
  await expect(wizard).toHaveCount(0);
  await expect.poll(async()=> (await editor.getPageCode()).match(/--field-gallery-item/g)?.length).toBe(2);
  const content=page.locator('[data-gallery-content]');
  await expect(content.getByRole('listitem')).toHaveCount(2);

  await page.getByRole('button', { name: 'preview', exact: true }).click();
  const preview = page.locator('[data-preview-overlay] iframe').contentFrame();
  const gallery = preview.getByRole('region', { name: 'Gallery', exact: true });
  await expect(gallery).toBeVisible();
  const firstImage = gallery.locator('img').first();
  await expect(firstImage).toHaveAttribute('alt', '');
  await expect(firstImage).toHaveCSS('object-fit', 'contain');
  const next = gallery.getByRole('link', { name: 'Next image', exact: true }).first();
  const targetId = (await next.getAttribute('href'))?.slice(1);
  expect(targetId).toBeTruthy();
  await next.click();
  await expect.poll(() => gallery.evaluate(node => Math.abs(node.scrollWidth - node.clientWidth - node.scrollLeft))).toBeLessThan(2);
  await gallery.locator(`[id="${targetId}"]`).getByRole('link', { name: 'Previous image', exact: true }).click();
  await expect.poll(() => gallery.evaluate(node => Math.abs(node.scrollLeft))).toBeLessThan(2);
});

test('sidebar Gallery creates a visible page child without a selection', async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.select([]);
  await page.locator('[data-tutorial="media-button"]').click();
  await page.locator('[data-media-gallery-entry]').click();
  const wizard = page.getByRole('dialog', { name: /^gallery$/i });
  await wizard.getByRole('button', { name: /^add media$/i }).click();
  const picker = page.getByRole('dialog', { name: /^images$/i });
  await picker.locator('input[type="file"]').setInputFiles({
    name: 'gallery-grid.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="teal"/></svg>'),
  });
  await picker.getByRole('button', { name: 'Add 1', exact: true }).click();
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(wizard).not.toBeVisible();
  const canvasGallery = editor.node('root').getByRole('region', { name: 'Gallery', exact: true });
  await expect(canvasGallery).toBeVisible();
  await expect(canvasGallery).not.toHaveCSS('position', 'absolute');
  await expect.poll(() => canvasGallery.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'preview', exact: true }).click();
  const preview = page.locator('[data-preview-overlay] iframe').contentFrame();
  await expect(preview.getByRole('region', { name: 'Gallery', exact: true }).locator('img')).toBeVisible();
});
