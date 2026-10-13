import { useEffect, useRef } from 'react';
import type { FieldProjectMeta } from '@/backend/field-projects';
import { backfillDashboardThumbnails } from './dashboard-thumbnail-backfill';

export default function DashboardThumbnailBackfill({
  projects,
  onReady,
  generation = 0,
  force = false,
  onComplete,
}: {
  projects: FieldProjectMeta[];
  onReady: (projectId: string, url: string) => void;
  generation?: number;
  force?: boolean;
  onComplete?: () => void;
}) {
  const latest = useRef({ projects, onReady, force, onComplete });
  latest.current = { projects, onReady, force, onComplete };

  useEffect(() => {
    const controller = new AbortController();
    const run = latest.current;
    void backfillDashboardThumbnails(run.projects, run.onReady, controller.signal, fetch, run.force)
      .finally(() => {
        if (!controller.signal.aborted) run.onComplete?.();
      });
    return () => controller.abort();
  }, [generation]);

  return null;
}
