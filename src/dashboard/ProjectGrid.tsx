import type { FieldProjectMeta } from '@/backend/field-projects';
import ProjectCard from './ProjectCard';

type Props = {
  projects: FieldProjectMeta[];
  refreshingProjectIds: Set<string>;
  openMenuId: string | null;
  onOpenMenuId: (id: string | null) => void;
  onOpen: (project: FieldProjectMeta) => void;
  onRename: (project: FieldProjectMeta) => void;
  onDuplicate: (project: FieldProjectMeta) => void;
  onToggleStar: (project: FieldProjectMeta) => void;
  onTrash: (project: FieldProjectMeta) => void;
  onRestore: (project: FieldProjectMeta) => void;
  onPermanentDelete: (project: FieldProjectMeta) => void;
};

export default function ProjectGrid({ projects, refreshingProjectIds, openMenuId, onOpenMenuId, ...actions }: Props) {
  return (
    <div className="field-project-grid">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          refreshing={refreshingProjectIds.has(project.id)}
          menuOpen={openMenuId === project.id}
          onMenuOpenChange={(open) => onOpenMenuId(open ? project.id : null)}
          onOpen={() => actions.onOpen(project)}
          onRename={() => actions.onRename(project)}
          onDuplicate={() => actions.onDuplicate(project)}
          onToggleStar={() => actions.onToggleStar(project)}
          onTrash={() => actions.onTrash(project)}
          onRestore={() => actions.onRestore(project)}
          onPermanentDelete={() => actions.onPermanentDelete(project)}
        />
      ))}
    </div>
  );
}
