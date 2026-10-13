import { describe, expect, it } from 'vitest';
import { filterDocumentSearch, indexPageSource } from './document-search-index';

const source = `export default function Page() { return <div data-id="root" data-name="Page"><section data-id="section" data-name="Hero"><p data-id="title" data-name="Headline">Searchable painter</p><p>No stable ID</p></section><Card data-id="card" data-name="Shared card" /></div>; }`;

describe('project document search', () => {
  it('keeps duplicate layer names distinct by source page and ancestry', () => {
    const items = [...indexPageSource('app/page.client.tsx', source, 'Home'), ...indexPageSource('app/about/page.client.tsx', source, 'About')];
    const results = filterDocumentSearch(items, 'HEADLINE');
    expect(results.map(item => item.file)).toEqual(['app/about/page.client.tsx', 'app/page.client.tsx']);
    expect(new Set(results.map(item => item.key)).size).toBe(2);
    expect(results[0].context).toContain('About / app/about/page.client.tsx / Page / Hero');
    expect(results.every(item => item.nodeId === 'title')).toBe(true);
  });
  it('matches text content and multiple terms without changing the source', () => {
    const original = source;
    const items = indexPageSource('app/page.client.tsx', source, 'Home');
    expect(filterDocumentSearch(items, 'HOME painter').map(item => item.nodeId)).toEqual(['title']);
    expect(filterDocumentSearch(items, '  ')).toEqual([]);
    expect(filterDocumentSearch(items, 'absent')).toEqual([]);
    expect(source).toBe(original);
  });
  it('includes pages and component instances but excludes unstable generated targets', () => {
    const items = indexPageSource('app/about/page.client.tsx', source, 'About');
    expect(items[0].kind).toBe('page');
    expect(items.find(item => item.nodeId === 'card')?.label).toBe('Shared card');
    expect(items.some(item => item.nodeId?.startsWith('auto_'))).toBe(false);
    expect(filterDocumentSearch(items, 'About')[0].kind).toBe('page');
  });
  it('searches the current shared editor without labelling its master as a page', () => {
    const items = indexPageSource('components/Card.tsx', source, 'Card', false);
    expect(items.every(item => item.kind === 'layer')).toBe(true);
    expect(filterDocumentSearch(items, 'Card painter').map(item => item.nodeId)).toEqual(['title']);
  });
  it('distinguishes valid empty pages from syntax failures', () => {
    expect(indexPageSource('app/empty/page.client.tsx', 'export default function Page() { return null; }', 'Empty')).toHaveLength(1);
    expect(() => indexPageSource('app/broken/page.client.tsx', 'export default function Page() { return <div', 'Broken')).toThrow();
  });
});
