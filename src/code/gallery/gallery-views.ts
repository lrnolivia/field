export type GalleryViewId = 'grid' | 'natural' | 'strip' | 'story' | 'carousel';

export interface GalleryViewDescriptor {
  id: GalleryViewId;
  label: string;
  description: string;
  runtime: 'static' | 'interactive';
  status: 'available' | 'deferred';
}

/**
 * Canonical Terra Prime Gallery vocabulary + composition intent.
 *
 * Authority: the current Terra Prime Figma Pattern Library's
 * `Pattern / Gallery / Desktop` component set (2026-09-25). The concrete
 * desktop references are 1240px wide and use:
 *   Grid    — 3 near-square columns, 24px gutters
 *   Natural — 4-track mosaic, 4px gutters (large + two small + tall)
 *   Strip   — 120px vertical strips, 4px gutters, hovered item expands to 380px
 *   Story   — full-width 620/720px alternating editorial frames, 54px rhythm
 *   Carousel— 520×720 active image inside an 820px stage + prev/next controls
 *
 * Carousel uses native source-backed horizontal scroll snap plus real anchor
 * controls derived from source order. There is no Gallery-only runtime store.
 * Strip remains source-backed through the existing CSS :hover mutation path.
 */
export const GALLERY_VIEWS: readonly GalleryViewDescriptor[] = [
  { id: 'grid', label: 'Grid', description: 'Three-column square grid with 24px gutters.', runtime: 'static', status: 'available' },
  { id: 'natural', label: 'Natural', description: 'Four-track editorial mosaic: large, stacked small, and tall frames.', runtime: 'static', status: 'available' },
  { id: 'strip', label: 'Strip', description: 'Tall 120px image strips; the hovered strip expands to 380px.', runtime: 'interactive', status: 'available' },
  { id: 'story', label: 'Story', description: 'Full-width editorial story frames alternating 620px and 720px high.', runtime: 'static', status: 'available' },
  { id: 'carousel', label: 'Carousel', description: 'Native scroll-snap carousel with a centered 520×720 active image and real previous/next controls.', runtime: 'interactive', status: 'available' },
] as const;

export const AVAILABLE_GALLERY_VIEWS = GALLERY_VIEWS.filter((view) => view.status === 'available');

export const GALLERY_ARIA_PREFIX = 'Gallery — ';
/** Stable source metadata carried as a real CSS custom property. The parser and
 * generator already round-trip custom properties, so Gallery gets explicit
 * semantic identity without taking ownership of generic parser architecture. */
export const GALLERY_VIEW_STYLE_PROPERTY = '--field-gallery-view';
export const GALLERY_ITEM_STYLE_PROPERTY = '--field-gallery-item';
export const GALLERY_NATURAL_SEED_STYLE_PROPERTY = '--field-gallery-natural-seed';

const NATURAL_SLOT_PERMUTATIONS = [
  [0, 1, 2, 3],
  [3, 0, 1, 2],
  [1, 3, 0, 2],
  [2, 0, 3, 1],
  [1, 2, 3, 0],
  [3, 2, 1, 0],
] as const;

export const NATURAL_COMPOSITION_COUNT = NATURAL_SLOT_PERMUTATIONS.length;

export function normalizeGalleryNaturalSeed(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) return 0;
  const integer = Math.trunc(parsed);
  return ((integer % NATURAL_COMPOSITION_COUNT) + NATURAL_COMPOSITION_COUNT) % NATURAL_COMPOSITION_COUNT;
}

export function nextGalleryNaturalSeed(value: string | number | null | undefined): number {
  return (normalizeGalleryNaturalSeed(value) + 1) % NATURAL_COMPOSITION_COUNT;
}
export const TERRA_GALLERY_MAX_WIDTH = '1240px';
export const TERRA_GALLERY_RADIUS = '12px';
export const TERRA_STRIP_HOVER_WIDTH = '380px';
export const TERRA_CAROUSEL_STAGE_HEIGHT = '820px';
export const TERRA_CAROUSEL_IMAGE_WIDTH = '520px';
export const TERRA_CAROUSEL_IMAGE_HEIGHT = '720px';
/**
 * Fluid runtime constraints preserve Terra Prime at desktop while preventing
 * the real website from clipping Gallery content on narrow viewports. These
 * are ordinary source CSS values, not a second breakpoint/document model.
 */
export const RESPONSIVE_GRID_COLUMNS = 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))';
export const RESPONSIVE_NATURAL_COLUMNS = 'repeat(4, minmax(140px, 1fr))';
export const RESPONSIVE_STRIP_HOVER_WIDTH = 'min(380px, calc(100vw - 32px))';
export const RESPONSIVE_CAROUSEL_STAGE_HEIGHT = 'clamp(520px, calc(100vw - 48px), 820px)';
export const RESPONSIVE_CAROUSEL_IMAGE_WIDTH = 'min(520px, calc(100% - 32px))';
export const TERRA_CAROUSEL_CONTROL_SIZE = '38px';
export const GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY = '--field-gallery-carousel-control';
export type GalleryCarouselControlRole = 'previous' | 'counter' | 'next';

