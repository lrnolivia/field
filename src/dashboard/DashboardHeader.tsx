import { FigmaPlusIcon, FigmaReloadIcon } from '@/shared/loew-figma-icons';
import type { DashboardView } from './project-meta';

const titles: Record<DashboardView, string> = {
  recents: 'Recents',
  all: 'All projects',
  starred: 'Starred',
  trash: 'Trash',
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
          aria-label={refreshing ? 'Refreshing projects and thumbnails' : 'Refresh projects and thumbnails'}
          title="Refresh projects and thumbnails"
          data-refreshing={refreshing ? 'true' : undefined}
        >
          <FigmaReloadIcon size={13} />
        </button>
        {view !== 'trash' && (
          <button className="field-dashboard-new" type="button" onClick={onCreate} disabled={creating || refreshing}>
            <FigmaPlusIcon size={13} />
            <span>{creating ? 'Creating…' : 'New project'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
