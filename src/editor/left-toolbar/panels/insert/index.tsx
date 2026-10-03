// index.tsx — Main InsertOverlay component with sidebar + secondary panel.
// Hover-driven: hovering a sidebar category opens the secondary detail panel.
// Secondary panel is full-height, same width as first sidebar, opens cleanly to the right.

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { trace } from '@/shared/debug-trace';
import { CATEGORIES, CREATIVE_CATEGORIES, type InsertCategory, type InsertItem } from '@/shared/insert-items/element-data';
import { CATEGORY_ICON_MAP } from '@/shared/insert-items/category-icons';
import { ELEMENT_ICON_MAP } from '@/shared/insert-items/element-icons';
import { TextCardGlyph, isTextCardGlyph } from '@/editor/glyph/text-card-glyph';
import { CmsFieldGlyph, CmsNavGlyph, CmsCollectionGlyph } from '@/shared/insert-items/cms-field-glyphs';
import DSidebarRow from '@/design-system/SidebarRow';
import SectionLabel from '@/design-system/SectionLabel';
import MediaActionCard from '@/editor/media/MediaActionCard';
import InsertItemPreview from '@/editor/media/InsertItemPreview';
import SearchBar from '@/design-system/SearchBar';
import UiHeadingText from '@/design-system/UiHeadingText';
import { startToolbarDrag } from '@/canvas/drag/toolbar-drag-bridge';
import { getToolbarItemConfig } from '@/canvas/drag/toolbar-item-config';
import { blueprintToToolbarItem } from '@/canvas/section-insert';
import { insertToolbarItemAtVisibleCenter } from '@/canvas/insert-toolbar-item';
import { SECTION_THUMBS } from '@/shared/insert-items/section-thumb-map';
import { SHADER_THUMBS } from '@/shared/insert-items/shader-thumb-map';
import { isPreviewIcon } from '@/shared/insert-items/icon-style-utils';
import { collectionSchemasAtom } from '@/code/stores/cms-store';
import { cmsPageMetaAtom } from '@/code/stores/cms-page-store';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { toolbarPanelAtom } from '@/editor/toolbar-panel-store';

const FIELD_INSERT_CATEGORIES: InsertCategory[] = CATEGORIES;

// ─── Chevron Right ─────────────────────────────────────────────────────────

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Insert Category Row (uses design system SidebarRow + chevron) ─────────

function InsertCategoryRow({ iconKey, label, isActive, onMouseEnter, onClick }: {
  iconKey: string; label: string; isActive: boolean; onMouseEnter: () => void; onClick: () => void;
}) {
  const IconComponent = CATEGORY_ICON_MAP[iconKey];
  return (
    <DSidebarRow
      size="lg"
      icon={IconComponent ? <IconComponent /> : <div className="w-5 h-5 rounded bg-gray-600" />}
      label={label}
      isActive={isActive}
      iconColor="inherit"
      right={<ChevronRight className={`transition-all duration-150 ${isActive ? 'text-[var(--text-primary)] translate-x-0.5' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5'}`} />}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
    />
  );
}

import { IconPanel } from './IconPanel';
import { SocialIcon } from 'react-social-icons/component';
// Side-effect imports: each network's icon registers itself on import.
// Pulling them in here loads the SocialIcon library's brand-correct
// renderings (Google Maps' multi-color G, Spotify's wordmark green,
// TikTok's split cyan/red, etc.) into the runtime registry.
import 'react-social-icons/youtube';
import 'react-social-icons/vimeo';
import 'react-social-icons/soundcloud';
import 'react-social-icons/spotify';
import 'react-social-icons/google';
import 'react-social-icons/facebook';
import 'react-social-icons/x';
import 'react-social-icons/instagram';
import 'react-social-icons/linkedin';
import 'react-social-icons/pinterest';
import 'react-social-icons/tiktok';

// ─── Gradient Card (for Creative/Utility items with gradientColors) ───────

/** Some utility iconKeys (`noiseFilmGrain`, `dividerWave`, `patternGrid`,
 *  `shaderWaveLines`, …) are full-width SVG / CSS previews of the actual
 *  effect — they already render at `w-full h-12` and don't want to be
 *  wrapped in the 44px brand circle the integrations use. This predicate
 *  routes them down the wide-preview branch. */
