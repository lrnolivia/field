import { useEffect, useMemo, useState } from 'react';
import { backend, type RevymeUser } from '@/backend';
import {
  createFieldProject,
  duplicateFieldProject,
  listFieldProjects,
  permanentlyDeleteFieldProject,
  renameFieldProject,
  restoreFieldProject,
  setFieldProjectStarred,
  trashFieldProject,
  type FieldProjectMeta,
} from '@/backend/field-projects';
import DashboardHeader from '@/dashboard/DashboardHeader';
import DashboardSidebar from '@/dashboard/DashboardSidebar';
import DashboardLoadingGrid from '@/dashboard/DashboardLoadingGrid';
import EmptyState from '@/dashboard/EmptyState';
import ProjectGrid from '@/dashboard/ProjectGrid';
import RenameProjectDialog from '@/dashboard/RenameProjectDialog';
import { formatDashboardActionError, getDashboardEmptyState, selectFieldProjects, type DashboardView } from '@/dashboard/project-meta';
import { createDashboardLoadingController } from '@/dashboard/dashboard-loading';
import { bindDashboardProjectEvents, createDashboardProjectRefreshController } from '@/dashboard/dashboard-realtime';

function navigateToProject(project: FieldProjectMeta) {
  window.location.href = `/builder/${encodeURIComponent(project.id)}`;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<FieldProjectMeta[]>([]);
  const [view, setView] = useState<DashboardView>('recents');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshingProjectIds, setRefreshingProjectIds] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FieldProjectMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<RevymeUser | null>(null);

  const visibleProjects = useMemo(
    () => selectFieldProjects(projects, view, query),
    [projects, query, view],
  );
  const emptyState = getDashboardEmptyState(view, query);

  useEffect(() => {
    let active = true;
    let initialSettled = false;
    const loadingController = createDashboardLoadingController({
      show: (projectIds) => {
        if (active) setRefreshingProjectIds(new Set(projectIds));
      },
      hide: () => {
        if (active) setRefreshingProjectIds(new Set<string>());
      },
    });
    const refreshController = createDashboardProjectRefreshController<FieldProjectMeta[]>({
      load: listFieldProjects,
      apply: (next) => {
        if (active) setProjects(next);
      },
      onError: (cause) => {
        if (!active) return;
        if (!initialSettled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        } else {
          console.warn('[field-dashboard] background project refresh failed', cause);
        }
      },
      onBackgroundRefreshStart: loadingController.begin,
      onBackgroundRefreshEnd: loadingController.end,
    });
    const unsubscribeRealtime = bindDashboardProjectEvents(refreshController);

    void refreshController.refreshNow().finally(() => {
      initialSettled = true;
      if (active) setLoading(false);
    });

    void backend.getUser().then((next) => {
      if (active) setUser(next);
    }).catch(() => {
      // Identity is nice-to-have dashboard chrome; Access remains enforced by APIs.
    });

    return () => {
      active = false;
      unsubscribeRealtime();
      refreshController.dispose();
      loadingController.dispose();
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('blur', closeMenu);
    return () => window.removeEventListener('blur', closeMenu);
  }, []);

  const replaceProject = (next: FieldProjectMeta) => {
    setProjects((current) => {
      const exists = current.some((project) => project.id === next.id);
      return exists
        ? current.map((project) => project.id === next.id ? next : project)
        : [next, ...current];
    });
  };

  const runProjectAction = async (
    project: FieldProjectMeta,
    action: () => Promise<FieldProjectMeta>,
  ) => {
    setBusyId(project.id);
    setError(null);
    setOpenMenuId(null);
    try {
      replaceProject(await action());
    } catch (cause) {
      setError(formatDashboardActionError(cause));
    } finally {
      setBusyId(null);
    }
  };

  const createProject = async () => {
    setCreating(true);
    setError(null);
    try {
      const project = await createFieldProject();
      navigateToProject(project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setCreating(false);
    }
  };

  const permanentDelete = async (project: FieldProjectMeta) => {
    setOpenMenuId(null);
    if (!window.confirm(`Permanently delete “${project.name || 'Untitled'}”? This cannot be undone.`)) return;
    setBusyId(project.id);
    setError(null);
    try {
      await permanentlyDeleteFieldProject(project.id);
      setProjects((current) => current.filter((row) => row.id !== project.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="field-dashboard-page" data-busy-project={busyId ?? undefined}>
      <DashboardSidebar
        view={view}
        query={query}
        user={user}
        onViewChange={(next) => {
          setView(next);
          setOpenMenuId(null);
        }}
        onQueryChange={setQuery}
      />

      <main className="field-dashboard-main">
        <DashboardHeader view={view} count={visibleProjects.length} creating={creating} onCreate={createProject} />

        <section className="field-dashboard-content" aria-live="polite">
          {error && (
            <div className="field-dashboard-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()}>Reload</button>
            </div>
          )}

          {loading ? (
            <DashboardLoadingGrid />
          ) : visibleProjects.length > 0 ? (
            <ProjectGrid
              projects={visibleProjects}
              refreshingProjectIds={refreshingProjectIds}
              openMenuId={openMenuId}
              onOpenMenuId={setOpenMenuId}
              onOpen={navigateToProject}
              onRename={(project) => {
                setOpenMenuId(null);
                setRenameTarget(project);
              }}
              onDuplicate={(project) => void runProjectAction(project, () => duplicateFieldProject(project.id))}
              onToggleStar={(project) => void runProjectAction(project, () => setFieldProjectStarred(project.id, !project.starred))}
              onTrash={(project) => void runProjectAction(project, () => trashFieldProject(project.id))}
              onRestore={(project) => void runProjectAction(project, () => restoreFieldProject(project.id))}
              onPermanentDelete={(project) => void permanentDelete(project)}
            />
          ) : (
            <EmptyState title={emptyState.title} detail={emptyState.detail} />
          )}
        </section>
      </main>

      <RenameProjectDialog
        project={renameTarget}
        saving={Boolean(renameTarget && busyId === renameTarget.id)}
        onClose={() => setRenameTarget(null)}
        onSave={(name) => {
          if (!renameTarget) return;
          const target = renameTarget;
          void runProjectAction(target, () => renameFieldProject(target.id, name)).then(() => {
            setRenameTarget(null);
          });
        }}
      />
    </div>
  );
}
