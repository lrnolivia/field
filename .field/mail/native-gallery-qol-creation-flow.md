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


## 2026-09-26 implementation block — selection continuity

Implementation commit: 4f05002053e3cf7af0bf9209968a332c1ec8e8c9
Draft PR: #3

Gallery media selection now follows real item identity rather than list position:
- editor-only selection memory is keyed by Gallery root ID; no source/runtime property was added
- current selected item wins whenever that ID still exists
- inspector remounts, breakpoint/replica changes, view changes, Natural Shuffle, and reorder restore/retain the same item identity
- replace keeps the same item ID and remembered selection
- removing the selected item deterministically selects the next adjacent item, or the previous item when removing the end
- transient empty item arrays from parser/replica churn clear local selection but intentionally keep remembered identity so the same item can recover
- removing the only selected item clears selection memory through the explicit remove path
- no generic editor store, parser, Preview, or runtime architecture was modified

The GalleryTool delta was audited directly against exact Source Ratio SHA f8852136... before publication: +31 / -8 and selection wiring only. Two pure Gallery-owned helper/test files were added.


## 2026-09-26 ownership expansion — wizard fresh-insert signal

The creation wizard needs to distinguish a freshly inserted empty Gallery from an older Gallery that happens to be empty. Opening the wizard for every empty Gallery would make Cancel capable of deleting an intentional existing Gallery.