// ─── Grid Card ─────────────────────────────────────────────────────────────

interface GridCardProps {
  item: InsertItem;
}

function useInsertCard(item: InsertItem) {
  const lastDragAt = useRef(0);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (move: PointerEvent) => {
      if (Math.hypot(move.clientX - startX, move.clientY - startY) < 5) return;
      cleanup();
      const config = item.sectionBlueprintId
        ? blueprintToToolbarItem(item.sectionBlueprintId)
        : getToolbarItemConfig(item.id);
      if (!config) return;
      lastDragAt.current = Date.now();
      move.preventDefault();
      trace.action('insert-panel:drag-start', { itemId: item.id });
      startToolbarDrag(config, move);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  }, [item.id, item.sectionBlueprintId]);
  const onClick = useCallback(() => {
    if (Date.now() - lastDragAt.current < 400) return;
    insertToolbarItemAtVisibleCenter(item.id, item.sectionBlueprintId);
  }, [item.id, item.sectionBlueprintId]);
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onClick();
  }, [onClick]);
  return { onPointerDown, onClick, onKeyDown, role: 'button' as const, tabIndex: 0,
    'aria-label': `Insert ${item.name} at canvas center` };
}

function GridCard({ item }: GridCardProps) {
  const { onPointerDown, onClick, 'aria-label': ariaLabel } = useInsertCard(item);
  const Icon = ELEMENT_ICON_MAP[item.iconKey];
  const thumb = item.sectionBlueprintId ? SECTION_THUMBS[item.sectionBlueprintId] : SHADER_THUMBS[item.id];
  const animatedPreview = Icon && isPreviewIcon(item.iconKey);
  const glyph = isTextCardGlyph(item.iconKey) ? <TextCardGlyph kind={item.iconKey} />
    : animatedPreview ? <InsertItemPreview itemId={item.id} iconKey={item.iconKey} />
    : thumb ? <img src={thumb} alt="" draggable={false} className="h-full w-full object-cover" />
    : item.socialNetwork ? <SocialIcon network={item.socialNetwork} as="div" style={{ width: 30, height: 30 }} />
    : item.cmsNav ? <CmsNavGlyph dir={item.cmsNav} />
    : item.cmsFieldType ? <CmsFieldGlyph type={item.cmsFieldType} />
    : item.cmsCollection ? <CmsCollectionGlyph />
    : Icon ? <span className="flex h-7 w-7 items-center justify-center overflow-hidden [&_svg]:max-h-7 [&_svg]:max-w-7"><Icon /></span> : null;
  return <MediaActionCard context="insert" label={item.name} glyph={glyph}
    onClick={onClick} onPointerDown={onPointerDown} itemId={item.id} ariaLabel={ariaLabel} />;
}

// ─── Secondary Panel Content ──────────────────────────────────────────────

interface SecondaryPanelContentProps {
  category: InsertCategory;
  sectionId?: string;
}

