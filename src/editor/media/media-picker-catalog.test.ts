import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('picker Media catalog integration', () => {
  it('routes Image picker file uploads through shared ingest', () => {
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    expect(image).toContain('ingestMediaFile');
    expect(image).toContain("idPrefix: 'image-picker'");
    expect(image).toContain('rememberAsset: rememberMediaAsset');
    expect(image).not.toContain('await backend.uploadAsset(projectId, file)');
  });

  it('uses backend-neutral uploaded-image inventory', () => {
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    expect(image).toContain("backend.listAssets(getProjectId(), 'image')");
    expect(image).toContain('sessionMediaAssets');
    expect(image).not.toContain('/api/upload?websiteId=');
  });

  it('registers remote Image selections as external Media without duplicating uploaded rows', () => {
    const image = read('src/editor/ui/ImageSearchModal.tsx');
    expect(image).toContain("mediaAssetFromExternalUrl(url, 'image')");
    expect(image).toContain('if (uploads.some((item) => item.url === url)) return');
    expect(image).toContain('selectedUrls.forEach(registerExternalImage)');
  });

  it('routes Video upload through shared ingest and remote picks through external Media', () => {
    const video = read('src/editor/ui/VideoSearchModal.tsx');
    expect(video).toContain('ingestMediaFile');
    expect(video).toContain("idPrefix: 'video-picker'");
    expect(video).toContain('handleSelect(result.url, false)');
    expect(video).toContain("mediaAssetFromExternalUrl(url, 'video')");
    expect(video).not.toContain('backend.uploadAsset');
  });

  it('models external references explicitly rather than calling them uploads', () => {
    const system = read('src/editor/media/media-system.ts');
    const ingest = read('src/editor/media/media-ingest.ts');
    expect(system).toContain("'external'");
    expect(ingest).toContain("source: MediaAsset['source'] = 'external'");
    expect(ingest).toContain("id: 'external:' + kind + ':' + url");
  });
});
