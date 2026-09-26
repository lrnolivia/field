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
import {
  openFieldProject,
  releaseFieldProjectReveal,
} from '@/backend/field-navigation';
import DashboardHeader from '@/dashboard/DashboardHeader';
import DashboardSidebar from '@/dashboard/DashboardSidebar';
import DashboardLoadingGrid from '@/dashboard/DashboardLoadingGrid';
import EmptyState from '@/dashboard/EmptyState';
import ProjectGrid from '@/dashboard/ProjectGrid';
import RenameProjectDialog from '@/dashboard/RenameProjectDialog';
import DeleteProjectDialog from '@/dashboard/DeleteProjectDialog';
import NewProjectWizard from '@/dashboard/NewProjectWizard';
import { createNewProjectData, type NewProjectSettings } from '@/dashboard/new-project-model';
import { formatDashboardActionError, getDashboardEmptyState, selectFieldProjects, type DashboardView } from '@/dashboard/project-meta';
import { createDashboardLoadingController } from '@/dashboard/dashboard-loading';
import { bindDashboardProjectEvents, createDashboardProjectRefreshController } from '@/dashboard/dashboard-realtime';

export default function Dashboard() {
  const [projects, setProjects] = useState<FieldProjectMeta[]>([]);
  const [view, setView] = useState<DashboardView>('recents');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshingProjectIds, setRefreshingProjectIds] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FieldProjectMeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldProjectMeta | null>(null);
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

  const openProject = (project: FieldProjectMeta) => {
    setError(null);
    setOpenMenuId(null);
    void openFieldProject(project.id).catch((cause) => {
      setError(cause instanceof Error ? cause.message : String(cause));
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

  const createConfiguredProject = async (settings: NewProjectSettings): Promise<FieldProjectMeta> => {
    setCreating(true);
    setError(null);
    try {
      let project = await createFieldProject();
      const name = settings.name.trim() || 'Untitled';
      if (name !== project.name) {
        project = await renameFieldProject(project.id, name);
      }
      await backend.saveProject(project.id, createNewProjectData(settings));
      replaceProject(project);
      // Start the real Canvas behind the Dashboard while the wizard shows its
      // short Done state. The shell only reveals once both this hold is
      // released AND ProjectLoader reports a painted canvas.
      await openFieldProject(project.id, { holdReveal: true });
      return project;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    } finally {
      setCreating(false);
    }
  };

  const permanentDelete = async (project: FieldProjectMeta) => {
    setBusyId(project.id);
    setError(null);
    try {
      await permanentlyDeleteFieldProject(project.id);
      setProjects((current) => current.filter((row) => row.id !== project.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
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
        <DashboardHeader
          view={view}
          count={visibleProjects.length}
          creating={creating}
          onCreate={() => {
            setError(null);
            setNewProjectOpen(true);
          }}
        />

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
              onOpen={openProject}
              onRename={(project) => {
                setOpenMenuId(null);
                setRenameTarget(project);
              }}
              onDuplicate={(project) => void runProjectAction(project, () => duplicateFieldProject(project.id))}
              onToggleStar={(project) => void runProjectAction(project, () => setFieldProjectStarred(project.id, !project.starred))}
              onTrash={(project) => void runProjectAction(project, () => trashFieldProject(project.id))}
              onRestore={(project) => void runProjectAction(project, () => restoreFieldProject(project.id))}
              onPermanentDelete={(project) => {
                setOpenMenuId(null);
                setDeleteTarget(project);
              }}
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

      <DeleteProjectDialog
        project={deleteTarget}
        deleting={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onClose={() => {
          if (!deleteTarget || busyId !== deleteTarget.id) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void permanentDelete(deleteTarget);
        }}
      />

      <NewProjectWizard
        open={newProjectOpen}
        onClose={() => {
          if (!creating) setNewProjectOpen(false);
        }}
        onCreate={createConfiguredProject}
        onDone={(project) => {
          setNewProjectOpen(false);
          releaseFieldProjectReveal(project.id);
        }}
      />
    </div>
  );
}
