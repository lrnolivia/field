import { useEffect, useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import SettingsOverlay from '@/editor/overlays/SettingsOverlay';
import { settingsSectionAtom } from '@/code/stores/website-settings-store';
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
} from '@/backend/field-navigation';
import DashboardHeader from '@/dashboard/DashboardHeader';
import DashboardSidebar from '@/dashboard/DashboardSidebar';
import DashboardLoadingGrid from '@/dashboard/DashboardLoadingGrid';
import DashboardThumbnailBackfill from '@/dashboard/DashboardThumbnailBackfill';
import EmptyState from '@/dashboard/EmptyState';
import ProjectGrid from '@/dashboard/ProjectGrid';
import RenameProjectDialog from '@/dashboard/RenameProjectDialog';
import DeleteProjectDialog from '@/dashboard/DeleteProjectDialog';
import { createNewProjectData, DEFAULT_NEW_PROJECT_SETTINGS } from '@/dashboard/new-project-model';
import { formatDashboardActionError, getDashboardEmptyState, selectFieldProjects, type DashboardView } from '@/dashboard/project-meta';
import { createDashboardLoadingController } from '@/dashboard/dashboard-loading';
import { bindDashboardProjectEvents, createDashboardProjectRefreshController } from '@/dashboard/dashboard-realtime';

