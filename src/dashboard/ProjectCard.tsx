import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { FigmaMoreIcon } from '@/shared/loew-figma-icons';
import type { FieldProjectMeta } from '@/backend/field-projects';
import { DASHBOARD_LOADING_MIN_VISIBLE_MS, DASHBOARD_LOADING_REVEAL_MS } from './dashboard-loading';
import { formatRelativeEditedTime } from './project-meta';
import ProjectCardMenu from './ProjectCardMenu';
import SkeletonSurface from './SkeletonSurface';

type Props = {
  project: FieldProjectMeta;
  refreshing?: boolean;
  opening?: boolean;
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
      <div className="field-project-placeholder-page">
        <span className="field-project-placeholder-nav" />
        <span className="field-project-placeholder-hero" />
        <span className="field-project-placeholder-line field-project-placeholder-line-long" />
        <span className="field-project-placeholder-line field-project-placeholder-line-short" />
        <span className="field-project-placeholder-card field-project-placeholder-card-a" />
        <span className="field-project-placeholder-card field-project-placeholder-card-b" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton({ label }: { label?: string }) {
  return (
    <article
      className="field-project-card field-project-card-skeleton"
      aria-busy="true"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <SkeletonSurface className="field-project-skeleton-preview" />
      <div className="field-project-skeleton-meta-row">
        <SkeletonSurface className="field-project-skeleton-name" />
        <SkeletonSurface className="field-project-skeleton-menu" />
      </div>
      <SkeletonSurface className="field-project-skeleton-edited" />
    </article>
  );
}

function ProjectThumbnail({ src }: { src: string }) {
  const mountedRef = useRef(false);
  const previousSrcRef = useRef(src);
  const settledSrcRef = useRef<string | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  const clearTimers = () => {
    if (revealTimerRef.current !== null) clearTimeout(revealTimerRef.current);
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    revealTimerRef.current = null;
    hideTimerRef.current = null;
  };

  const settleLoading = () => {
    settledSrcRef.current = src;
    if (revealTimerRef.current !== null) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    const shownAt = shownAtRef.current;
    if (shownAt === null) {
      setLoadingSlow(false);
      return;
    }
    const remaining = DASHBOARD_LOADING_MIN_VISIBLE_MS - (Date.now() - shownAt);
    if (remaining <= 0) {
      shownAtRef.current = null;
      setLoadingSlow(false);
      return;
    }
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      shownAtRef.current = null;
      setLoadingSlow(false);
    }, remaining);
  };

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      previousSrcRef.current = src;
      return;
    }
    if (src === previousSrcRef.current) return;
    previousSrcRef.current = src;
    setFailedSrc(null);
    clearTimers();
    if (settledSrcRef.current === src) return;
    shownAtRef.current = null;
    setLoadingSlow(false);
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      shownAtRef.current = Date.now();
      setLoadingSlow(true);
    }, DASHBOARD_LOADING_REVEAL_MS);
    return clearTimers;
  }, [src]);

  useEffect(() => clearTimers, []);

  const handleError = (_event: SyntheticEvent<HTMLImageElement>) => {
    settleLoading();
    setFailedSrc(src);
  };

  return (
    <>
      {!failed && <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={settleLoading}
        onError={handleError}
      />}
      {loadingSlow && (
        <div className="field-project-thumbnail-loading" aria-hidden="true">
          <SkeletonSurface className="field-project-thumbnail-loading-surface" />
        </div>
      )}
    </>
  );
}

export default function ProjectCard(props: Props) {
  const { project } = props;
  const trashed = Boolean(project.trashedAt);
  const openFromCardSurface = (event: MouseEvent<HTMLElement>) => {
    if (trashed) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button, a, input, textarea, select, [role="menu"], [role="menuitem"]')) return;
    props.onOpen();
  };

  return (
    <article
      className="field-project-card"
      role="listitem"
      onClick={openFromCardSurface}
      aria-busy={props.refreshing || undefined}
      data-refreshing={props.refreshing ? 'true' : undefined}
      data-opening={props.opening ? 'true' : undefined}
    >
      <button
        className="field-project-preview"
        data-project-id={project.id}
        type="button"
        onClick={trashed ? undefined : props.onOpen}
        disabled={trashed}
        aria-label={trashed ? `${project.name} is in Trash` : `Open ${project.name}`}
      >
        <Placeholder />
        {project.thumbnail && <ProjectThumbnail src={project.thumbnail} />}
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
          <span className="field-project-more-glyph" aria-hidden="true">
            <FigmaMoreIcon size={14} />
            <svg className="field-project-more-close" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 3.5l9 9m0-9-9 9" /></svg>
          </span>
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
