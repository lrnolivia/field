import { FigmaPlusIcon, FigmaReloadIcon } from '@/shared/loew-figma-icons';
import type { DashboardView } from './project-meta';

const titles: Record<DashboardView, string> = {
  recents: 'recents',
  all: 'all projects',
  starred: 'starred',
  trash: 'trash',
};

type Props = {
  view: DashboardView;
  count: number;
  creating: boolean;
  refreshing: boolean;
  onCreate: () => void;
  onRefresh: () => void;
};

export default function DashboardHeader({ view, count, creating, refreshing, onCreate, onRefresh }: Props) {
  return (
    <header className="field-dashboard-header">
      <div className="field-dashboard-heading-wrap">
        <h1>{titles[view]}</h1>
        <span>{count}</span>
      </div>
      <div className="field-dashboard-header-actions">
        <button
          className="field-dashboard-refresh"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? 'refreshing projects and thumbnails' : 'refresh projects and thumbnails'}
          title="refresh projects and thumbnails"
          data-refreshing={refreshing ? 'true' : undefined}
        >
          <FigmaReloadIcon size={13} />
        </button>
        {view !== 'trash' && (
          <button className="field-dashboard-new" type="button" onClick={onCreate} disabled={creating || refreshing}>
            <FigmaPlusIcon size={13} />
            <span>{creating ? 'creating…' : 'new project'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
