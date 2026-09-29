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
        className="h-[52px] px-[var(--panel-inset)] border-b border-[var(--border-light)] flex items-center gap-2.5"
      >
        <div className="w-7 h-7 shrink-0 flex items-center justify-center cut-corners cut-border border border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-hover)]/35 text-[var(--text-secondary)]">
          <PageIcon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] leading-4 font-semibold text-[var(--text-primary)] truncate">{pageTitle}</div>
          <div className="text-[9px] leading-3 font-mono text-[var(--text-tertiary)] truncate">{routeValue}</div>
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

        <div className="mt-0.5 cut-corners cut-border border border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-hover)]/20 px-2.5 py-2">
          <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Search preview</div>
          <div className="mt-1 text-[9px] leading-3 text-[var(--text-tertiary)] truncate">{routeValue}</div>
          <div className="mt-0.5 text-[12px] leading-4 font-medium text-[var(--accent-text)] truncate">
            {form.title || pageTitle}
          </div>
          <div className="mt-0.5 max-h-8 overflow-hidden text-[10px] leading-4 text-[var(--text-secondary)]">
            {form.description || 'Add a description to control how this page appears in search results.'}
          </div>
        </div>
      </ToolSection>

      <ToolDivider />

      <ToolSection title="Social" defaultOpen={false}>
        <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Open Graph</div>
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
        <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">X / Twitter</div>
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
