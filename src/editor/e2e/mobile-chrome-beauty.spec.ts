import { test, expect } from '@playwright/test';
import { EditorPage } from '../../canvas/drag/e2e/helpers/editor-page';

test.use({ viewport:{width:390,height:844}, hasTouch:true });
const capture = async (page: import('@playwright/test').Page, name:string) => {
  await page.waitForTimeout(350);
  await page.screenshot({path:`/tmp/field-mobile-${name}.png`});
};

test('phone main pill, sheets, Library and Settings share Field chrome at narrow sizes', async ({page}) => {
  const editor=new EditorPage(page); await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await editor.waitForStableGeometry('hero');
  await capture(page,'canvas');
  await page.getByRole('button',{name:'Open browse',exact:true}).tap();
  const browse=page.locator('[data-portrait-surface="browse"]');
  await expect(browse.locator('.field-mobile-menu-glyph [data-field-mobile-glyph]')).toHaveCount(11);
  await capture(page,'browse');
  await browse.getByRole('button',{name:/Pages Choose/}).tap();
  await capture(page,'pages');
  await page.getByRole('button',{name:'Back',exact:true}).tap();
  await browse.getByRole('button',{name:/Layers Find/}).tap();
  await capture(page,'layers');
  await page.getByRole('button',{name:'Back',exact:true}).tap();
  for (const name of ['Project','Presets','Insert','CMS','Languages','Comments','Branches']) {
    await browse.getByRole('button',{name:new RegExp('^'+name+' ')}).tap();
    await capture(page,name.toLowerCase());
    await page.locator('[data-portrait-surface]>header').getByRole('button',{name:'Back',exact:true}).tap();
  }
  await browse.getByRole('button',{name:/Library Components/}).tap();
  const library=page.locator('[data-portrait-surface="library"]');
  await expect(library).toHaveAttribute('data-mobile-full-screen','true');
  expect((await library.boundingBox())!.width).toBe(390);
  await capture(page,'library');
  await page.getByRole('button',{name:'Close Library',exact:true}).tap();
  await page.getByRole('button',{name:'Open tools',exact:true}).tap();
  await page.setViewportSize({width:320,height:740});
  const tools=page.locator('[data-portrait-surface="tools"]');
  expect(await tools.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await capture(page,'tools-320');
  await tools.getByRole('button',{name:'Close Tools',exact:true}).tap();
  await page.getByRole('button',{name:'Open settings',exact:true}).tap();
  const settings=page.locator('[data-settings-overlay]'); await expect(settings).toBeVisible();
  await capture(page,'settings-320');
  expect(await settings.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await settings.getByRole('button',{name:/^save$/i}).tap();
  await expect(settings).toHaveCount(0);
});

test('phone Media and Gallery use immersive desktop-style cards with source-backed finish', async ({page}) => {
  const editor=new EditorPage(page); await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.getByRole('button',{name:'Open browse',exact:true}).tap();
  await page.getByRole('button',{name:/Media Choose images/}).tap();
  const media=page.locator('[data-portrait-media]'); await expect(media).toBeVisible();
  await capture(page,'media-launcher');
  await media.getByRole('button',{name:/browse media your project/i}).tap();
  await expect(media).toHaveAttribute('data-mobile-full-screen','true');
  expect((await media.boundingBox())!.width).toBe(390);
  await capture(page,'media-library');
  await media.getByRole('button',{name:'Back to Media',exact:true}).tap();
  await media.getByRole('button',{name:'gallery',exact:true}).tap();
  const wizard=page.locator('[data-gallery-creation]'); await expect(wizard).toBeVisible();
  await wizard.getByRole('button',{name:'add media',exact:true}).tap();
  const picker=page.locator('[data-media-creation-content="image"]'); await expect(picker).toBeVisible();
  await expect.poll(async()=>(await page.locator('[data-field-modal-window]').boundingBox())!.width).toBeCloseTo(390,0);
  await page.keyboard.press('Escape'); await expect(wizard).toBeVisible(); await expect(picker).toHaveCount(0);
  await wizard.getByRole('button',{name:'add media',exact:true}).tap();
  await picker.locator('input[type="file"]').setInputFiles([0,1,2].map(index=>({name:`phone-${index}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="${['#26798b','#95435c','#917624'][index]}"/><circle cx="90" cy="70" r="40" fill="#e7dbca"/></svg>`)})));
  await expect(picker.locator('[data-image-multi-select-footer]')).toContainText('3 images selected');
  await capture(page,'image-picker-populated');
  await picker.getByRole('button',{name:'Add 3',exact:true}).tap();
  await expect(wizard.getByRole('listitem')).toHaveCount(3);
  await capture(page,'gallery-populated');
  await wizard.getByRole('button',{name:'Move image 3 up',exact:true}).tap();
  await wizard.getByRole('button',{name:'Remove image 1',exact:true}).tap();
  await wizard.getByRole('button',{name:'Next',exact:true}).tap(); await capture(page,'gallery-layout');
  await wizard.getByRole('button',{name:'Next',exact:true}).tap(); await capture(page,'gallery-behavior');
  await wizard.getByRole('button',{name:'Finish',exact:true}).tap();
  await expect(wizard).toHaveCount(0);
  await expect.poll(async()=> (await editor.getPageCode()).match(/--field-gallery-item/g)?.length).toBe(2);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('field:portrait-edit-selection',{detail:{clientX:180,clientY:200}})));
  const properties=page.locator('[data-portrait-surface="inspect"]');
  await expect(properties).toHaveAttribute('data-mobile-full-screen','true');
  await expect(properties.locator('[data-gallery-content]').getByRole('listitem')).toHaveCount(2);
  await capture(page,'gallery-properties');
});

test('landscape offers Float and Focus, returns to desktop preferences, and retains mobile Media', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('field:prefs:workspaceMode',JSON.stringify('docked')));
  const editor=new EditorPage(page); await editor.gotoWithSeed('ABSOLUTE_IN_FRAME');
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('[data-portrait-workspace]')).toHaveCount(0);
  const chooser=page.locator('[data-workspace-layout-control]').first();
  await chooser.locator('[data-workspace-mode-trigger]').tap();
  await expect(chooser.getByRole('button',{name:/Full layout/i})).toHaveCount(0);
  await chooser.getByRole('button',{name:/Focus layout/i}).tap();
  await expect(chooser.locator('[data-workspace-mode-trigger]')).toHaveAttribute('aria-label', /layout: focus/i);
  await capture(page,'landscape-focus');
  await chooser.locator('[data-workspace-mode-trigger]').tap();
  await chooser.getByRole('button',{name:/Float layout/i}).tap();
  await capture(page,'landscape-float');
  await page.locator('[data-toolbar-tool="media"]').tap();
  await page.locator('[data-media-launcher]').getByRole('button',{name:'gallery',exact:true}).tap();
  await expect(page.locator('[data-portrait-media]')).toHaveAttribute('data-mobile-full-screen','true');
  await capture(page,'landscape-gallery');
  await page.locator('[data-portrait-media]').getByRole('button',{name:'Done',exact:true}).tap();
  await page.setViewportSize({width:1440,height:900});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('field:prefs:workspaceMode')!))).toBe('docked');
  await capture(page,'desktop-retained');
});
