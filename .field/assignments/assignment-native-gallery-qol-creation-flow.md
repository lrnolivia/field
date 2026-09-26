---
field_assignment: 1
id: native-gallery-qol-creation-flow
status: active
branch: field/native-gallery-qol-creation-flow
pr: 3
pr_url: https://github.com/lrnolivia/field/pull/3
branch_head: f8852136f80329a873fe6862c9031a98876dc01d
base: 7e585a2fe66e062bae8a46041a6e08901027f9a8
kit: 2026-09-26.3
type: migrated-product-continuation
execution_class: contract-worker
source_chat: field Gallery Worker
source_legacy_assignment: native-gallery-completion-hardening-20260925
source_implementation_commit: 1a84843ad3b24cd8572545cba05409fb48b3715a
owned:
  - src/code/gallery/**
  - src/canvas/gallery/**
  - src/editor/gallery/**
  - src/editor/tools/GalleryTool.tsx
  - src/editor/ui/ImageSearchModal.tsx
approved_shared: []
protected:
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/mutation/**
  - src/code/stores/**
  - src/canvas/drag/**
  - src/canvas-sandbox/**
  - src/preview-sandbox/**
  - src/backend/**
  - src/dashboard/**
  - src/design-system/**
  - cloudflare/**
  - package.json
  - package-lock.json
  - wrangler.jsonc
qa:
  firecrawl: true
  authenticated: false
---

# native Gallery — Function QoL + Creation Flow

## Mission

Take field's now-functional native Gallery from “the feature works” to a fast, direct, professional authoring system whose interaction model is strong enough that the following Gallery assignment can focus almost entirely on visual/Inspector redesign.

This is a deliberately large functional tranche. Do not split it into micro-phases unless an ownership boundary or verified architecture conflict forces a split.

The desired user experience is:

- adding a Gallery begins with a guided setup flow instead of dropping a confusing empty component into the Inspector
- arranging images happens naturally on the canvas as well as in the Inspector
- Reposition behaves like a real media-edit mode rather than a tiny crop affordance
- source image proportions can participate in every Gallery layout when desired
- Natural can generate alternate compositions without scrambling semantic content order
- all authored treatment survives view changes, responsive editing, Preview, production, duplicate, replace, undo, and redo
- after this tranche, the remaining major Gallery problem is UI clarity/polish, not missing functional fundamentals

## Product end state

At completion, Gallery should feel like a native field design primitive rather than a CMS widget.

It should have one deterministic source-backed content model, five presentation modes, direct manipulation, a first-run creation flow, media transform editing, responsive/runtime parity, and coherent history behavior.

The user should be able to create a Gallery, choose media and a layout, arrange it visually, adjust each image, switch views, preview the result, and continue editing without needing to understand field's implementation details.

A separate successor assignment will then redesign the Gallery Inspector and wizard presentation to Figma UI3-level clarity. This assignment must not prematurely spend the tranche on visual polish while functional semantics are still changing.

## Current verified baseline

The existing Gallery implementation is already landed.

Latest Gallery hardening source:

`1a84843ad3b24cd8572545cba05409fb48b3715a`
`feat: complete and harden native Gallery`

Legacy assignment `native-gallery-completion-hardening-20260925` was formally closed on main at:

`7e585a2fe66e062bae8a46041a6e08901027f9a8`

That closeout records:

- focused Gallery regression suites passed
- TypeScript passed
- `build:all` passed
- production build verification through immediate descendant `a873a3f9eeef696a25b6e330a58a41503411747f`
- Cloudflare `Workers Builds: field` check-run `108318214279` completed successfully
- human live smoke confirmed the Gallery is fast and all five views work

The hardening source had no direct check-run because a tracker-only descendant advanced HEAD; the current handoff kit explicitly says deployment verification follows the actual build-triggering HEAD. Do not reopen this as a deployment defect.

## Existing Gallery capabilities that must not regress

The current source-backed Gallery already includes:

- Grid
- Natural
- Strip
- Story
- Carousel
- ordered real media children in source
- multi-select media insertion
- add / replace / duplicate / remove / reorder
- responsive Gallery layout behavior through field's normal override system
- per-image alt text
- per-image `object-fit`
- focal / `object-position` reposition
- Carousel scroll snap and source-backed previous / counter / next controls
- authored Gallery accessible-name preservation
- authored Carousel item DOM ID and `aria-label` preservation
- one-image Carousel with no dead controls
- keyboard focal nudging with arrows and Shift = 5%
- media-picker accessible labels and live selected-count announcement
- dedupe of duplicate canonical URLs within one picker selection
- cleanup of stale Natural/Story index-derived responsive geometry after reorder/remove/duplicate

Do not rebuild these fundamentals or replace them with a second Gallery document model.

## Settled architecture decisions

### One document model

Gallery content remains real ordered source media children.

Do not create a Gallery-only runtime store, shadow order array, private wizard config blob that becomes more authoritative than source, or separate hidden Galleries for different views.

Grid / Natural / Strip / Story / Carousel are presentations of the same authored Gallery.

### Preview is runtime truth

Design, source, Preview, and production must stay aligned.

When parity breaks, find the first point of divergence. Do not cosmetically mask it in Design.

### Functional QoL before visual redesign

The current Gallery Inspector is considered ugly and confusing.

Do not redesign it in this assignment except where controls are required to expose new behavior.

A dedicated visual/Inspector pass follows after this tranche is proven.

### Larger architectural chunks

Do not package one minor fix as a whole Gallery phase.

Implement coherent capability groups and validate the whole tranche.

## Work program

### A. Reposition becomes a true media-edit transaction

Evolve the existing focal-point-only Reposition mode into an explicit Gallery media-edit mode.

While Reposition is active:

- the media-edit surface owns its relevant pointer, wheel, gesture, and keyboard input
- normal canvas selection must not fire underneath it
- normal canvas pan/zoom must not steal media-edit gestures
- click-through to unrelated canvas chrome must not occur
- the interaction lock must be bounded to the edit session rather than globally disabling field

Investigate the existing `data-field-no-canvas-input` seam in `src/canvas/hooks/useCanvasTransform.ts` before inventing another global canvas lock. Do not rely on incidental `stopPropagation` if the canvas input router remains active.

Dragging the bitmap repositions it with immediate feedback. Preserve the existing cover-overflow math and percentage focal semantics. Live pointer movement stays imperative/DOM-fast; do not regenerate source on every frame.

Pinch / trackpad zoom scales the image treatment inside its frame, not the field canvas. It must be authored/source-backed, bounded, and survive Design → Preview → production, view switches, responsive editing, duplicate, and replace.

Rotation becomes authored image treatment. Use multi-pointer twist or platform gesture support where reliable, plus a deterministic control/keyboard fallback so rotation is never browser-exclusive.

Transaction rules:

- opening Reposition snapshots full media-edit state
- Escape restores the exact opening focal/zoom/rotation state
- Done/Enter commits the full changed state
- Reset restores canonical neutral focal/zoom/rotation
- one completed media edit = one coherent history action
- cancel = no durable source mutation

### B. Direct canvas image-to-image swap

Dragging one Gallery image onto another means **swap positions**.

Required:

- Grid, Natural, Strip, Story, Carousel
- clear target feedback
- atomic source-order mutation
- selection follows authored media identity
- Inspector content order reflects the same source truth
- Natural/Story index-owned geometry is recomputed from new positions
- stale Gallery-owned responsive geometry is cleared
- unrelated responsive overrides and media treatment are preserved
- Carousel controls/counters/fragment targets regenerate from the real new order
- one swap = one undoable action

Strip and Carousel need practical edge auto-scroll while dragging toward offscreen targets.

Generic `src/canvas/drag/**` is protected. First find the smallest native integration seam; expand ownership explicitly if generic drag infrastructure is truly required. Do not tunnel around it with brittle DOM-only reorder hacks.

### C. Frame sizing separate from media fit

Introduce a first-class Gallery frame-sizing policy independent from `object-fit`.

At minimum:

- Composed / layout-defined geometry
- Source ratio

`object-fit` answers how the bitmap behaves inside its frame. Source ratio answers how the frame itself is sized.

This policy must be deterministic/source-backed and survive view switches, Preview, production, responsive editing, duplicate, replace, undo, and redo.

### D. Source-ratio behavior for every Gallery mode

Each view gets a mode-appropriate interpretation.

**Grid**
- composed mode may keep regular cells
- Source ratio derives media frame proportion from intrinsic media while retaining a coherent responsive grid
- avoid unnecessary cropping

**Natural**
- intrinsic ratios become actual composition inputs
- do not merely switch fixed reference frames to `contain`
- layout stays valid on narrow surfaces

**Strip**
- common/equal strip height
- item width derives from intrinsic source ratio
- existing hover expansion remains reachable

**Story**
- retain editorial rhythm/width
- frame height can derive from source ratio
- do not collapse Story into generic vertical stacking

**Carousel**
- existing composed stage remains available
- Source ratio allows slide/media frame to follow source proportion
- navigation, snap, controls, counters, authored IDs, and accessibility must remain stable across mixed ratios

### E. Natural Shuffle

Natural gets a real **Shuffle** action.

Shuffle changes composition, not semantic content order.

Requirements:

- source/media order unchanged
- Content order unchanged
- accessibility/reading order unchanged
- generates another useful Natural composition
- deterministic after commit
- survives Preview/runtime/reload
- one Shuffle = one history action
- add/remove/duplicate/reorder remain valid afterward
- narrow layouts remain reachable

Prefer a small source-backed composition seed or equivalent deterministic state over serializing a giant arbitrary layout map.

Same seed + same content/order should reproduce the same composition.

### F. Gallery creation wizard

Adding Gallery transitions into a guided setup flow:

1. **Media**
2. **Layout**
3. **Behavior**

**Media**
- reuse canonical project media/search/upload
- support multi-select
- allow sensible initial ordering
- no new media backend

**Layout**
- Grid / Natural / Strip / Story / Carousel
- meaningful live preview of structure

**Behavior**
- initial frame sizing: Composed vs Source ratio
- initial media fit
- Natural composition/Shuffle choice where applicable

Finish creates/configures one canonical source-backed Gallery atomically.

Cancel leaves no half-created Gallery.

One completed wizard flow = one coherent undoable creation action.

After Finish, normal editing moves to canvas + Inspector.

First investigate launching from the existing newly inserted/selected empty Gallery seam. Modify Insert architecture only if repo truth proves necessary; expand ownership first.

### G. Additional functional QoL in this tranche

These are intended work, not optional polish.

**Direct media drop**
- where canonical field media/asset drag supports it, dropping media/files onto Gallery adds them
- dropping on a specific item may replace it
- do not create Gallery-specific upload infrastructure

**Replace preserves treatment**
- preserve item order and fit/focal/zoom/rotation/responsive treatment unless explicitly reset
- if Source ratio is active, new intrinsic media ratio should drive the new frame appropriately

**Duplicate preserves treatment**
- fresh IDs
- preserve fit/focal/zoom/rotation/frame-sizing semantics and appropriate responsive overrides
- do not copy stale index-owned Natural/Story geometry as identity

**Selection continuity**
- selected media stays selected across view switches, Shuffle, reorder/swap, and breakpoint changes when it still exists

**History quality**
- swap
- Shuffle
- completed Reposition/zoom/rotation
- wizard creation
- replacement
- direct add/drop where applicable

must each be coherent undoable operations, not pointer-frequency history spam.

## Functional data model

Keep these independent:

**Gallery content** = ordered source media children

**Gallery view** = Grid / Natural / Strip / Story / Carousel

**Composition** = view-specific geometry + deterministic Natural composition state

**Frame sizing** = composed geometry / source ratio

**Media treatment** = fit + focal position + zoom + rotation

Do not collapse these into one overloaded style or opaque serialized config.

## Required investigation before source edits

Determine:

1. smallest native seam for canvas Gallery swap
2. correct bounded input ownership for media-edit wheel/gesture handling
3. source-backed representation for zoom/rotation that round-trips through Preview
4. whether wizard can launch from first selection of new empty Gallery
5. deterministic Natural composition/seed algorithm
6. exact mode-specific Source-ratio geometry and responsive fallback
7. whether direct asset/file drop can reuse existing field media/drag seams

Record conclusions in this assignment's mailbox if they affect architecture or ownership.

## Acceptance criteria

### Reposition / transform
- [ ] Reposition owns the edit interaction; normal canvas selection/pan/zoom does not react underneath.
- [ ] Drag pans/repositions with immediate feedback.
- [ ] Pinch/trackpad zoom changes media treatment rather than field canvas zoom.
- [ ] Zoom is source-backed and matches Preview/runtime.
- [ ] Rotation has a direct supported gesture path plus deterministic fallback.
- [ ] Rotation is source-backed and matches Preview/runtime.
- [ ] Escape restores exact pre-edit focal/zoom/rotation.
- [ ] Done/Enter commits full treatment together.
- [ ] Reset restores neutral focal/zoom/rotation.
- [ ] Completed media edit is one history action.

### Direct arrangement
- [ ] Image-over-image drag swaps real source positions.
- [ ] Swap works in all five views.
- [ ] Natural/Story index geometry follows new positions.
- [ ] No stale Gallery-owned responsive geometry remains.
- [ ] Carousel controls/counters follow source order.
- [ ] Strip/Carousel support edge auto-scroll.
- [ ] Selected media identity survives swap.
- [ ] Undo/redo restores complete swap.

### Frame sizing / Source ratio
- [ ] Frame sizing is independent from fit.
- [ ] Grid Source ratio works responsively.
- [ ] Natural Source ratio uses intrinsic media ratio as composition input.
- [ ] Strip Source ratio derives width from intrinsic ratio at strip height.
- [ ] Story Source ratio preserves editorial structure while deriving height.
- [ ] Carousel Source ratio is stable/navigable across mixed proportions.
- [ ] Source-ratio state survives view changes and Preview/runtime.
- [ ] Fit/focal/zoom/rotation is preserved when frame policy changes.

### Natural Shuffle
- [ ] Natural has Shuffle.
- [ ] Shuffle does not change source/media order.
- [ ] Shuffle is deterministic after commit.
- [ ] Preview/runtime reproduces it.
- [ ] Shuffle is one undoable action.
- [ ] Later add/remove/duplicate/reorder remains valid.

### Creation wizard
- [ ] Adding Gallery launches/transitions into Media → Layout → Behavior.
- [ ] Media uses canonical project media/upload/search.
- [ ] Layout offers all five real views.
- [ ] Behavior includes frame sizing, fit, and Natural composition choice.
- [ ] Finish creates/configures one canonical Gallery.
- [ ] Cancel leaves no half-created Gallery.
- [ ] Wizard creation is one undoable action.
- [ ] After Finish, normal Gallery editing continues.

### Additional QoL
- [ ] Direct asset/file drop adds media where existing field architecture permits.
- [ ] Drop on item can replace where supported.
- [ ] Replace preserves authored treatment unless reset.
- [ ] Duplicate preserves treatment with fresh IDs and correct index geometry.
- [ ] Selection persists across view switches when item exists.
- [ ] One-image Carousel still has no dead controls.
- [ ] Authored DOM IDs/accessibility labels remain preserved.
- [ ] Multi-select URL dedupe remains intact.

### Engineering gates
- [ ] focused Gallery tests
- [ ] transaction/gesture math tests
- [ ] swap/order tests
- [ ] Source-ratio tests
- [ ] Natural Shuffle determinism tests
- [ ] wizard Finish/Cancel tests
- [ ] existing Gallery hardening regressions
- [ ] TypeScript
- [ ] `npm run build:all`
- [ ] `git diff --check`
- [ ] exact path/staging allowlist
- [ ] moving-main reconciliation
- [ ] deployment verified against actual build-triggering HEAD
- [ ] Firecrawl small-packet QA
- [ ] human desktop trackpad QA where Firecrawl cannot faithfully represent native gestures

## Runtime QA plan

Use the repo-hosted Firecrawl small-packet protocol.

Recommended packets:

1. Reposition ownership + focal pan + cancel/commit
2. zoom/rotation state + Preview parity where automation can represent it
3. direct swap + source order + geometry
4. Natural Shuffle determinism + unchanged semantic order
5. Grid/Natural Source ratio
6. Strip/Story/Carousel Source ratio
7. wizard Finish
8. wizard Cancel/no artifact
9. replacement/duplicate treatment preservation
10. Design ↔ Preview treatment parity

Prefer DOM/source/computed geometry evidence over screenshots alone.

Fresh no-auth sessions may show legacy “Welcome to Revyme” onboarding; dismiss it before QA because it can intercept pointer events.

`/builder/noauth` is disposable/in-memory and does not prove authenticated persistence, R2 durability, account identity, or cross-session persistence.

## Ownership

### Owned now
- `src/code/gallery/**`
- `src/canvas/gallery/**`
- `src/editor/gallery/**`
- `src/editor/tools/GalleryTool.tsx`
- `src/editor/ui/ImageSearchModal.tsx`

### Not pre-authorized
Potential integration surfaces that require explicit scope expansion if proven necessary:
- Gallery insertion surfaces
- generic canvas drag/drop infrastructure
- generic canvas input/transform routing
- generic history/transaction infrastructure

Refresh live control + legacy ownership before any expansion.

## Out of scope

- Gallery Inspector visual redesign/polish beyond controls required by this tranche
- generic field design-system redesign
- new Gallery modes beyond the existing five
- Gallery-only runtime/document store
- random semantic media reorder as Natural Shuffle
- broad canvas drag/transform rewrite without a proven bounded need
- unrelated Figma import/sync work
- authenticated persistence claims not proven by the no-auth harness

## Known traps

- do not duplicate already-landed hardening
- do not reopen the stale source-SHA deployment verifier issue
- do not write source at pointer frequency during Reposition
- do not couple Source ratio to `object-fit`
- do not bind Natural Shuffle to source order
- do not copy index-owned Natural/Story geometry as media identity
- do not overwrite authored Carousel DOM IDs or accessible labels
- do not reintroduce dead one-image controls
- do not let view switching erase treatment
- do not polish the Inspector instead of completing this program

## Exact first actions

1. Read current repo-hosted handoff kit.
2. Read current `main`, `field/control`, this assignment, mailbox, and QA.
3. Inspect `field/native-gallery-qol-creation-flow` and Draft PR.
4. Reconcile movement since base `7e585a2fe66e062bae8a46041a6e08901027f9a8`.
5. Verify no active assignment newly owns target paths.
6. Run compact baseline Firecrawl Gallery smoke before mutation.
7. Perform required architecture investigation.
8. Request/record ownership expansion before generic integration edits.
9. Implement coherent capability groups.
10. Run automated gates + small-packet runtime QA.
11. Update branch/PR, mailbox, QA with exact SHAs/evidence.
12. After acceptance, create a separate Gallery UI/Inspector redesign assignment.

## Completion contract

- implementation lives on `field/native-gallery-qol-creation-flow`
- do not push product implementation directly to `main`
- do not force-push
- control truth lives on `field/control`
- record exact tested branch/main SHAs
- merge only after current merge gate passes
- visual redesign follow-up gets a separate assignment