export function SecondaryPanelContent({ category, sectionId }: SecondaryPanelContentProps) {
  trace.fn('InsertOverlay:SecondaryPanelContent.render', { category: category.id });

  // Lets the "Create Collection" empty-state button switch the sidebar
  // from Insert → CMS so the user lands in the panel where they can
  // actually create one. Hook called unconditionally (rules-of-hooks)
  // even though only the cms-collections empty path uses it.
  const setLeftPanel = useSetAtom(leftPanelAtom);

  // Icons category: render the Iconify-powered browser instead of the
  // standard sections grid. This category has no static items — content
  // is fetched live from api.iconify.design and dragged onto the canvas
  // as <img> elements pointing at the SVG endpoint.
  if (category.id === 'icons') {
    return <IconPanel />;
  }

  // Conditionally inert categories (e.g. CMS Fields off a detail page)
  // carry an `emptyStateMessage` — the row stays visible in the sidebar
  // for discoverability, and hovering opens this hint instead of an
  // empty grid.
  if (category.emptyStateMessage) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <span className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-[220px]">
          {category.emptyStateMessage}
        </span>
      </div>
    );
  }

  const sections = sectionId
    ? category.sections.filter((section) => section.id === sectionId)
    : category.sections;

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <span className="text-xs text-[var(--text-tertiary)]">Coming soon</span>
      </div>
    );
  }

  // Friendly empty-state for the CMS Collections category before the
  // user has created any collections. Shown instead of a blank
  // "Collections" grid. The "Create Collection" button jumps the user
  // straight to the CMS panel (via `leftPanelAtom`) — saves them the
  // sidebar-navigation step they'd otherwise have to do.
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);
  if (category.id === 'cms-collections' && totalItems === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)]">No collections yet</span>
        <span className="text-[10px] text-[var(--text-disabled)] max-w-[220px] leading-relaxed">
          Create a collection to start binding cards, lists, and pages to dynamic content.
        </span>
        <button
          type="button"
          onClick={() => {
            trace.action('insert-panel:empty-collections:open-cms');
            setLeftPanel('cms');
          }}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 cut-corners text-[11px] font-semibold cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Collection
        </button>
      </div>
    );
  }

  const gridCols =
    category.columns === 1 ? 'grid-cols-1'
    : 'grid-cols-2';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
      {sections.map(section => (
        <div key={section.id}>
          {/* Section labels render in Title Case (e.g. "Forms") — no
              uppercase/letter-spacing transforms. The category-level
              header is intentionally absent so the panel opens straight
              into content (matches the reference the reference/legacy builder). */}
          <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2.5 px-1">
            <UiHeadingText>{section.label}</UiHeadingText>
          </h3>
          <div className={`grid ${gridCols} ${category.columns === 1 ? 'gap-3' : 'gap-1.5'}`}>
            {section.items.map(item => (
              <GridCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main InsertOverlay ────────────────────────────────────────────────────

/** Width of the first sidebar panel (set by LeftPanel.tsx). */
const SIDEBAR_WIDTH = 256;
/** Width of the secondary detail panel. */
const SECONDARY_WIDTH = 270;
/** Left menu icon strip width. */
const MENU_WIDTH = 52;
/** Top toolbar height. */
const TOP_BAR = 52;

export default function InsertOverlay() {
  trace.fn('InsertOverlay.render');

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [floatingInsertRect, setFloatingInsertRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const update = () => {
      const rect = document.querySelector('[data-floating-left-panel="insert"]')?.getBoundingClientRect() ?? null;
      setFloatingInsertRect((previous) => previous?.left === rect?.left && previous?.top === rect?.top
        && previous?.width === rect?.width && previous?.height === rect?.height ? previous : rect);
    };
    update();
    window.addEventListener('pointermove', update);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('pointermove', update); window.removeEventListener('resize', update); };
  }, []);
  const setToolbarPanel = useSetAtom(toolbarPanelAtom);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search ──────────────────────────────────────────────────────────────
  // Two layers: the raw input value (re-renders on every keystroke for
  // controlled-input UX) and a debounced version that drives the actual
  // result computation. 150ms is the sweet spot for type-and-see — fast
  // enough that results feel live, slow enough that we don't re-filter
  // on each individual key while typing a longer word.
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const searchActive = debouncedQuery.trim().length > 0;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setActiveCategory(null);
      trace.action('insert-overlay:close-secondary');
    }, 200);
  }, [cancelClose]);

  const handleCategoryHover = useCallback((categoryId: string) => {
    cancelClose();
    setActiveCategory(categoryId);
    // Note: search text is INTENTIONALLY left alone here. The portal
    // priority below routes `activeCategory` ahead of `searchActive`,
    // so hovering a category swaps the panel display without nuking
    // the input. Mouse-out of the category (`scheduleClose` → null
    // activeCategory) falls back to the SearchResultsPanel if the
    // input still has text — the user can keep their query around as
    // a tab they can flip back to by un-hovering.
    trace.action('insert-overlay:hover-category', { categoryId });
  }, [cancelClose]);

  // CMS lives in its OWN top-level group ("CMS") between Insert and
  // Community Blocks — see the JSX below. It exposes two sibling
  // categories so each one opens its own secondary panel:
  //
  //   - cms-collections : one card per collection in the user's CMS
  //     (cms/*.schema.json). Drag drops a list bound to that collection
  //     (`cms:<slug>` toolbar id, resolved by toolbar-item-config).
  //
  //   - cms-fields : one card per field across all collections,
  //     prefixed with the collection name so duplicates (e.g. multiple
  //     `title` fields) stay disambiguated. Drag drops a type-aware
  //     placeholder (`<img>` for image, `<a>` for link, swatch `<div>`
  //     for color, `<p>` text otherwise) carrying a binding hint that
  //     auto-rewires when the drop lands inside a `.map(…)`.
  //
  // Empty when the user has no collections — the rows still render but
  // the secondary panel has no cards.
  const cmsSchemas = useAtomValue(collectionSchemasAtom);

  const cmsCollectionsCategory = useMemo<InsertCategory>(() => {
    const items: InsertItem[] = Array.from(cmsSchemas.entries()).map(([slug, schema]) => ({
      id: `cms:${slug}`,
      name: schema.name || slug,
      iconKey: 'collection',
      cmsCollection: true,
    }));
    return {
      id: 'cms-collections',
      label: 'Collections',
      iconKey: 'cmsCollections',
      columns: 1,
      sections: [{ id: 'collections', label: 'Collections', items }],
    };
  }, [cmsSchemas]);

  // Fields are scoped to the active detail page's collection. The row
  // is ALWAYS visible in the CMS group (so the affordance is
  // discoverable), but when the active file isn't a detail page the
  // secondary panel renders an empty-state message instead of cards —
  // there's no binding target outside a CMS context, so we explain
  // rather than silently show nothing.
  const cmsPageMeta = useAtomValue(cmsPageMetaAtom);
  const cmsFieldsCategory = useMemo<InsertCategory>(() => {
    if (cmsPageMeta?.kind !== 'detail') {
      return {
        id: 'cms-fields',
        label: 'Fields',
        iconKey: 'cmsFields',
        columns: 1,
        sections: [],
        emptyStateMessage: 'Fields available only on detail pages.',
      };
    }
    const schema = cmsSchemas.get(cmsPageMeta.collection);
    if (!schema) {
      return {
        id: 'cms-fields',
        label: 'Fields',
        iconKey: 'cmsFields',
        columns: 1,
        sections: [],
        emptyStateMessage: `No schema found for collection "${cmsPageMeta.collection}".`,
      };
    }
    const items: InsertItem[] = (schema.fields ?? []).map(f => ({
      id: `cmsField:${cmsPageMeta.collection}:${f.id}`,
      name: f.name,
      iconKey: 'collectionField',
      cmsFieldType: f.type,
    }));
    // Prev/Next nav links — drop an <a> that navigates to the adjacent
    // item's detail page (resolved from the collection order).
    items.push(
      {
        id: `cmsFieldNav:${cmsPageMeta.collection}:prev`,
        name: '← Previous',
        iconKey: 'collectionField',
        cmsNav: 'prev',
      },
      {
        id: `cmsFieldNav:${cmsPageMeta.collection}:next`,
        name: 'Next →',
        iconKey: 'collectionField',
        cmsNav: 'next',
      },
    );
    return {
      id: 'cms-fields',
      label: 'Fields',
      iconKey: 'cmsFields',
      columns: 1,
      sections: [{ id: 'fields', label: 'Fields', items }],
    };
  }, [cmsSchemas, cmsPageMeta]);

  const cmsCategories = useMemo(() => [cmsCollectionsCategory, cmsFieldsCategory], [cmsCollectionsCategory, cmsFieldsCategory]);

  // ── Search results ─────────────────────────────────────────────────────
  // Walks every InsertItem across Insert + Creative + CMS categories and
  // filters by case-insensitive substring. The match target is BOTH
  // the item's own name AND its parent section label / category label —
  // so typing "divi" surfaces every item under the "Dividers" section
  // (without forcing each divider's `name` to contain "divider"), and
  // typing "card" pulls every card across the Layouts section.
  //
  // Match priority: when a SECTION label matches, the entire section's
  // items are included as if the user clicked into that section.
  // When the parent CATEGORY label matches, every item in every section
  // of that category is included (e.g. "Effects" → all effects).
  // Per-item name matches always win on a one-by-one basis.
  //
  // Memoised on `debouncedQuery` (not raw input) + `cmsCategories` (CMS
  // schemas can change while the panel is open). Empty array when no
  // query — cheap short-circuit before walking the tree.
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const all = [...FIELD_INSERT_CATEGORIES, ...CREATIVE_CATEGORIES, ...cmsCategories];
    const groups: Array<{ id: string; label: string; items: InsertItem[] }> = [];
    for (const cat of all) {
      const categoryMatches = cat.label.toLowerCase().includes(q);
      const matched: InsertItem[] = [];
      // Dedup by item.id within this category — when both the section
      // label and a leaf name match, we don't want the item appearing
      // twice in the same group.
      const seen = new Set<string>();
      for (const section of cat.sections) {
        const sectionMatches = section.label.toLowerCase().includes(q);
        for (const item of section.items) {
          if (
            categoryMatches ||
            sectionMatches ||
            item.name.toLowerCase().includes(q)
          ) {
            if (!seen.has(item.id)) {
              matched.push(item);
              seen.add(item.id);
            }
          }
        }
      }
      if (matched.length > 0) groups.push({ id: cat.id, label: cat.label, items: matched });
    }
    return groups;
  }, [searchActive, debouncedQuery, cmsCategories]);

  // CATEGORIES is the Insert group — CMS / Creative no longer live there.
  // The secondary-panel lookup must search Insert + Creative + CMS
  // categories so hovering any of those rows opens the right detail panel.
  const renderedCategories = FIELD_INSERT_CATEGORIES;
  const activeCategoryData = activeCategory
    ? [...renderedCategories, ...CREATIVE_CATEGORIES, ...cmsCategories].find(c => c.id === activeCategory) ?? null
    : null;
  const secondaryOpensLeft = !!floatingInsertRect && floatingInsertRect.right + SECONDARY_WIDTH + 8 > window.innerWidth;
  const secondaryLeft = floatingInsertRect
    ? secondaryOpensLeft ? Math.max(8, floatingInsertRect.left - SECONDARY_WIDTH) : floatingInsertRect.right
    : MENU_WIDTH + SIDEBAR_WIDTH;

  // Sidebar category rows — the Insert / CMS / Creative groups below render
  // the exact same row markup, so they share this one helper.
  const renderCategoryRows = (cats: InsertCategory[]) => cats.map(cat => (
    <InsertCategoryRow
      key={cat.id}
      iconKey={cat.iconKey}
      label={cat.label}
      isActive={activeCategory === cat.id}
      onMouseEnter={() => handleCategoryHover(cat.id)}
      onClick={() => {
        setActiveCategory(null);
        setToolbarPanel({ kind: 'insert', category: cat.id, categoryData: cat });
      }}
    />
  ));

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      {/* Sidebar -- fills the 256px panel */}
      <div className="flex flex-col flex-1">
        {/* Search input — typing here filters EVERY InsertItem across
            Insert + Creative + CMS categories and opens a results panel
            to the right of the sidebar (same slot the hover-based
            category panel uses, just with search results instead).
            Theme-mirrored bg / hover / focus tints match the
            PageSelector search styling so the two read as the same
            tier of input. ESC clears + closes. */}
        {/* `pt-[12px]` matches the rail's top padding so the input sits on the
            same line as the Vibe icon beside it. */}
        <div className="px-2 pt-2 pb-1">
          <SearchBar value={searchQuery} placeholder="Search elements…" onFocus={cancelClose}
            onChange={value => { setSearchQuery(value); if (value) setActiveCategory(null); }}
            onKeyDown={event => { if (event.key === 'Escape') { setSearchQuery(''); setDebouncedQuery(''); event.currentTarget.blur(); } }}
          />
        </div>
        <div data-field-panel-section>
          <SectionLabel size="md">Insert</SectionLabel>

        {/* Main categories */}
        <div className="px-2">
          {renderCategoryRows(renderedCategories)}
        </div>

        </div>
        <div data-field-panel-section>

        {/* CMS — its own top-level group, sibling to Insert and Creative.
            Surfaces Collections + Fields as two separate rows so each
            opens its own secondary panel. */}
        <SectionLabel size="md">CMS</SectionLabel>
        <div className="px-2">
          {renderCategoryRows(cmsCategories)}
        </div>

        </div>
        <div data-field-panel-section>

        {/* Creative — promoted from a single Insert row into its OWN
            top-level group. Each of the five ex-sections (Effects /
            Backgrounds / Text Effects / Containers / Cursors) is a
            sibling row that opens its own secondary panel. Categories
            defined in `CREATIVE_CATEGORIES`. */}
        <SectionLabel size="md">Creative</SectionLabel>
        <div className="px-2 pb-2">
          {renderCategoryRows(CREATIVE_CATEGORIES)}
        </div>
        </div>
      </div>

      {/* Secondary panel — full-height sidebar via portal, adjacent to the first.
          The category title (Utility / Integrations / Elements …) is NOT
          rendered up top; the active item in the primary sidebar is the
          source of truth for which category is open, and a header here
          just duplicated that affordance. Content opens directly. */}
      {/* Secondary panel — hover-based category wins over search when
          BOTH are active, so the user can pick a specific category from
          the sidebar without losing their search text. Mouse-out of the
          category clears `activeCategoryData` and the panel falls back
          to the SearchResultsPanel automatically (if there's still
          query text). Either state on its own works as expected:
          search-only when nothing is hovered, hover-only when search
          is empty. Clearing both → portal closes. */}
      {(activeCategoryData || searchActive) && createPortal(
        <motion.div
          data-editor-panel="left-secondary"
          // z-[9999] is one above the bottom toolbar (z-[9998] in
          // editor/BottomToolbar.tsx). The old z-[5000] meant the
          // toolbar floated over the bottom edge of the secondary panel
          // — annoying when scanning shape / layout tiles that sit low
          // in the panel. Now the secondary sidebar covers the toolbar
          // along its full height while open.
          className={`fixed bg-[var(--bg-panel)] flex min-h-0 flex-col overflow-hidden shadow-2xl ${floatingInsertRect ? 'z-[11001] rounded-r-[9px]' : 'z-[9999]'}`}
          initial={{ opacity: 0, x: -14, scaleX: 0.96 }}
          animate={{ opacity: 1, x: 0, scaleX: 1 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            left: secondaryLeft,
            top: floatingInsertRect ? floatingInsertRect.top + 44 : 0,
            width: Math.min(SECONDARY_WIDTH, window.innerWidth - secondaryLeft - 8),
            height: floatingInsertRect ? Math.max(100, floatingInsertRect.height - 44) : '100vh',
            transformOrigin: secondaryOpensLeft ? 'right center' : 'left center',
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {activeCategoryData ? (
            <SecondaryPanelContent category={activeCategoryData} />
          ) : (
            <SearchResultsPanel
              query={debouncedQuery}
              groups={searchResults}
            />
          )}
        </motion.div>,
        document.body,
      )}
    </div>
  );
}

