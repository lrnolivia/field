import { describe, expect, it } from 'vitest';
import {
  parsePageAppearanceDocument,
  patchPageAppearance,
  removePageAppearance,
  serializePageAppearanceDocument,
} from './page-appearance-config';

describe('page appearance config', () => {
  it('fails safely on missing and malformed project metadata', () => {
    expect(parsePageAppearanceDocument(null)).toEqual({ pages: {} });
    expect(parsePageAppearanceDocument('{oops')).toEqual({ pages: {} });
    expect(parsePageAppearanceDocument('{"pages":[]}')).toEqual({ pages: {} });
  });

  it('keeps appearance scoped by file identity', () => {
    let doc = parsePageAppearanceDocument(null);
    doc = patchPageAppearance(doc, 'app/page.client.tsx', { background: '#112233', opacity: 80 });
    doc = patchPageAppearance(doc, 'app/about/page.client.tsx', { background: '#ffffff', visible: false });
    expect(doc.pages['app/page.client.tsx']).toEqual({ background: '#112233', opacity: 80 });
    expect(doc.pages['app/about/page.client.tsx']).toEqual({ background: '#ffffff', visible: false });
  });

  it('clamps opacity and reset removes only the active page entry', () => {
    let doc = patchPageAppearance({ pages: {} }, 'a', { background: '#000000', opacity: 140 });
    doc = patchPageAppearance(doc, 'b', { visible: false });
    expect(doc.pages.a.opacity).toBe(100);
    doc = removePageAppearance(doc, 'a');
    expect(doc.pages.a).toBeUndefined();
    expect(doc.pages.b).toEqual({ visible: false });
  });

  it('round-trips valid metadata deterministically', () => {
    const doc = { pages: { 'app/page.client.tsx': { background: '#abcdef', opacity: 72, visible: true } } };
    expect(parsePageAppearanceDocument(serializePageAppearanceDocument(doc))).toEqual(doc);
  });
});
