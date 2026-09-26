# mail-native-gallery-qol-creation-flow.md

to: successor Contract Worker
type: migration-handoff

## What this assignment is really for

Gallery is already real. The user exercised the live implementation and reported that it is fast and that Grid, Natural, Strip, Story, and Carousel work.

This is the complete **functional QoL + creation-flow** program before the dedicated Gallery UI redesign.

End state: guided creation, direct canvas arrangement, true media Reposition with pan/zoom/rotation, Source-ratio framing in every mode, deterministic Natural Shuffle, coherent history, and Design/Preview/runtime parity.

## Do first

1. Rehydrate from current repo truth and handoff kit.
2. Inspect implementation branch + Draft PR.
3. Run one small baseline Gallery Firecrawl packet.
4. Investigate native seams for Reposition input ownership, canvas swap, zoom/rotation source state, wizard launch, Natural deterministic composition, Source ratio, and direct media drop.
5. Expand ownership before touching generic protected integration surfaces.

## Do not waste time on

- rebuilding Gallery foundation
- retrying the old hardening deployment verifier against `1a84843...`
- inventing Gallery-only runtime state
- polishing the ugly Inspector before functional semantics are complete
- Natural Shuffle by changing source/media order
- Source ratio by merely changing `object-fit`
- source writes on every pointermove

## Settled decisions

- one ordered source-backed content model
- five existing views
- Preview is runtime truth
- one large coherent tranche, not micro-phases
- Reposition owns gestures while active
- focal + zoom + rotation are authored media treatment
- Escape cancels whole media-edit transaction
- Done/Enter commits whole transaction
- image-on-image drag = swap
- Natural Shuffle changes composition, never semantic order
- frame sizing and media fit are separate
- every view gets meaningful Source-ratio mode
- creation wizard = Media → Layout → Behavior
- replace preserves treatment
- duplicate preserves treatment with fresh IDs
- selection follows media identity
- live pointer feedback remains imperative where appropriate
- Gallery Inspector visual redesign follows this assignment

## Baseline evidence

Hardening source:
`1a84843ad3b24cd8572545cba05409fb48b3715a`

Legacy closeout:
`7e585a2fe66e062bae8a46041a6e08901027f9a8`

Production evidence:
descendant `a873a3f9eeef696a25b6e330a58a41503411747f`, Cloudflare check-run `108318214279`, success.

Human smoke:
Gallery is fast and all five modes work.

Old Gallery assignment is released. Do not reopen it.

## Warning signs

- canvas moves during Reposition → input ownership is wrong
- Natural/Story geometry sticks to wrong media after swap → index-responsive cleanup is wrong
- Shuffle changes Content/source order → composition and semantics were conflated
- Source ratio changes `objectFit` → frame sizing and media treatment were conflated
- Carousel controls break after swap → controls are not regenerated from real order
- wizard needs a second authoritative Gallery config → stop and return to canonical source

## After completion

Do not expand this branch into visual polish.

Create a separate Figma UI3-style Gallery Inspector + wizard UI redesign assignment once this functional model is proven.


## 2026-09-26 architecture investigation — Contract Worker

All seven required pre-edit seams were investigated against the Gallery implementation branch before product mutation.

1. Canvas swap: field's native drag coordinator already has structural reorder/move commits and grid cell-aware behavior. A correct Gallery image-over-image swap should integrate as a bounded Gallery-aware drag strategy/branch rather than DOM-only reordering. This will require explicit later ownership expansion into the minimal src/canvas/drag files when swap work begins.
2. Media-edit input ownership: useCanvasTransform already honors data-field-no-canvas-input before coordinate-based wheel routing. The portalled Gallery media-edit overlay can own wheel/pointer/keyboard gestures entirely from Gallery-owned code by carrying that marker; no generic canvas-transform edit is required for the first Reposition tranche.
3. Zoom/rotation source state: Gallery already proves CSS custom properties round-trip through source/Preview. Store zoom + rotation as Gallery image custom properties and compose them into the real image transform; keep focal position source-backed in object-position/transform-origin. View patches deliberately do not reset per-image treatment.
4. Wizard launch: empty Gallery insertion is already a real selectable root and the insertion bridge reselects created IDs. GalleryTool can detect a selected empty Gallery and transition into the wizard without changing Insert architecture. Existing history coalescing can keep create+wizard configuration one undo group; Cancel can remove the empty root before releasing the group so no half-created artifact remains.
5. Natural Shuffle: persist a small Gallery-root composition seed custom property. Deterministically permute visual Natural slots per four-item group from seed+group while leaving DOM/source/content order untouched.
6. Source ratio: persist frame-sizing policy on the Gallery root and intrinsic source ratio on each Gallery item. View geometry consumes that metadata differently per mode; object-fit, focal position, zoom, and rotation remain independent media treatment. Intrinsic ratios can be measured when policy is enabled and refreshed on replace.
7. Direct media/file drop: current Media tiles already use the canonical toolbar-drag pipeline. Creating a new pre-populated Gallery is native today; adding/replacing inside an existing Gallery needs Gallery-aware target handling in generic toolbar/canvas drag strategy code. Defer that edit until explicit ownership expansion; do not build a Gallery-only uploader.

