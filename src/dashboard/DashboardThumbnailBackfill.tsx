import { useEffect, useRef } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';
import { backfillDashboardThumbnails } from './dashboard-thumbnail-backfill';

/** Runs once per Dashboard visit, after the project list has first loaded. */
export default function DashboardThumbnailBackfill({
  projects,
  onReady,
}: {
  projects: FieldProjectMeta[];
  onReady: (projectId: string, url: string) => void;
}) {
  const initial = useRef({ projects, onReady });
  useEffect(() => {
    const controller = new AbortController();
    const { projects: rows, onReady: update } = initial.current;
    void backfillDashboardThumbnails(rows, update, controller.signal);
    return () => controller.abort();
  }, []);
  return null;
}
