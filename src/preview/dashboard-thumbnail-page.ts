// dashboard-thumbnail-page.ts — deterministic Page authority for project-card previews.
//
// field does not currently persist arbitrary Pages-panel ordering. The canonical
// editor presentation is Home first, then route-alphabetical. Dashboard thumbnails
// follow that same rule instead of inventing a second ordering model.

import { filePathToSlug } from '@/code/project/active-file-store';

function isPageClientFile(path: string): boolean {
  return path === 'app/page.client.tsx' || path.endsWith('/page.client.tsx');
}

function isDynamicRoute(path: string): boolean {
  return /\[[^\]]+\]/.test(filePathToSlug(path));
}

/**
 * Choose the Page represented by a dashboard card.
 *
 * 1. Home wins whenever it exists — exactly like the Pages UI.
 * 2. Otherwise choose the first STATIC route alphabetically.
 * 3. If a project contains only dynamic routes, use the first route anyway;
 *    the Preview router can still render it with literal param placeholders.
 * 4. No pages → null, leaving the normal field placeholder visible.
 */
export function chooseDashboardThumbnailPage(paths: string[]): string | null {
  const pages = paths.filter(isPageClientFile);
  if (pages.length === 0) return null;

  const home = pages.find((path) => filePathToSlug(path) === 'home');
  if (home) return home;

  const sorted = [...pages].sort((a, b) =>
    filePathToSlug(a).localeCompare(filePathToSlug(b)),
  );
  return sorted.find((path) => !isDynamicRoute(path)) ?? sorted[0] ?? null;
}

export function dashboardThumbnailPageUrl(path: string): string {
  const slug = filePathToSlug(path);
  return !slug || slug === 'home' ? '/' : `/${slug}`;
}