First implementation capability group: extend Reposition into a bounded media-edit transaction (input ownership + source-backed focal/zoom/rotation + cancel/reset/commit), because it is fully achievable inside current Gallery ownership.


## 2026-09-26 implementation block — transactional media edit

Implementation commit: aec681c0c09090cd4aee6bb73bc8ff2d8e031f3d
Draft PR: #3

Changed only assignment-owned Gallery paths. Added a source-backed media-treatment model and upgraded Reposition from focal-only crop to a bounded transaction with:
- Gallery-exclusive canvas input ownership via the existing data-field-no-canvas-input seam
- drag/arrow focal positioning
- wheel and two-pointer pinch zoom
- two-pointer twist rotation plus bracket-key and +/- deterministic fallbacks
- Reset to focal center / 1x / 0deg
- Escape live-DOM restore with no source mutation
- Done/Enter one combined source flush for focal + zoom + rotation
- new Gallery images initialize neutral treatment
- duplicate preserves fit, focal point, zoom, and rotation with fresh IDs
- zoom-aware focal overflow math
- focused unit coverage for treatment serialization/clamping and duplicate preservation

No generic canvas, drag, mutation/history, parser/generator, backend, dashboard, design-system, Cloudflare, package, or lockfile path was changed.


## 2026-09-26 implementation block — deterministic Natural Shuffle

Implementation commit: 55f3901660e4892c95adea8507a42294543f7398
Draft PR: #3

Natural now has a real source-backed Shuffle action:
- root composition state is a small --field-gallery-natural-seed custom property
- seed 0 preserves the existing Terra Prime Natural geometry exactly
- six deterministic source-slot-to-visual-role compositions are available
- Shuffle changes item geometry only; source/media/content/accessibility order is unchanged
- one queued mutation batch plus one flush records the seed and every item geometry together
- selected media identity is not touched
- the four-track Natural runtime and narrow horizontal reachability stay unchanged
- Add and Duplicate inherit the current seed
- Duplicate, Remove, and Reorder recompute index-owned Natural geometry against the current seed and clear stale responsive geometry
- focused regressions cover deterministic seed cycling, unchanged semantic order, seeded new-item geometry, and seeded duplicate geometry

Moving-main reconciliation before publication:
- main had advanced to 0f329ba94475288100bb4aa48338d876a8a2f5f1
- main-only drift was coordination/handoff-kit plus tracker.md
- there was zero overlap with Gallery-owned source
- no active legacy or field/control assignment owned Gallery paths


### Natural seed algorithm refinement

The pre-edit investigation sketched seed + group variation. The landed implementation deliberately refines that to one persisted seed permutation applied consistently to each four-item group. Reason: seed 0 must preserve the existing Natural composition for every group, including item 5 onward, rather than silently changing the legacy layout after migration. Shuffle still produces six deterministic useful compositions by changing which source slot owns each visual role; same seed + same source order reproduces the same result.


## 2026-09-26 implementation block — Source ratio frame sizing

Implementation commit: f8852136f80329a873fe6862c9031a98876dc01d
Draft PR: #3

Frame sizing is now first-class and independent from media fit/treatment:
- Gallery root policy: --field-gallery-frame-sizing = composed | source
- real Gallery item intrinsic metadata: --field-gallery-source-ratio
- absent policy remains backward-compatible Composed
- enabling Source ratio measures missing intrinsic dimensions before source mutation and persists deterministic numeric ratios
- slow measurement is guarded by a view/frame/seed/item signature; stale async results abort instead of overwriting concurrent edits
- responsive ratio metadata is cleared from breakpoint overrides so intrinsic identity remains global source state
- image objectFit, objectPosition, focal point, zoom, rotation, and transform treatment are not changed by frame-policy switching

Mode behavior:
- Grid: intrinsic aspect ratio sizes each media frame; regular responsive columns remain
- Natural: Shuffle/slot geometry remains semantic composition while intrinsic aspect ratio becomes a real row-sizing input
- Strip: common authored height remains; width derives from source ratio; hover expansion uses a minimum target so already-wide source frames are not shrunk
- Story: editorial width/rhythm remains; frame height derives from intrinsic ratio
- Carousel: slide/control/snap semantics remain unchanged; media frame follows source proportion inside the existing 720px composed media-height envelope

Content/edit continuity:
- Add measures source ratio when Source ratio is active
- Replace refreshes intrinsic metadata and current frame geometry in the same source flush while preserving media treatment
- Duplicate carries source ratio with fresh IDs and excludes frame-owned responsive geometry from identity cloning
- Remove/Reorder recompute view/index geometry using each surviving item's ratio
- Natural Shuffle remains deterministic under Source ratio
- view switches reproduce the root frame policy from persisted item ratios
- switching Composed <-> Source ratio is one queued mutation batch + one flush

Moving-main reconciliation immediately before publication:
- current main was 66a6f90ef9658e5a66409c0ebe48727715b3452b
- latest main commit changed tracker.md only
- no Gallery-owned source overlap
