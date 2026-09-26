import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

describe('Gallery inspector integration', () => {
  it('routes Gallery roots through the existing LayoutTool seam instead of the central PropertiesPanel composer', () => {
    const layout = source('src/editor/tools/LayoutTool.tsx');
    expect(layout).toContain("GALLERY_VIEW_STYLE_PROPERTY");
    expect(layout).toContain('isGalleryViewId');
    expect(layout).toContain('<GalleryTool />');
    expect(layout).toContain('function StandardLayoutTool');
  });

  it('keeps normal ImageTool behavior and adds crop only as a Gallery-aware companion', () => {
    const image = source('src/editor/tools/ImageTool.tsx');
    expect(image).toContain("import GalleryImageCropTool from '../gallery/GalleryImageCropTool';");
    expect(image).toContain('<GalleryImageCropTool />');
    expect(image).toContain('<ImageSearchModal');
  });

  it('lets the object header resolve Gallery semantics without requiring PropertiesPanel changes', () => {
    const header = source('src/editor/controls/InspectorObjectHeader.tsx');
    expect(header).toContain('useControlOptional');
    expect(header).toContain('GALLERY_VIEW_STYLE_PROPERTY');
    expect(header).toContain("const semanticTitle = isGallery ? 'Gallery' : title;");
    expect(header).toContain('data-inspector-object-kind={semanticKind}');
  });

  it('does not wire Gallery directly into PropertiesPanel', () => {
    const panel = source('src/editor/PropertiesPanel.tsx');
    expect(panel).not.toContain("import GalleryTool from './tools/GalleryTool';");
    expect(panel).not.toContain('<GalleryTool />');
    expect(panel).not.toContain('<GalleryImageCropTool />');
  });

  it('keeps Gallery hardening inside native source-backed editor seams', () => {
    const tool = source('src/editor/tools/GalleryTool.tsx');
    const content = source('src/editor/gallery/GalleryContentSection.tsx');
    const view = source('src/editor/gallery/GalleryViewSection.tsx');
    const crop = source('src/editor/gallery/GalleryCropOverlay.tsx');
    const media = source('src/editor/ui/ImageSearchModal.tsx');

    expect(tool).toContain('}, [currentView, galleryId, items]);');
    expect(tool).not.toContain('}, [currentView, galleryId, items.length]);');
    expect(tool).toContain('getGalleryIndexGeometryPatch(currentView, index)');
    expect(content).toContain('role="list" aria-label="Gallery media"');
    expect(view).not.toContain('Terra Prime strip items');
    expect(crop).toContain('role="dialog"');
    expect(crop).toContain('Shift for 5%');
    expect(media).toContain('aria-live="polite"');
    expect(media).toContain('Select Unsplash image');
  });
});
