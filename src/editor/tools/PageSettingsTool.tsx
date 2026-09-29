// PageSettingsTool.tsx — contextual page-level inspector.
//
// This is the page counterpart to element properties: no full-screen takeover,
// no second settings hierarchy. It edits the active route's real source-backed
// state (route path + server-wrapper metadata) and composes existing native
// page tools (canvas appearance + Template assignment).

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import {
  activeFilePathAtom,
  filePathToSlug,
  getPageClientPath,
  getPageServerPath,
  getRouteGroup,
  isPageClientFile,
  isPageServerFile,
  movePageFile,
  syncUrlToPage,
} from '@/code/project/active-file-store';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { bumpProjectVersion, modifyProjectFile } from '@/code/project/modify-file';
import { selectedIdsAtom, updatingFromCanvasAtom } from '@/code/stores/store';
import { syncQueueCode, flushNow } from '@/code/mutation/mutation-queue';
import { parseMetadataFromCode, updateMetadataInCode, type SiteMetadata } from '@/code/generation/metadata-gen';
import { trace } from '@/shared/debug-trace';
import {
  ControlActionRow,
  ToolDivider,
  ToolInput,
  ToolRow,
  ToolSection,
  ToolSelect,
  ToolSwitch,
  ToolTextArea,
} from '@/editor/controls';
import PageAppearanceTool from './PageAppearanceTool';
import TemplatePicker from '@/editor/TemplatePicker';
import ImageSearchModal from '@/editor/ui/ImageSearchModal';
import { PageHomeIcon, PageDocumentIcon } from '@/shared/icons';
import UiHeadingText from '@/design-system/UiHeadingText';

interface PageMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  canonical: string;
}

const EMPTY_META: PageMeta = {
  title: '',
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterCard: 'summary_large_image',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  robotsIndex: true,
  robotsFollow: true,
  canonical: '',
};

function metaToForm(meta: SiteMetadata): PageMeta {
  const og = (meta.openGraph ?? {}) as Record<string, unknown>;
  const twitter = (meta.twitter ?? {}) as Record<string, unknown>;
  const robots = (meta.robots ?? {}) as Record<string, unknown>;
  const alternates = (meta.alternates ?? {}) as Record<string, unknown>;
  const ogImages = og.images as unknown;
  const firstOgImage = Array.isArray(ogImages)
    ? (typeof ogImages[0] === 'string' ? ogImages[0] : (ogImages[0] as { url?: string } | undefined)?.url)
    : undefined;
  return {
    title: (meta.title as string) ?? '',
    description: (meta.description as string) ?? '',
    ogTitle: (og.title as string) ?? '',
    ogDescription: (og.description as string) ?? '',
    ogImage: firstOgImage ?? '',
    twitterCard: (twitter.card as string) ?? 'summary_large_image',
    twitterTitle: (twitter.title as string) ?? '',
    twitterDescription: (twitter.description as string) ?? '',
    twitterImage: (twitter.image as string) ?? '',
    robotsIndex: robots.index === undefined ? true : robots.index === true,
    robotsFollow: robots.follow === undefined ? true : robots.follow === true,
    canonical: (alternates.canonical as string) ?? '',
  };
}

function normalizeRouteInput(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function formatPageTitle(slug: string): string {
  if (slug === 'home') return 'Home';
  const segment = slug.split('/').filter(Boolean).pop() || 'Page';
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PageSettingField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div data-page-settings-field className="flex flex-col gap-1.5">
      <div className="text-[10px] font-medium text-[var(--text-secondary)]">{label}</div>
      {children}
      {hint && <div className="text-[9px] leading-[12px] text-[var(--text-tertiary)]">{hint}</div>}
    </div>
  );
}