// ─── Search Results Panel ──────────────────────────────────────────────────
//
// Render every matching InsertItem in a 2-column grid, grouped by source
// category (so "Frame" from Insert > Basic reads differently from
// "Frame" anywhere else, and grouping makes scanning easier). Auto-scrolls
// when results exceed the panel height; the panel itself stays at full
// height so the grid expands organically as the user types more.
// Empty result set shows a friendly "no matches" hint instead of a
// blank panel.

interface SearchResultsPanelProps {
  query: string;
  groups: Array<{ id: string; label: string; items: InsertItem[] }>;
}

function SearchResultsPanel({ query, groups }: SearchResultsPanelProps) {
  trace.fn('InsertOverlay:SearchResultsPanel.render', {
    query, groupCount: groups.length,
    matchCount: groups.reduce((n, g) => n + g.items.length, 0),
  });

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          No matches for &ldquo;{query.trim()}&rdquo;
        </span>
        <span className="text-[10px] text-[var(--text-disabled)] max-w-[220px] leading-relaxed">
          Try a different keyword, or clear the search to browse all
          elements by category.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
      {groups.map(group => (
        <div key={group.id}>
          <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2.5 px-1">
            {group.label}
            <span className="ml-1.5 font-normal text-[var(--text-disabled)]">
              · {group.items.length}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {group.items.map(item => (
              <GridCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
