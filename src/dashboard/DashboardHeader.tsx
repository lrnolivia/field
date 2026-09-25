import { FigmaPlusIcon } from '@/shared/loew-figma-icons';
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
  onCreate: () => void;
};

export default function DashboardHeader({ view, count, creating, onCreate }: Props) {
  return (
    <header className="field-dashboard-header">
      <div className="field-dashboard-heading-wrap">
        <h1>{titles[view]}</h1>
        <span>{count}</span>
      </div>
      {view !== 'trash' && (
        <button className="field-dashboard-new" type="button" onClick={onCreate} disabled={creating}>
          <FigmaPlusIcon size={13} />
          <span>{creating ? 'Creating…' : 'New project'}</span>
        </button>
      )}
    </header>
  );
}