function PageViewportPreview({
  title,
  description,
  route,
}: {
  title: string;
  description: string;
  route: string;
}) {
  return (
    <div data-page-settings-preview className="justify-self-end">
      <div className="w-[124px] rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-active)]/65 p-[3px] shadow-[0_3px_10px_rgba(0,0,0,0.08)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-surface)]">
          <div className="absolute inset-x-0 top-0 h-3 border-b border-[var(--border-light)] bg-[var(--bg-hover)]/35">
            <div className="absolute left-1.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[var(--text-disabled)]/55" />
          </div>
          <div className="absolute inset-x-0 bottom-0 top-3 px-2 py-2">
            <div className="h-1 w-[72%] rounded-full bg-[var(--text-primary)]/22" />
            <div className="mt-1.5 h-[3px] w-[88%] rounded-full bg-[var(--text-secondary)]/18" />
            <div className="mt-1 h-[3px] w-[66%] rounded-full bg-[var(--text-secondary)]/13" />
            <div className="mt-2.5 h-3 w-[42%] rounded-[2px] bg-[var(--accent)]/28" />
          </div>
          <span className="sr-only">{title} {description} {route}</span>
        </div>
      </div>
    </div>
  );
}

function SearchResultPreview({
  title,
  description,
  route,
}: {
  title: string;
  description: string;
  route: string;
}) {
  return (
    <div
      data-page-search-preview
      className="mt-1 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)]/65 px-2.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center gap-1.5 text-[9px] leading-3 text-[var(--text-tertiary)]">
        <span className="h-3 w-3 rounded-[3px] border border-[var(--border-light)] bg-[var(--bg-hover)]/50" />
        <span className="truncate">{route}</span>
      </div>
      <div className="mt-1.5 truncate text-[12px] font-medium leading-4 text-[var(--accent-text)]">
        {title}
      </div>
      <div className="mt-0.5 max-h-8 overflow-hidden text-[10px] leading-4 text-[var(--text-secondary)]">
        {description}
      </div>
    </div>
  );
}

function SocialSharePreview({
  image,
  title,
  description,
}: {
  image: string;
  title: string;
  description: string;
}) {
  return (
    <div
      data-page-social-preview
      className="grid grid-cols-[62px_minmax(0,1fr)] overflow-hidden rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)]/65 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      <div className="relative min-h-[58px] border-r border-[var(--border-light)] bg-[var(--bg-hover)]/45">
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <div className="absolute left-2 top-2 h-5 w-7 rounded-[3px] border border-[var(--border-light)] bg-[var(--bg-surface)]/60" />
            <div className="absolute bottom-2 right-2 h-2.5 w-6 rounded-[2px] bg-[var(--accent)]/20" />
          </>
        )}
      </div>
      <div className="min-w-0 px-2 py-2">
        <div className="truncate text-[10px] font-medium text-[var(--text-primary)]">{title}</div>
        <div className="mt-1 max-h-7 overflow-hidden text-[9px] leading-[13px] text-[var(--text-tertiary)]">{description}</div>
      </div>
    </div>
  );
}