export default function Dashboard({ active = true }: { active?: boolean }) {
  const [projects, setProjects] = useState<FieldProjectMeta[]>([]);
  const [view, setView] = useState<DashboardView>('recents');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshingProjectIds, setRefreshingProjectIds] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [manualRefreshGeneration, setManualRefreshGeneration] = useState(0);
  const [forceThumbnailRefresh, setForceThumbnailRefresh] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FieldProjectMeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldProjectMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<RevymeUser | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const setSettingsSection = useSetAtom(settingsSectionAtom);

  useEffect(() => {
    if (!active) {
      setSettingsOpen(false);
      setOpeningProjectId(null);
      // FieldShell keeps Dashboard mounted behind the editor. Dismiss its
      // transient UI so hidden dialogs cannot retain window keyboard traps.
      setOpenMenuId(null);
      setRenameTarget(null);
      setDeleteTarget(null);
    }
  }, [active]);

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

  const refreshDashboard = async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    setError(null);
    setOpenMenuId(null);

    try {
      // listFieldProjects is cache:no-store: replace local metadata from server truth.
      const fresh = await listFieldProjects();
      const rebuildIds = fresh.filter((project) => !project.trashedAt).map((project) => project.id);

      // Invalidate the displayed thumbnail immediately. The force backfill below
      // reloads each saved project snapshot with cache:no-store and renders a new
      // thumbnail even when the server's existing thumbnail is marked current.
      setProjects(fresh.map((project) => project.trashedAt ? project : { ...project, thumbnail: null }));
      setRefreshingProjectIds(new Set(rebuildIds));

      if (fresh.length === 0) {
        setManualRefreshing(false);
        return;
      }
      setForceThumbnailRefresh(true);
      setManualRefreshGeneration((value) => value + 1);
    } catch (cause) {
      setRefreshingProjectIds(new Set());
      setForceThumbnailRefresh(false);
      setManualRefreshing(false);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const openProject = (project: FieldProjectMeta) => {
    setError(null);
    setOpenMenuId(null);
    setOpeningProjectId(project.id);
    const preview = [...document.querySelectorAll<HTMLElement>('.field-project-preview')]
      .find((element) => element.dataset.projectId === project.id);
    const rect = preview?.getBoundingClientRect();
    const image = preview?.querySelector<HTMLImageElement>('img');
    const openingTimeout = window.setTimeout(() => {
      setOpeningProjectId((current) => current === project.id ? null : current);
    }, 8000);
    void openFieldProject(project.id, {
      origin: rect ? {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        thumbnail: image?.complete && image.naturalWidth ? image.currentSrc : null,
      } : undefined,
    }).then(() => {
      window.clearTimeout(openingTimeout);
    }).catch((cause) => {
      window.clearTimeout(openingTimeout);
      setOpeningProjectId(null);
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
      return true;
    } catch (cause) {
      setError(formatDashboardActionError(cause));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const createConfiguredProject = async (): Promise<void> => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      let project = await createFieldProject();
      const name = DEFAULT_NEW_PROJECT_SETTINGS.name;
      if (name !== project.name) {
        project = await renameFieldProject(project.id, name);
      }
      try {
        await backend.saveProject(project.id, createNewProjectData(DEFAULT_NEW_PROJECT_SETTINGS));
      } catch (cause) {
        // The editor can seed a just-created project whose snapshot is missing.
        // A starter-save error must not strand the user on the Dashboard with
        // a new card that appears to do nothing.
        console.warn('[field-dashboard] starter save deferred to editor', cause);
      }
      replaceProject(project);
      await openFieldProject(project.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
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
      setDeleteTarget(null);
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
        onOpenSettings={() => { setSettingsSection('website'); setSettingsOpen(true); }}
      />

      <main className="field-dashboard-main">
        <DashboardHeader
          view={view}
          count={visibleProjects.length}
          creating={creating}
          refreshing={manualRefreshing}
          onCreate={() => { void createConfiguredProject(); }}
          onRefresh={() => { void refreshDashboard(); }}
        />

        <section className="field-dashboard-content" aria-live="polite">
          {error && !renameTarget && !deleteTarget && (
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
              openingProjectId={openingProjectId}
              onOpenMenuId={setOpenMenuId}
              onOpen={openProject}
              onRename={(project) => {
                setError(null);
                setOpenMenuId(null);
                setRenameTarget(project);
              }}
              onDuplicate={(project) => void runProjectAction(project, () => duplicateFieldProject(project.id))}
              onToggleStar={(project) => void runProjectAction(project, () => setFieldProjectStarred(project.id, !project.starred))}
              onTrash={(project) => void runProjectAction(project, () => trashFieldProject(project.id))}
              onRestore={(project) => void runProjectAction(project, () => restoreFieldProject(project.id))}
              onPermanentDelete={(project) => {
                setError(null);
                setOpenMenuId(null);
                setDeleteTarget(project);
              }}
            />
          ) : (
            <EmptyState title={emptyState.title} detail={emptyState.detail} />
          )}
        </section>
      </main>

      {active && settingsOpen && <SettingsOverlay open onClose={() => setSettingsOpen(false)} preferencesOnly />}

      <RenameProjectDialog
        project={active ? renameTarget : null}
        saving={Boolean(renameTarget && busyId === renameTarget.id)}
        error={error}
        onClose={() => setRenameTarget(null)}
        onSave={(name) => {
          if (!renameTarget) return;
          const target = renameTarget;
          void runProjectAction(target, () => renameFieldProject(target.id, name)).then((saved) => {
            if (saved) setRenameTarget(null);
          });
        }}
      />

      {active && !loading && projects.length > 0 && (
        <DashboardThumbnailBackfill
          projects={projects}
          generation={manualRefreshGeneration}
          force={forceThumbnailRefresh}
          onReady={(projectId, url) => {
            const separator = url.includes('?') ? '&' : '?';
            const freshUrl = url + separator + 'field_refresh=' + manualRefreshGeneration;
            setProjects((current) => current.map((project) =>
              project.id === projectId ? { ...project, thumbnail: freshUrl } : project
            ));
            setRefreshingProjectIds((current) => {
              if (!current.has(projectId)) return current;
              const next = new Set(current);
              next.delete(projectId);
              return next;
            });
          }}
          onComplete={() => {
            if (forceThumbnailRefresh) {
              setRefreshingProjectIds(new Set());
              setForceThumbnailRefresh(false);
              setManualRefreshing(false);
            }
          }}
        />
      )}

      <DeleteProjectDialog
        project={active ? deleteTarget : null}
        deleting={Boolean(deleteTarget && busyId === deleteTarget.id)}
        error={error}
        onClose={() => {
          if (!deleteTarget || busyId !== deleteTarget.id) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void permanentDelete(deleteTarget);
        }}
      />


    </div>
  );
}
