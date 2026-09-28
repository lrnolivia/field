export function fieldProjectUrl(id: string): string {
  return `/work/${encodeURIComponent(id)}`;
}

export function fieldBuilderProjectId(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const builderIndex = parts.findIndex(part => part === 'work' || part === 'builder');
  if (builderIndex < 0) return null;
  const raw = parts[builderIndex + 1];
  if (!raw) return 'local';
  try {
    return decodeURIComponent(raw) || 'local';
  } catch {
    return raw || 'local';
  }
}

export function fieldPathIsDashboard(pathname: string): boolean {
  return pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/';
}