/**
 * Accessible naming is intentionally independent from Gallery's editor/runtime
 * metadata. Earlier package drafts encoded the active view in aria-label; keep
 * accepting that source shape for migration, but new Galleries use the stable
 * `--field-gallery-view` custom property and a normal accessible label.
 */
export function galleryAriaLabel(_view?: GalleryViewId): string {
  return 'Gallery';
}

/** Legacy read path for Gallery roots authored by the first package draft. */
export function parseGalleryAriaLabel(value: string | undefined | null): GalleryViewId | null {
  if (!value?.startsWith(GALLERY_ARIA_PREFIX)) return null;
  const label = value.slice(GALLERY_ARIA_PREFIX.length).trim().toLowerCase();
  const descriptor = GALLERY_VIEWS.find((entry) => entry.label.toLowerCase() === label);
  return descriptor?.id ?? null;
}

export function isGalleryViewId(value: string | undefined | null): value is GalleryViewId {
  return GALLERY_VIEWS.some((view) => view.id === value);
}

export function normalizeGalleryViewId(value: string | undefined | null): GalleryViewId {
  return isGalleryViewId(value) ? value : 'grid';
}

const ROOT_RESET: Record<string, string> = {
  display: '',
  gridTemplateColumns: '',
  gridTemplateRows: '',
  gridAutoRows: '',
  gridAutoFlow: '',
  flexDirection: '',
  alignItems: '',
  justifyContent: '',
  overflowX: '',
  overflowY: '',
  scrollSnapType: '',
  scrollBehavior: '',
  scrollbarWidth: '',
  overscrollBehaviorX: '',
  maxWidth: '',
  marginLeft: '',
  marginRight: '',
  width: '100%',
};

const ITEM_RESET: Record<string, string> = {
  [GALLERY_ITEM_STYLE_PROPERTY]: '1',
  margin: '0',
  overflow: 'hidden',
  minWidth: '0',
  width: '',
  maxWidth: '',
  height: '',
  flex: '',
  gridColumn: '',
  gridRow: '',
  aspectRatio: '',
  alignSelf: '',
  transition: '',
  display: '',
  gridTemplateRows: '',
  gridTemplateColumns: '',
  rowGap: '',
  scrollSnapAlign: '',
  scrollSnapStop: '',
  borderRadius: TERRA_GALLERY_RADIUS,
};

const IMAGE_BASE: Record<string, string> = {
  display: 'block',
  width: '100%',
  height: '100%',
  aspectRatio: '',
  maxWidth: '',
  borderRadius: '',
  gridColumn: '',
  gridRow: '',
  justifySelf: '',
  alignSelf: '',
};