Investigated options:
- src/canvas/drag/toolbar-item-config.ts is NOT available: active legacy native-scale-tool-20260926 owns src/canvas/drag/**.
- src/canvas/insertion-bridge.ts has no active control or legacy ownership collision and already owns the canonical post-insert created-ID seam.

Approved shared path added:
- src/canvas/insertion-bridge.ts

Scope is strictly bounded:
- insertion bridge may emit an editor-only fresh-Gallery creation signal using the inserted payload plus created root ID
- no Gallery source marker, runtime attribute, CSS property, or Preview state is introduced
- no generic insertion behavior may otherwise change
- no src/canvas/drag/** file is authorized by this expansion


## 2026-09-26 implementation block — atomic Gallery creation wizard

Implementation commit: 463a16f9d7b4563ef5a9f8eb05204eda4eb14371
Draft PR: #3

Adding the canonical empty Gallery now transitions into a functional Media → Layout → Behavior setup flow rather than leaving a confusing empty component in the normal Inspector.

Launch / ownership:
- the active legacy Scale assignment owns src/canvas/drag/**, so Gallery did not edit the toolbar config or generic drag subsystem
- the collision-free canonical insertion seam src/canvas/insertion-bridge.ts was explicitly added to approved_shared before source modification
- insertion-bridge changes are intentionally bounded: detect a one-node empty Gallery insertion and register its created root ID before selection rebinding
- no source/runtime wizard-pending attribute, CSS property, or private serialized wizard config was introduced
- pre-populated Gallery media drags bypass setup because their insertion payload contains media descendants

Media:
- reuses canonical ImageSearchModal project media/search/upload/create surface
- supports multi-select
- dedupes URLs without changing the user's chosen order
- initial order can be moved up/down or removed before Finish
- no new media backend

Layout:
- all five real Gallery views are offered: Grid / Natural / Strip / Story / Carousel
- lightweight live structural preview uses the same Natural slot geometry helper rather than inventing another Natural layout algorithm

Behavior:
- initial frame sizing: Composed vs Source ratio
- initial image fit: Cover vs Contain
- Natural exposes initial deterministic composition Shuffle

Atomic source/history behavior:
- insertion registers a fresh Gallery creation session and holds history coalescing before the selected root mounts
- only the canonical freshly inserted empty Gallery can claim that session; old Galleries that happen to be empty do not auto-launch setup
- unclaimed sessions self-release after five seconds so insertion cannot permanently hold global history
- once claimed, the setup flow owns the editor until Finish or Cancel; no active-session timeout can split the required undo group
- Finish measures Source-ratio media first when required, then commits root view/frame state, real media children, fit, Strip hover or Carousel controls in one mutation batch + one flush
- Finish releases the held history only after that source flush
- Cancel removes the inserted Gallery root, flushes removal, then releases the held history, leaving no half-created artifact
- normal Gallery Inspector editing resumes after Finish

History investigation:
- current history.ts exports holdHistoryCoalescing / releaseHistoryCoalescing
- the lower paste engine only queues mutations and does not force an immediate history snapshot
- the existing paste/insertion path therefore remains compatible with holding the pending debounced history group through setup

Focused regression source was added for:
- canonical empty-Gallery payload classification
- history hold/claim/release
- abandoned/unclaimed-session release
- multiple concurrent creation sessions sharing one history hold
- media URL dedupe/order
- initial media reorder/remove behavior


## 2026-09-26 implementation block — wizard source transaction planner

Implementation commit: 221364a5324ea1967dd13a730c633e06e91b4c20

Wizard Finish source construction was extracted from the editor callback into a deterministic Gallery-domain planner:
- buildGalleryWizardSourcePlan owns canonical root styles/attrs, media order, real item nodes, initial fit, Source-ratio state, deterministic Natural seed, Strip hover state, and Carousel mode intent
- empty-media plans fail explicitly
- Source-ratio plans fail explicitly when required intrinsic ratios are absent
- GalleryTool now measures asynchronous media ratios, then delegates deterministic source construction to the pure planner before its existing one-batch Finish mutation
- focused regression source covers ordered canonical creation, Source-ratio Natural state, Strip hover, Carousel semantics, initial fit, empty media, and incomplete Source-ratio input
- no protected mutation/history implementation or generic insertion/drag code changed


## 2026-09-26 implementation block — newly created media selection

Implementation commit: 54d1c62ea9e8a272ff446cff7940360e3047eda0

Selection continuity now follows newly created real media identity:
- wizard Finish selects the first media item it just created
- Add media selects the first newly added media item
- Duplicate selects the fresh duplicate rather than leaving Inspector focus on the source item
- empty create sets preserve the current selection
- behavior is centralized in gallerySelectionAfterCreate and remains editor-only
- source order, source identity, and history grouping are unchanged


## 2026-09-26 implementation block — deterministic Replace preservation

Implementation commit: 7eee0dd4b2292af13b3dce0118ada796760ed740

Replace treatment preservation is now explicit architecture instead of an incidental consequence of mutating the same image node:
- gallery-replacement-plan owns the permitted replacement patch surface
- image identity is retained; only src is replaced on the real image node
- when intrinsic-ratio state is relevant, only item/frame-owned ratio geometry is refreshed
- Carousel Source-ratio replacement may update width/height/aspectRatio because those are frame-owned image geometry
- objectFit, objectPosition, transformOrigin, zoom, rotation, and composed transform are outside the replacement plan and therefore preserved
- replacement remains one queued source mutation set + one flush
- selection identity remains the same item
- focused regression source explicitly composes replacement frame patches over authored treatment and proves focal/fit/zoom/rotation survive

Commit scope: 3 Gallery-owned files; 208 additions / 28 deletions.


## 2026-09-26 architecture blocker — direct media drop and canvas swap

The remaining direct-drop / canvas image-swap work was re-investigated after the owned Gallery QoL tranches landed.

Current facts:
- active legacy native-scale-tool-20260926 still owns src/canvas/drag/**
- MediaGalleryPanel deliberately does NOT use HTML5 dataTransfer; it starts the native pointer-based startToolbarDrag pipeline
- toolbar-drag-bridge exposes start/update/end/cancel into DragCoordinator but no public custom drop-target subscription API
- Gallery Inspector therefore cannot consume the Media drag payload through a local onDrop handler
- implementing image-over-image canvas swap or existing-Gallery pointer drop correctly still requires a Gallery-aware branch/strategy in the generic drag coordinator surface

Decision:
- do not create a parallel Gallery-only drag system
- do not fall back to DOM-only or HTML5-drop behavior that would diverge from native field insertion semantics
- keep these two capabilities blocked until src/canvas/drag/** ownership is released or explicitly shared


## 2026-09-26 implementation block — visible media treatment reset

Implementation commit: 25a379f1d32bc22f13248dac0346e0b0a6d425c9

Image treatment is now visible and explicitly resettable from the normal Inspector:
- the Image section readout shows focal position · zoom percent · rotation degrees
- the former generic Reset position button is labeled Center, matching its actual position-only behavior
- a separate Reset pan / zoom / rotate action restores centered focal, 100% zoom, and 0° rotation
- neutralGalleryMediaTreatmentPatch is the canonical domain helper for that reset
- the full reset is one source patch + one explicit flush
- image Fit is deliberately not part of treatment reset and remains authored
- focused regression source asserts the neutral treatment patch and confirms objectFit is absent
