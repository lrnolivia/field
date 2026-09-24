# LOEW_THEME — "Minimal UI" editor theme

Cosmetic reskin of Revyme's **editor chrome only**: flat neutral graphite surfaces,
rounded corners, no glass, restrained shadows, a quiet cool accent. Nothing about
layout geometry, workflows, canvas behaviour, Cloudflare routing or the user's site
styling is changed.

## Files

### Ours (new — never conflict with upstream)

| File | Purpose |
|---|---|
| `src/styles/loew-theme.css` | The whole theme: token overrides, cut-corner neutralisation, vibe-button calm-down, glyph-icon support. |
| `src/shared/loew-glyphs.tsx` | `GlyphIcon` — renders a Unicode character in the system font as an SVG-icon drop-in. |
| `LOEW_THEME.md` | This file. |

### Upstream files with tiny edits

| File | Edit |
|---|---|
| `src/main.tsx` | +1 line: `import './styles/loew-theme.css'` **after** `globals.css`. |
| `src/editor/ChromeIslands.tsx` | `GLASS` style → `background: var(--bg-panel)`, `backdropFilter: none`, `boxShadow: var(--shadow-lg)`. (Geometry untouched.) |
| `src/editor/BottomToolbar.tsx` | Backdrop layer's inline glass → `background: var(--bg-toolbar)`, `backdropFilter: none`, `boxShadow: var(--shadow-md)`. |
| `src/editor/left-toolbar/LeftMenu.tsx` | Insert button's hardcoded greens → `--accent` / `--accent-hover` (3 class strings). |
| `src/shared/insert-items/category-icons.tsx` | `CategorySquare` ignores its per-category `bg` and uses `var(--bg-active)` (neutral tiles). |
| `src/shared/icons.tsx` | +1 import; `InsertPlusIcon` and `ReloadIcon` bodies now delegate to `GlyphIcon` (same names, same `className`/`style` API). |

### Deliberately NOT touched

`cloudflare/worker.js`, `wrangler.jsonc`, `app/globals.css`, `src/styles/globals.css`,
`src/styles/globals.{aurora,grove,reef}.css`, `src/shared/builder-themes.ts`,
`src/editor/builder-theme.ts`, `src/App.tsx`, everything under `src/design-system/`,
canvas / sandbox / preview code.

## How it works

`globals.css` declares its tokens inside `@layer theme`. `loew-theme.css` declares the
same tokens **unlayered**, and unlayered always beats layered — so the overrides win
without `!important` or specificity tricks. Runtime **inline** styles on `<html>` still
outrank us, which keeps `builder-theme.ts` (accent picker) and `App.tsx`
(component-mode accent) fully working.

### Tokens overridden

*Dark (primary):* `--bg-canvas #242424`, `--bg-surface #161616`, `--bg-toolbar/--bg-panel #1a1a1a`,
`--bg-hover #2e2e2e`, `--bg-active #383838`, `--bg-tertiary`,
`--canvas-chrome-*`, `--variant-card-*`, all `--text-*` (primary `#f2f2f2`, secondary
`#b6b6b6`, tertiary `#7c7c7c`), `--border-light #2e2e2e`, `--border-default #444444`,
`--grid-line` (= `--control-bg`) `#262626`, `--control-bg-hover/-active`,
`--control-border(-hover)`, `--choice-bg`, `--segmented-bg`, `--slider-bg`,
`--btn-secondary-*`, `--dropdown-bg`, `--shadow-*`.
Every surface is strictly neutral (R = G = B); upstream's slate blues
(`#334155`, `#475569`) are gone.

*Light:* same neutral discipline; slate tints (`#f1f5f9`, `#e2e8f0`, `#cbd5e1`, `#1e293b`)
replaced with pure greys.

*Shared:* `--radius-sm/md/lg` = 4 / 6 / 10 px (+ new `--radius-xl` 12 px; Tailwind's
`rounded-sm/md/lg` read these too), `--shadow-*`, `--cut`, `--cut-round`, accent tokens.

**Not overridden:** `--selection`, `--selection-bg`, `--drop-target` — canvas selection stays blue.

### Cut corners

~1,400 call sites use `.cut-corners` / `.cut-border` / `.cut-sm` / `.cut-lg` / `.cut-br` /
`.cut-tl` …. JSX is untouched; the classes are redefined in `loew-theme.css`:

- `clip-path: none` on every `.cut-*` shape class
- `background-image: none` on `.cut-border` / `.cut-border-tl` (removes the diagonal gradient strokes; the element's own 1 px `border` now follows the radius)
- radius tiers: default `.cut-corners` → 6 px; `+ .cut-sm` → 4 px; `+ .cut-lg` → 10 px
- single-corner variants (`.cut-br`, `.cut-tl`, …) round only the corner that used to be sliced (10 px, 12 px with `.cut-lg`), so docked panels stay flush with the screen edge

The rules are unlayered so they beat Tailwind's layered `rounded-*`, exactly as upstream's classes do.

### Glass

The only two glass recipes were inline styles, so they got small React edits
(`ChromeIslands.tsx`, `BottomToolbar.tsx`): opaque token backgrounds, `backdropFilter: none`.
Left/right islands use `--bg-panel`; the bottom toolbar uses `--bg-toolbar`.

### Shadows

`--shadow-sm` is zero. `--shadow-md/-lg/-xl/-2xl` are soft; they now also give the two
chrome islands and the bottom toolbar a little elevation over the canvas, plus floating
menus and dialogs. Tailwind's `shadow-*` utilities read the same tokens.

### Accent and component mode

- `--accent` `#3d7bd9` (clear blue, white label ~4.2:1). Dark-mode `--accent-text` is lifted toward white so it stays legible on `#181818`.
- `--accent-secondary` (component/master mode) `#2a8067` — muted teal-green, white label 4.8:1, hover `#3a9a7d`. `App.tsx` still aliases `--accent` to it while a component master is open; the page-vs-component distinction is preserved, just no longer purple.
- Selecting a non-default builder theme still works (inline styles win). Note: the **Default** swatch in the theme picker still shows upstream's magenta (`builder-themes.ts` was left alone by design) even though the default *appearance* is now the Minimal accent.
- The "Vibe" agent-working button keeps its rotating ring but loses the neon cyan/magenta, flashing grid and glitching label.

### Icon sizing

Section 5 of `loew-theme.css` shrinks rail icons 18 → 16 px and bottom-toolbar tool icons
22 → 18 px by matching the size utility classes they already carry. Button boxes are unchanged.

### Iconography

Secondary pass; intentionally conservative.

**Replaced with native glyphs** (via `GlyphIcon`, system UI font, `currentColor`):

| Icon component | Glyph |
|---|---|
| `InsertPlusIcon` | `+` |
| `ReloadIcon` | `↻` |

`GlyphIcon` sizes itself from its CSS box (`w-* h-*`) using container-query units, so call
sites did not change. `loew-theme.css` also defines `--loew-font-glyph` and
`--loew-font-emoji` (Apple/Segoe/Noto emoji stack) for future use. No SF Symbols or other
proprietary assets are bundled; no web fonts added.

**SVGs intentionally kept:** every tool / precision icon in `src/shared/icons.tsx`
(frame, text, hand, cursor, layout rows/columns/grid, shapes, path, sketch, viewports,
settings set, CMS, branch, template, alignment, layers/library/globe/etc.), the
sun/moon theme toggle, play, search, comment, and `PlusBadgeIcon` (canvas-resident
overlay). Chevrons, close, check and ellipsis are drawn inline in many component
files rather than in `icons.tsx`; converting them needs a JSX sweep and was left for a
later pass.

## Reapplying / reconciling after an upstream Revyme update

1. Merge/rebase upstream. `loew-theme.css`, `loew-glyphs.tsx` and this file never conflict.
2. Re-check the four tiny edits: `git diff upstream/main -- src/main.tsx src/editor/ChromeIslands.tsx src/editor/BottomToolbar.tsx src/shared/icons.tsx`. If one conflicts, redo it by hand (each is a few lines, described above).
3. If upstream **adds a token** to `globals.css`, decide whether it needs a Minimal value and add it to `loew-theme.css`. If it adds a new `.cut-*` class, add a matching `clip-path: none` / radius rule in section 2.
4. If upstream adds a **new inline glass recipe**, flatten it the same way as the two above.
5. Run `npm run build:all` and `npx vitest run src/styles src/shared/builder-themes.test.ts`.
6. To disable the theme entirely: remove the one import in `src/main.tsx` (and revert the three inline/icon edits).

## Known remaining inconsistencies (need JSX changes — not done)

- The Utility category icon's gear still has its own pinkish fill.
- Padding/density is untouched (still upstream's).
- Other hardcoded hex colours in components (e.g. `border-[#555]`) bypass the tokens.
- Modal scrim uses `backdrop-filter: blur(4px)` inline in `design-system/Modal.tsx`.
- Inline chevron / close / check / ellipsis SVGs (see Iconography).