export function getGalleryRootPatch(view: GalleryViewId): Record<string, string> {
  const base = {
    ...ROOT_RESET,
    [GALLERY_VIEW_STYLE_PROPERTY]: view,
    maxWidth: TERRA_GALLERY_MAX_WIDTH,
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  switch (view) {
    case 'grid':
      return {
        ...base,
        display: 'grid',
        // 1240px Terra Prime reference resolves to 3 columns; narrower real
        // containers naturally collapse to 2/1 without hidden breakpoint state.
        gridTemplateColumns: RESPONSIVE_GRID_COLUMNS,
        gap: '24px',
      };
    case 'natural':
      return {
        ...base,
        display: 'grid',
        // Keep Terra Prime's four-track mosaic. Below ~572px the tracks keep a
        // usable minimum and scroll INSIDE Gallery rather than crushing or
        // forcing page-level horizontal overflow.
        gridTemplateColumns: RESPONSIVE_NATURAL_COLUMNS,
        gridAutoFlow: 'row',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        overscrollBehaviorX: 'contain',
        gap: '4px',
      };
    case 'strip':
      return {
        ...base,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        // Strip is intrinsically horizontal. Let the real site pan the strip on
        // narrow/touch surfaces instead of making later items unreachable.
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x proximity',
        gap: '4px',
      };
    case 'story':
      return {
        ...base,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '54px',
      };
    case 'carousel':
      return {
        ...base,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '0px',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        overscrollBehaviorX: 'contain',
      };
  }
}

/**
 * Terra Prime Natural repeats a four-item composition:
 *
 *   ┌───────────┬─────┬─────┐
 *   │           │  2  │     │
 *   │     1     ├─────┤  4  │
 *   │           │  3  │     │
 *   └───────────┴─────┴─────┘
 *
 * The Figma reference is 1240×616 with 4px gaps. Four equal CSS tracks make
 * the same geometry responsively without baking pixel coordinates into source.
 */
function naturalPatch(index: number, seed: number): Record<string, string> {
  const group = Math.floor(index / 4);
  const sourceSlot = index % 4;
  const row = group * 2 + 1;
  const permutation = NATURAL_SLOT_PERMUTATIONS[normalizeGalleryNaturalSeed(seed)];
  const visualSlot = permutation[sourceSlot];

  // Shuffle changes which source item owns each visual role, never source order.
  // The four roles still occupy the same reachable four-track mosaic.
  switch (visualSlot) {
    case 0:
      return { gridColumn: '1 / span 2', gridRow: String(row) + ' / span 2', aspectRatio: '1 / 1' };
    case 1:
      return { gridColumn: '3', gridRow: String(row), aspectRatio: '1 / 1' };
    case 2:
      return { gridColumn: '3', gridRow: String(row + 1), aspectRatio: '1 / 1' };
    case 3:
      return { gridColumn: '4', gridRow: String(row) + ' / span 2', aspectRatio: '1 / 2' };
  }

  return {};
}

export function getGalleryIndexGeometryPatch(
  view: GalleryViewId,
  index: number,
  naturalSeed = 0,
): Record<string, string> {
  if (view === 'natural') return naturalPatch(index, naturalSeed);
  if (view === 'story') return { aspectRatio: index % 2 === 0 ? '2 / 1' : '31 / 18' };
  return {};
}

export function getGalleryItemPatch(view: GalleryViewId, index: number, naturalSeed = 0): Record<string, string> {
  const base = { ...ITEM_RESET };
  switch (view) {
    case 'grid':
      return { ...base, aspectRatio: '1 / 1' };
    case 'natural':
      return { ...base, ...getGalleryIndexGeometryPatch(view, index, naturalSeed) };
    case 'strip':
      return {
        ...base,
        flex: '0 0 auto',
        width: '120px',
        height: '620px',
        scrollSnapAlign: 'start',
        transition: 'width 180ms ease',
      };
    case 'story':
      return {
        ...base,
        width: '100%',
        // Figma alternates 1240×620 and 1240×720 frames.
        ...getGalleryIndexGeometryPatch(view, index),
      };
    case 'carousel':
      return {
        ...base,
        display: 'grid',
        flex: '0 0 100%',
        width: '100%',
        // Let the grid rows determine slide height so a narrow real viewport
        // does not carry the desktop-only 874px fixed box.
        height: '',
        gridTemplateRows: RESPONSIVE_CAROUSEL_STAGE_HEIGHT + ' ' + TERRA_CAROUSEL_CONTROL_SIZE,
        gridTemplateColumns: 'minmax(16px, 1fr) 38px 22px auto 22px 38px minmax(16px, 1fr)',
        rowGap: '16px',
        scrollSnapAlign: 'center',
        scrollSnapStop: 'always',
      };
  }
}

/** Per-item image box styles applied when a Gallery view changes. */
export function getGalleryImagePatch(view: GalleryViewId): Record<string, string> {
  // Deliberately excludes objectFit + objectPosition. Those are per-item
  // presentation overrides and must survive view switches.
  if (view === 'carousel') {
    return {
      ...IMAGE_BASE,
      // Exact 520×720 at Terra Prime desktop; shrink horizontally on narrow
      // slides and derive height from the same 13:18 frame ratio.
      width: RESPONSIVE_CAROUSEL_IMAGE_WIDTH,
      height: 'auto',
      aspectRatio: '13 / 18',
      maxWidth: 'none',
      borderRadius: TERRA_GALLERY_RADIUS,
      gridColumn: '1 / -1',
      gridRow: '1',
      justifySelf: 'center',
      alignSelf: 'center',
    };
  }
  return { ...IMAGE_BASE };
}

/** Default fit for a newly-added Gallery image. Existing items keep overrides. */
export function getGalleryDefaultImageFit(_view: GalleryViewId): string {
  return 'cover';
}

/** Source-backed runtime geometry for Carousel controls. */
export function getGalleryCarouselControlPatch(role: GalleryCarouselControlRole): Record<string, string> {
  const isCounter = role === 'counter';
  return {
    [GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY]: role,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gridRow: '2',
    gridColumn: role === 'previous' ? '2' : role === 'counter' ? '4' : '6',
    width: isCounter ? 'auto' : TERRA_CAROUSEL_CONTROL_SIZE,
    minWidth: isCounter ? '0' : TERRA_CAROUSEL_CONTROL_SIZE,
    height: TERRA_CAROUSEL_CONTROL_SIZE,
    border: isCounter ? 'none' : '1px solid currentColor',
    borderRadius: isCounter ? '0' : '19px',
    textDecorationLine: 'none',
    fontSize: isCounter ? '11px' : '15.5px',
    lineHeight: '1',
    color: 'inherit',
    opacity: isCounter ? '0.72' : '1',
    cursor: isCounter ? 'default' : 'pointer',
    pointerEvents: isCounter ? 'none' : 'auto',
    alignSelf: 'center',
    justifySelf: 'center',
  };
}

/** Source-backed runtime behavior for the Terra Prime Strip reference. */
export function getGalleryStripHoverPatch(): Record<string, string> {
  // Desktop still resolves to Terra Prime's 380px expansion. Narrow viewports
  // cap the expanded strip to the visible page width with 16px breathing room.
  return { width: RESPONSIVE_STRIP_HOVER_WIDTH };
}
