import { describe, expect, it } from 'vitest';
import type { FieldProjectMeta } from '@/backend/field-projects';
import { formatRelativeEditedTime, getDashboardEmptyState, selectFieldProjects } from './project-meta';

const rows: FieldProjectMeta[] = [
  { id: 'a', name: 'Alpha', createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-25T02:00:00Z', starred: false, trashedAt: null, thumbnail: null },
  { id: 'b', name: 'Beta', createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-25T03:00:00Z', starred: true, trashedAt: null, thumbnail: null },
  { id: 'c', name: 'Gamma', createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-25T04:00:00Z', starred: true, trashedAt: '2026-09-25T05:00:00Z', thumbnail: null },
];

describe('dashboard project selection', () => {
  it('sorts normal views by updatedAt and excludes trash', () => {
    expect(selectFieldProjects(rows, 'recents', '',).map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('filters starred and search locally', () => {
    expect(selectFieldProjects(rows, 'starred', 'bet').map((row) => row.id)).toEqual(['b']);
  });

  it('sorts Trash by trashedAt', () => {
    expect(selectFieldProjects(rows, 'trash', '').map((row) => row.id)).toEqual(['c']);
  });
});

describe('relative time + empty states', () => {
  const now = Date.parse('2026-09-25T06:00:00Z');

  it('formats compact edited times deterministically', () => {
    expect(formatRelativeEditedTime('2026-09-25T05:59:40Z', now)).toBe('Edited just now');
    expect(formatRelativeEditedTime('2026-09-25T05:48:00Z', now)).toBe('Edited 12 min ago');
    expect(formatRelativeEditedTime('2026-09-25T04:00:00Z', now)).toBe('Edited 2 hours ago');
    expect(formatRelativeEditedTime('2026-09-24T06:00:00Z', now)).toBe('Edited yesterday');
    expect(formatRelativeEditedTime('2026-09-21T06:00:00Z', now)).toBe('Edited 4 days ago');
  });

  it('provides deliberate empty-state copy', () => {
    expect(getDashboardEmptyState('trash', '')).toMatchObject({ title: 'Trash is empty' });
    expect(getDashboardEmptyState('all', 'terra')).toMatchObject({ title: 'No matching projects' });
  });
});
