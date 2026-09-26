import { ProjectCardSkeleton } from './ProjectCard';

const INITIAL_SKELETON_COUNT = 6;

export default function DashboardLoadingGrid() {
  return (
    <div className="field-project-grid" aria-label="Loading projects" aria-busy="true">
      {Array.from({ length: INITIAL_SKELETON_COUNT }, (_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  );
}