function PageImageField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const hasImage = value.trim().length > 0;

  return (
    <>
      <div className="flex items-center gap-1 w-full min-w-0">
        {hasImage && (
          <button
            type="button"
            className="h-[var(--control-height)] w-[var(--control-height)] shrink-0 overflow-hidden cut-corners cut-border border border-[var(--control-border)] [--cut-border-color:var(--control-border)]"
            title={`Replace ${label.toLowerCase()}`}
            onClick={() => setOpen(true)}
          >
            <img src={value} alt="" className="w-full h-full object-cover" />
          </button>
        )}
        <ControlActionRow onClick={() => setOpen(true)} className="flex-1">
          <span className="truncate">{hasImage ? 'Replace' : 'Choose image…'}</span>
        </ControlActionRow>
        {hasImage && (
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()}`}
            title={`Remove ${label.toLowerCase()}`}
            onClick={() => onChange('')}
            className="h-[var(--control-height)] w-[var(--control-height)] shrink-0 flex items-center justify-center cut-corners text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10"
          >
            ×
          </button>
        )}
      </div>
      <ImageSearchModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </>
  );
}

export default function PageSettingsTool() {
  const activeFile = useAtomValue(activeFilePathAtom);
  const version = useAtomValue(projectVersionAtom);
  const setActiveFile = useSetAtom(activeFilePathAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const setUpdatingFromCanvas = useSetAtom(updatingFromCanvasAtom);

  const clientPath = isPageServerFile(activeFile) ? getPageClientPath(activeFile) : activeFile;
  const isPage = isPageClientFile(clientPath);
  const metadataPath = isPage ? getPageServerPath(clientPath) : '';
  const pageSlug = isPage ? filePathToSlug(clientPath) : '';
  const routeValue = pageSlug === 'home' ? '/' : `/${pageSlug}`;
  const isHome = pageSlug === 'home';
  const pageTitle = formatPageTitle(pageSlug);
  const PageIcon = isHome ? PageHomeIcon : PageDocumentIcon;

  const initial = useMemo<PageMeta>(() => {
    void version;
    if (!metadataPath) return EMPTY_META;
    const code = projectFS.readFile(metadataPath);
    return code ? metaToForm(parseMetadataFromCode(code)) : EMPTY_META;
  }, [metadataPath, version]);

  const [form, setForm] = useState<PageMeta>(initial);
  useEffect(() => { setForm(initial); }, [metadataPath, initial]);

  if (!isPage) return null;

  const commitMeta = (patch: SiteMetadata, localPatch: Partial<PageMeta>, action: string) => {
    setForm((current) => ({ ...current, ...localPatch }));
    modifyProjectFile(metadataPath, (code) => updateMetadataInCode(code, patch));
    trace.action(`page-settings:${action}`, { filePath: clientPath, metadataPath });
  };

  const renameRoute = (raw: string) => {
    if (isHome) return;
    const route = normalizeRouteInput(raw);
    if (!route) {
      toast.error('Page path cannot be empty.');
      return;
    }
    const group = getRouteGroup(clientPath);
    const base = group ? `app/(${group})` : 'app';
    const nextPath = `${base}/${route}/page.client.tsx`;
    if (nextPath === clientPath) return;
    if (projectFS.exists(nextPath)) {
      toast.error(`A page already exists at /${route}.`);
      return;
    }

    // Route moves operate on both page halves. Flush the active mutation
    // queue first, then retarget the queue + active-file pointer to the moved
    // client file so the next canvas edit cannot write back to the old path.
    const fresh = projectFS.readFile(clientPath);
    if (fresh) syncQueueCode(fresh);
    flushNow();
    movePageFile(clientPath, nextPath);
    setUpdatingFromCanvas(false);
    setSelectedIds([]);
    setActiveFile(nextPath);
    const movedCode = projectFS.readFile(nextPath);
    if (movedCode) syncQueueCode(movedCode);
    bumpProjectVersion();
    syncUrlToPage(nextPath);
    trace.action('page-settings:route-change', { from: clientPath, to: nextPath });
  };

  return (
    <div data-page-settings-panel className="w-full pb-5">
      <div
        data-page-settings-header
        className="border-b border-[var(--border-light)] px-[var(--panel-inset)] py-3"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_124px] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-hover)]/30 text-[var(--text-secondary)]">
              <PageIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">{pageTitle}</div>
              <div className="truncate font-mono text-[9px] leading-3 text-[var(--text-tertiary)]">{routeValue}</div>
            </div>
          </div>
          <PageViewportPreview
            title={form.title || pageTitle}
            description={form.description || 'Page preview'}
            route={routeValue}
          />
        </div>
      </div>

      <PageAppearanceTool />

      <ToolDivider />

      <ToolSection title="Route">
        <PageSettingField
          label="Published path"
          hint={isHome ? 'Home always publishes at /.' : 'Changing this path moves the page and its server metadata together.'}
        >
          <ToolInput
            value={routeValue}
            onChange={renameRoute}
            text
            disabled={isHome}
            ariaLabel="Page path"
            placeholder="/about"
          />
        </PageSettingField>
      </ToolSection>

      <ToolDivider />
      <TemplatePicker />

      <ToolDivider />

      <ToolSection title="SEO">
        <PageSettingField label="Title">
          <ToolInput
            value={form.title}
            onChange={(value) => commitMeta({ title: value }, { title: value }, 'title')}
            text
            ariaLabel="SEO title"
            placeholder="Page title"
          />
        </PageSettingField>
        <PageSettingField label="Description">
          <ToolTextArea
            value={form.description}
            onChange={(value) => commitMeta({ description: value }, { description: value }, 'description')}
            rows={3}
            placeholder="Search result description"
          />
        </PageSettingField>
        <PageSettingField label="Canonical URL">
          <ToolInput
            value={form.canonical}
            onChange={(value) => commitMeta(
              { alternates: { canonical: value } as Record<string, unknown> },
              { canonical: value },
              'canonical',
            )}
            text
            ariaLabel="Canonical URL"
            placeholder="https://example.com/about"
          />
        </PageSettingField>

        <div className="mt-0.5">
          <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]"><UiHeadingText>Search preview</UiHeadingText></div>
          <SearchResultPreview
            route={routeValue}
            title={form.title || pageTitle}
            description={form.description || 'Add a description to control how this page appears in search results.'}
          />
        </div>
        </div>
      </ToolSection>

      <ToolDivider />

      <ToolSection title="Social" defaultOpen={false}>
        <SocialSharePreview
          image={form.ogImage || form.twitterImage}
          title={form.ogTitle || form.twitterTitle || form.title || pageTitle}
          description={form.ogDescription || form.twitterDescription || form.description || 'Add social metadata to shape how this page is shared.'}
        />
        <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"><UiHeadingText>Open Graph</UiHeadingText></div>
        <PageSettingField label="Title">
          <ToolInput
            value={form.ogTitle}
            onChange={(value) => commitMeta(
              { openGraph: { title: value } },
              { ogTitle: value },
              'og-title',
            )}
            text
            ariaLabel="Open Graph title"
            placeholder="Falls back to page title"
          />
        </PageSettingField>
        <PageSettingField label="Description">
          <ToolTextArea
            value={form.ogDescription}
            onChange={(value) => commitMeta(
              { openGraph: { description: value } },
              { ogDescription: value },
              'og-description',
            )}
            rows={3}
            placeholder="Falls back to page description"
          />
        </PageSettingField>
        <PageSettingField label="Image">
          <PageImageField
            label="Open Graph image"
            value={form.ogImage}
            onChange={(value) => commitMeta(
              { openGraph: { images: value ? [value] : [] } },
              { ogImage: value },
              'og-image',
            )}
          />
        </PageSettingField>

        <ToolDivider />
        <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"><UiHeadingText>X / Twitter</UiHeadingText></div>
        <PageSettingField label="Card">
          <ToolSelect
            value={form.twitterCard || 'summary_large_image'}
            onChange={(value) => commitMeta(
              { twitter: { card: value } as Record<string, unknown> },
              { twitterCard: value },
              'x-card',
            )}
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'summary_large_image', label: 'Large image' },
            ]}
            ariaLabel="X card type"
          />
        </PageSettingField>
        <PageSettingField label="Title">
          <ToolInput
            value={form.twitterTitle}
            onChange={(value) => commitMeta(
              { twitter: { title: value } as Record<string, unknown> },
              { twitterTitle: value },
              'x-title',
            )}
            text
            ariaLabel="X title"
            placeholder="Falls back to OG title"
          />
        </PageSettingField>
        <PageSettingField label="Description">
          <ToolTextArea
            value={form.twitterDescription}
            onChange={(value) => commitMeta(
              { twitter: { description: value } as Record<string, unknown> },
              { twitterDescription: value },
              'x-description',
            )}
            rows={3}
            placeholder="Falls back to OG description"
          />
        </PageSettingField>
        <PageSettingField label="Image">
          <PageImageField
            label="X image"
            value={form.twitterImage}
            onChange={(value) => commitMeta(
              { twitter: { image: value } as Record<string, unknown> },
              { twitterImage: value },
              'x-image',
            )}
          />
        </PageSettingField>
      </ToolSection>

      <ToolDivider />

      <ToolSection title="Search engines">
        <ToolRow label="Index">
          <div className="flex items-center justify-end w-full">
            <ToolSwitch
              value={form.robotsIndex}
              onChange={(value) => commitMeta(
                { robots: { index: value } as Record<string, unknown> },
                { robotsIndex: value },
                'robots-index',
              )}
              ariaLabel="Index this page"
            />
          </div>
        </ToolRow>
        <ToolRow label="Follow links">
          <div className="flex items-center justify-end w-full">
            <ToolSwitch
              value={form.robotsFollow}
              onChange={(value) => commitMeta(
                { robots: { follow: value } as Record<string, unknown> },
                { robotsFollow: value },
                'robots-follow',
              )}
              ariaLabel="Follow links on this page"
            />
          </div>
        </ToolRow>
      </ToolSection>
    </div>
  );
}
