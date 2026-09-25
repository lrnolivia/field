import type { FieldProjectMeta } from '@/backend/field-projects';

export type DashboardView = 'recents' | 'all' | 'starred' | 'trash';

export function selectFieldProjects(
  projects: FieldProjectMeta[],
  view: DashboardView,
  query: string,
): FieldProjectMeta[] {
  const needle = query.trim().toLowerCase();
  return projects
    .filter((project) => {
      const trashed = Boolean(project.trashedAt);
      if (view === 'trash') return trashed;
      if (trashed) return false;
      if (view === 'starred' && !project.starred) return false;
      return true;
    })
    .filter((project) => !needle || project.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const left = view === 'trash' ? (a.trashedAt ?? '') : a.updatedAt;
      const right = view === 'trash' ? (b.trashedAt ?? '') : b.updatedAt;
      return Date.parse(right) - Date.parse(left);
    });
}

export function formatRelativeEditedTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Edited recently';
  const deltaMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return 'Edited just now';
  if (minutes < 60) return `Edited ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Edited ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (hours < 48) return 'Edited yesterday';
  const days = Math.floor(hours / 24);
  if (days < 30) return `Edited ${days} days ago`;
  return `Edited ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(timestamp))}`;
}

export function getDashboardEmptyState(view: DashboardView, query: string): { title: string; detail: string } {
  if (query.trim()) {
    return {
      title: 'No matching projects',
      detail: `No projects match “${query.trim()}”.`,
    };
  }

  if (view === 'starred') {
    return { title: 'No starred projects', detail: 'Star a project to keep it close.' };
  }
  if (view === 'trash') {
    return { title: 'Trash is empty', detail: 'Projects moved to Trash will appear here.' };
  }
  if (view === 'all') {
    return { title: 'No projects yet', detail: 'Create a project to start designing.' };
  }
  return { title: 'No recent projects', detail: 'Create a project to start designing.' };
}
