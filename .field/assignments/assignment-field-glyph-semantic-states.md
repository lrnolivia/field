# assignment-field-glyph-semantic-states.md

---
field_assignment: 1
id: field-glyph-semantic-states
status: active
branch: field/field-glyph-semantic-states
pr: null
base: b7864e88ee5553dafe118ad0e4ede7ca5fa5ebe0
kit: 2026-09-26.4
type: follow-up
execution_class: contract-worker
owned:
  - src/editor/glyph/**
  - src/editor/tools/InteractionsTool.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/CursorTool.tsx
  - src/editor/tools/CursorTool/cursor-icons.tsx
  - src/editor/tools/CursorTool/cursor-picker-grid.tsx
  - src/editor/tools/OverlayTool.tsx
  - src/editor/ui/VariableModal.tsx
  - src/editor/tools/AnimationTool/AddEffectDropdown.tsx
  - src/editor/overlays/settings-shared.tsx
  - src/editor/agent/AgentChat.tsx
  - src/editor/agent/ChangesCard.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/**
  - src/design-system/**
  - src/editor/controls/**
  - src/editor/LayersPanel/**
  - src/editor/left-toolbar/**
  - src/editor/header/**
  - src/editor/gallery/**
  - src/editor/tools/GalleryTool.tsx
  - src/editor/tools/ScaleTool.tsx
  - src/editor/tools/PositionTool/**
  - src/editor/tools/StylesTool/**
  - src/editor/BottomToolbar.tsx
  - src/editor/PropertiesPanel.tsx
  - src/FieldShell.tsx
  - src/canvas/**
  - src/preview-sandbox/**
  - src/backend/**
  - src/code/**
  - cloudflare/**
  - package.json
  - package-lock.json
  - wrangler.jsonc
qa:
  browser_preview: true
  authenticated: false
---

## Goal

Deepen `field.GLYPH` where generic response is no longer enough: when an Interactions, Layout, or Cursor control changes semantic state, the glyph should become its counterpart instead of merely bouncing.

Tranche 2 already solves broad editor reactivity. This successor must not duplicate that work.

## Required semantic upgrades

### Interactions
- add-menu plus -> close while a menu is open, returning to plus when closed
- submenu chevron right -> down for open event/action submenus
- shared add affordances retain reactive `FieldGlyph` behavior
- variable/lightning and other unchanged semantic glyphs use existing `field.GLYPH` response rather than ad-hoc transforms

### Layout
- Layout section add/remove glyph: plus <-> minus based on actual layout state
- padding mode icon actions remain reactive but stable
- grid preset / alignment / distribution glyphs use field-owned response without moving button geometry

### Cursor
- add-cursor plus -> close while picker/menu is open
- pending cancel and remove use semantic minus response
- submenu chevrons reflect open/closed state where present

## Rules

- Use the merged `FieldGlyph` / `FieldMorphGlyph` system; do not introduce another motion abstraction.
- Morphicons remains encapsulated under `src/editor/glyph/**`.
- No generic amplitude increase; only semantic refinement.
- Preserve existing hit targets, keyboard behavior, pointer behavior, and authored values.
- Rapid reversal must remain interruptible.
- Reduced motion still communicates state without spatial flourish.
- Do not touch Gallery, Scale, Dashboard, Canvas, structural shell motion, package manifests, or shared controls in this tranche.

## Runtime acceptance

Branch Preview `/builder/noauth` must prove:
- Interactions plus/close state
- Interactions submenu chevron state
- Layout plus/minus state
- Cursor plus/close state
- at least one rapid reversal in each tool where reachable
- no stale icon state after closing menus
- no hit-target/layout movement
- editor+Canvas health

## Completion

Exact-head branch build PASS, changed-path audit PASS, browser QA PASS, exact-SHA merge gate refresh.
## Performance contract

Animating every editor icon must not make field feel heavier.

Implementation requirements:
- Generic hover/press response stays CSS/transform-driven wherever semantic state is unchanged.
- Use Morphicons only for real state changes; do not render morph machinery for icons that merely need tactile response.
- Animate compositor-friendly properties only: primarily `transform` and `opacity`.
- Do not animate width, height, top, left, padding, margin, grid/flex geometry, filter blur, or other layout/paint-heavy properties for routine glyph feedback.
- No per-frame React state updates, no requestAnimationFrame loops per glyph, and no per-icon hover state in React.
- Do not attach bespoke pointer/mouse listeners to every icon when parent variants/CSS can express the interaction.
- No synchronous layout reads (`getBoundingClientRect`, computed-style measurement, etc.) in the animation interaction path.
- Do not leave `will-change` permanently enabled across the editor icon population. Compositor promotion, if ever needed, must be temporary and justified.
- Reuse shared variants/tokens; do not allocate new animation objects on every render when static definitions work.
- Preserve interruptibility without queuing animation work.
- Reduced-motion paths must be cheaper than full motion, not an alternate JS animation pipeline.

Performance acceptance:
- Canvas/editor interaction remains responsive while rapidly hovering/clicking dense icon clusters.
- No visible scroll/hover jank in dense panels, Layers, toolbars, or inspector controls.
- No measurable growth in DOM geometry/layout work caused by glyph animation.
- Exact-head QA must include a dense-icon stress pass (rapid hover/click/reversal across multiple controls) and report any dropped/sticky/stale animation behavior.
- If broad motion coverage creates a perceptible performance regression, reduce implementation cost before reducing semantic coverage.

## 2026-09-27 hourly glyph sweep expansion

- User requested explicit 25–50 icon batches hourly until complete.
- Batch 2 expands ownership only into currently unclaimed editor surfaces: OverlayTool, VariableModal, Animation AddEffectDropdown, settings-shared, AgentChat, and ChangesCard.
- Dashboard, gallery, loading veil, left rail handoff, and other actively owned paths remain untouched.
