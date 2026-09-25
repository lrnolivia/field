import { FigmaMoreIcon } from '@/shared/loew-figma-icons';
import type { FieldProjectMeta } from '@/backend/field-projects';
import { formatRelativeEditedTime } from './project-meta';
import ProjectCardMenu from './ProjectCardMenu';

type Props = {
  project: FieldProjectMeta;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onToggleStar: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
};

function StarBadge() {
  return (
    <span className="field-project-star-badge" aria-label="Starred">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m8 2.3 1.7 3.4 3.8.6-2.8 2.7.7 3.8L8 11l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6z"/></svg>
    </span>
  );
}

function Placeholder() {
  return (
    <div className="field-project-placeholder" aria-hidden="true">
      <span className="field-project-placeholder-grid" />
      <span className="field-project-placeholder-mark">f</span>
    </div>
  );
}

export default function ProjectCard(props: Props) {
  const { project } = props;
  const trashed = Boolean(project.trashedAt);

  return (
    <article className="field-project-card">
      <button
        className="field-project-preview"
        type="button"
        onClick={trashed ? undefined : props.onOpen}
        disabled={trashed}
        aria-label={trashed ? `${project.name} is in Trash` : `Open ${project.name}`}
      >
        {project.thumbnail ? <img src={project.thumbnail} alt="" /> : <Placeholder />}
        {project.starred && !trashed && <StarBadge />}
      </button>

      <div className="field-project-meta-row">
        <button className="field-project-name" type="button" disabled={trashed} onClick={trashed ? undefined : props.onOpen}>
          {project.name || 'Untitled'}
        </button>
        <button
          className="field-project-more"
          type="button"
          aria-label={`Project actions for ${project.name || 'Untitled'}`}
          aria-haspopup="menu"
          aria-expanded={props.menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            props.onMenuOpenChange(!props.menuOpen);
          }}
        >
          <FigmaMoreIcon size={14} />
        </button>
        <ProjectCardMenu
          project={project}
          open={props.menuOpen}
          onOpenChange={props.onMenuOpenChange}
          onOpenProject={props.onOpen}
          onRename={props.onRename}
          onDuplicate={props.onDuplicate}
          onToggleStar={props.onToggleStar}
          onTrash={props.onTrash}
          onRestore={props.onRestore}
          onPermanentDelete={props.onPermanentDelete}
        />
      </div>
      <span className="field-project-edited">
        {trashed && project.trashedAt ? `Trashed ${formatRelativeEditedTime(project.trashedAt).replace(/^Edited /, '')}` : formatRelativeEditedTime(project.updatedAt)}
      </span>
    </article>
  );
}
