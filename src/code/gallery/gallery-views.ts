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
 * Carousel remains registered but deferred because it needs real runtime state.
 * Strip is available because its hover expansion can be expressed through the
 * existing source-backed CSS :hover mutation path — no editor-only simulation.
 */
export const GALLERY_VIEWS: readonly GalleryViewDescriptor[] = [
  { id: 'grid', label: 'Grid', description: 'Three-column square grid with 24px gutters.', runtime: 'static', status: 'available' },
  { id: 'natural', label: 'Natural', description: 'Four-track editorial mosaic: large, stacked small, and tall frames.', runtime: 'static', status: 'available' },
  { id: 'strip', label: 'Strip', description: 'Tall 120px image strips; the hovered strip expands to 380px.', runtime: 'interactive', status: 'available' },
  { id: 'story', label: 'Story', description: 'Full-width editorial story frames alternating 620px and 720px high.', runtime: 'static', status: 'available' },
  { id: 'carousel', label: 'Carousel', description: 'Centered 520×720 stage with previous/next runtime controls.', runtime: 'interactive', status: 'deferred' },
] as const;

export const AVAILABLE_GALLERY_VIEWS = GALLERY_VIEWS.filter((view) => view.status === 'available');

export const GALLERY_ARIA_PREFIX = 'Gallery — ';
/** Stable source metadata carried as a real CSS custom property. The parser and
 * generator already round-trip custom properties, so Gallery gets explicit
 * semantic identity without taking ownership of generic parser architecture. */
export const GALLERY_VIEW_STYLE_PROPERTY = '--field-gallery-view';
export const GALLERY_ITEM_STYLE_PROPERTY = '--field-gallery-item';
export const TERRA_GALLERY_MAX_WIDTH = '1240px';
export const TERRA_GALLERY_RADIUS = '12px';
export const TERRA_STRIP_HOVER_WIDTH = '380px';

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
  borderRadius: TERRA_GALLERY_RADIUS,
};

const IMAGE_BASE: Record<string, string> = {
  display: 'block',
  width: '100%',
  height: '100%',
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
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '24px',
      };
    case 'natural':
      return {
        ...base,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gridAutoFlow: 'row',
        gap: '4px',
      };
    case 'strip':
      return {
        ...base,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        overflowX: 'hidden',
        overflowY: 'hidden',
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
      // Registered semantic identity only. Do not invent a fake static
      // carousel layout: the runtime interaction is intentionally deferred.
      return base;
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
function naturalPatch(index: number): Record<string, string> {
  const group = Math.floor(index / 4);
  const slot = index % 4;
  const row = group * 2 + 1;

  switch (slot) {
    case 0:
      return { gridColumn: '1 / span 2', gridRow: `${row} / span 2`, aspectRatio: '1 / 1' };
    case 1:
      return { gridColumn: '3', gridRow: String(row), aspectRatio: '1 / 1' };
    case 2:
      return { gridColumn: '3', gridRow: String(row + 1), aspectRatio: '1 / 1' };
    case 3:
      return { gridColumn: '4', gridRow: `${row} / span 2`, aspectRatio: '1 / 2' };
  }

  // `index % 4` is always 0..3 at runtime; this fallback exists only because
  // TypeScript does not narrow arithmetic modulo results to that finite set.
  return {};
}

export function getGalleryItemPatch(view: GalleryViewId, index: number): Record<string, string> {
  const base = { ...ITEM_RESET };
  switch (view) {
    case 'grid':
      return { ...base, aspectRatio: '1 / 1' };
    case 'natural':
      return { ...base, ...naturalPatch(index) };
    case 'strip':
      return {
        ...base,
        flex: '0 0 auto',
        width: '120px',
        height: '620px',
        transition: 'width 180ms ease',
      };
    case 'story':
      return {
        ...base,
        width: '100%',
        // Figma alternates 1240×620 and 1240×720 frames.
        aspectRatio: index % 2 === 0 ? '2 / 1' : '31 / 18',
      };
    case 'carousel':
      return base;
  }
}

/** Per-item image box styles applied when a Gallery view changes. */
export function getGalleryImagePatch(_view: GalleryViewId): Record<string, string> {
  // Deliberately excludes objectFit + objectPosition. Those are per-item
  // presentation overrides and must survive view switches.
  return { ...IMAGE_BASE };
}

/** Default fit for a newly-added Gallery image. Existing items keep overrides. */
export function getGalleryDefaultImageFit(_view: GalleryViewId): string {
  return 'cover';
}

/** Source-backed runtime behavior for the Terra Prime Strip reference. */
export function getGalleryStripHoverPatch(): Record<string, string> {
  return { width: TERRA_STRIP_HOVER_WIDTH };
}
