import type { RevymeUser } from '@/backend';
import { FigmaGridIcon, FigmaSearchIcon } from '@/shared/loew-figma-icons';
import type { DashboardView } from './project-meta';

type Props = {
  view: DashboardView;
  query: string;
  user: RevymeUser | null;
  onViewChange: (view: DashboardView) => void;
  onQueryChange: (query: string) => void;
};

function ClockIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="M8 5v3.3l2.3 1.4"/></svg>;
}

function StarIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m8 2.3 1.7 3.4 3.8.6-2.8 2.7.7 3.8L8 11l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6z"/></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 5h9M6 5V3.5h4V5M5 5l.6 7.5h4.8L11 5"/></svg>;
}

function avatarLabel(user: RevymeUser | null): string {
  const source = user?.name?.trim() || user?.email?.trim() || 'You';
  return source.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

const nav: Array<{ id: DashboardView; label: string; icon: 'clock' | 'grid' | 'star' | 'trash' }> = [
  { id: 'recents', label: 'Recents', icon: 'clock' },
  { id: 'all', label: 'All projects', icon: 'grid' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
];

export default function DashboardSidebar({ view, query, user, onViewChange, onQueryChange }: Props) {
  return (
    <aside className="field-dashboard-sidebar">
      <div className="field-dashboard-brand" aria-label="field by loew.fi">
        <span className="field-dashboard-brand-name">field</span>
        <span className="field-dashboard-brand-by">by loew.fi</span>
      </div>

      <label className="field-dashboard-search">
        <FigmaSearchIcon size={14} />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search"
          aria-label="Search projects"
        />
      </label>

      <nav className="field-dashboard-nav" aria-label="Project views">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            className="field-dashboard-nav-row"
            data-active={view === item.id ? 'true' : undefined}
            onClick={() => onViewChange(item.id)}
          >
            <span className="field-dashboard-nav-icon">
              {item.icon === 'clock' && <ClockIcon />}
              {item.icon === 'grid' && <FigmaGridIcon size={14} />}
              {item.icon === 'star' && <StarIcon />}
              {item.icon === 'trash' && <TrashIcon />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="field-dashboard-profile">
        <div className="field-dashboard-avatar">
          {user?.image ? <img src={user.image} alt="" /> : avatarLabel(user)}
        </div>
        <div className="field-dashboard-profile-copy">
          <strong>{user?.name || 'Your projects'}</strong>
          <span>{user?.email || 'Personal field'}</span>
        </div>
      </div>
    </aside>
  );
}
