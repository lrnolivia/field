// Pure URL helper for Pages context-menu commands.
// Keep editor/session query state out of copied page links.
export function buildPageEditorLink(currentHref: string, slug: string): string {
  const url = new URL(currentHref);

  for (const key of ['settings', 'cms', 'item', 'field']) {
    url.searchParams.delete(key);
  }

  if (!slug || slug === 'home') url.searchParams.delete('page');
  else url.searchParams.set('page', slug);

  return url.toString();
}
