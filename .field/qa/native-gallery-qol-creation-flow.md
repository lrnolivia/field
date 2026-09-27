# qa-native-gallery-qol-creation-flow.md

```yaml
assignment: native-gallery-qol-creation-flow
source_worker: field Gallery Worker
tested_head_sha: d256a74b1bab779c7dd10e69df4e8a3532898505
tested_main_sha: 024d594b07d6ad6e04c61383778de621f170471f
environment: existing Gallery baseline; GitHub/Cloudflare deployment evidence; live no-auth human smoke; Firecrawl access smoke
build: production-pass
tests: baseline-pass
runtime_qa: live-production-partial
new_tranche_implementation: implemented
```

## Existing baseline that actually passed

For `1a84843ad3b24cd8572545cba05409fb48b3715a`:

- focused Gallery regression suites passed
- TypeScript passed
- `build:all` passed

These are baseline results only.

## Production evidence

The source SHA itself has no check-run.

Immediate descendant `a873a3f9eeef696a25b6e330a58a41503411747f`:

- directly contains `1a84843...`
- changes only `tracker.md`
- Cloudflare check `Workers Builds: field`
- check-run `108318214279`
- completed / success
- completed 2026-09-26T02:19:04Z

## Legacy closeout

The old Gallery hardening reservation was released on main at:

`7e585a2fe66e062bae8a46041a6e08901027f9a8`

## Human runtime smoke

The user manually tested the live Gallery and reported:

- it works
- it is fast
- all five Gallery modes work

This is smoke, not a complete RC matrix.

## Firecrawl access smoke

A fresh request to `https://field.loew.fi/builder/noauth` returned HTTP 200 and exposed the live field editor DOM. An interactive Firecrawl browser attached successfully.

An earlier large RC attempt encountered a transient 401 and free-tier concurrency/rate limits. Because the same route later succeeded, the earlier 401 is not classified as a Gallery product failure.

The complete Gallery RC matrix was not rerun.

## New tranche — not run

No implementation exists yet for:

- exclusive media-edit input ownership
- image zoom
- image rotation
- direct canvas swap
- mode-aware Source ratio
- Natural Shuffle
- creation wizard
- direct Gallery media/file drop QoL
- new history transactions

Do not claim tests/build/runtime QA for those features until the successor records exact evidence.

## Required successor QA packets

1. Reposition ownership + focal pan + cancel/commit
2. zoom/rotation state + Preview parity where automatable
3. direct swap + source order + geometry
4. Natural Shuffle determinism + unchanged semantic order
5. Grid/Natural Source ratio
6. Strip/Story/Carousel Source ratio
7. wizard Finish
8. wizard Cancel/no artifact
9. replacement/duplicate treatment preservation
10. Design ↔ Preview treatment parity

Use human desktop QA for native trackpad pinch/rotation feel when browser automation cannot represent it faithfully.

`/builder/noauth` is disposable/in-memory and does not prove authenticated persistence, R2 durability, account identity, or cross-session persistence.


## 2026-09-26 successor baseline Firecrawl packet

- URL: https://field.loew.fi/builder/noauth
- forced live fetch (maxAge 0)
- HTTP: 200
- observed page state: Failed to fetch / Reload; editor chrome did not render in this packet
- classification: QA harness/environment failure, not a Gallery product failure
- consequence: baseline Gallery runtime behavior remains human-smoke-backed from the prior closeout, but this successor packet is runtime-unverified until the no-auth harness renders normally again

Do not use this packet as evidence that Gallery regressed.


## 2026-09-26 branch validation — aec681c0c090

- exact implementation SHA: aec681c0c09090cd4aee6bb73bc8ff2d8e031f3d
- commit path audit: 11 changed files, all inside assignment-owned Gallery paths; 399 additions / 62 deletions; no conflict markers observed in committed patches
- Draft PR #3 remains open/draft and points at this SHA
- Cloudflare Workers Builds check 108389578024: completed/failure
- classification: **pre-existing infrastructure/build-lane failure, not evidence of Gallery product failure**
- comparison evidence: the no-file bootstrap SHA 30b5d4d1b3f17e314e0cc550dc1105b610f09c9e also fails the same Workers Builds check; current main coordination SHA fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e also fails it. GitHub reports no Actions workflows and the Cloudflare check exposes no annotations.
- exact repo dependency-tree tests / TypeScript / build:all remain **unverified in this Contract Worker environment**; do not claim them passed.
- runtime QA for this unmerged branch remains pending; production no-auth baseline itself is currently harness-failing as recorded above.


## 2026-09-26 branch validation — Natural Shuffle 55f3901660e4

- exact implementation SHA: 55f3901660e4892c95adea8507a42294543f7398
- parent SHA: aec681c0c09090cd4aee6bb73bc8ff2d8e031f3d
- commit path audit: 8 changed files, all inside assignment-owned Gallery paths; 161 additions / 29 deletions
- pre-publication structural invariants passed for:
  - source-backed Natural seed property
  - six deterministic compositions
  - seed-zero compatibility
  - seeded add/duplicate/remove/reorder paths
  - one-batch Shuffle transaction
  - no Shuffle reorder mutation
  - functional Inspector Shuffle action
  - focused deterministic and duplicate continuity regression source
  - no conflict markers in the eight postimage files
- Draft PR #3 head was verified at this SHA after publication
- exact repo dependency-tree Vitest / TypeScript / build:all remain unverified in this Contract Worker environment because the allowed workbench has Node but no installed TypeScript/compiler or repository dependency tree
- the authored focused regressions are present in source but must not be reported as executed
- Cloudflare Workers Builds was in progress at the first post-publication check; final classification is recorded only after a completed check is observed
- runtime / Preview QA for this unmerged Shuffle remains pending


### Cloudflare follow-up for 55f3901660e4

- Workers Builds: field check-run 108432708475 completed with failure at 2026-09-26T15:34:02Z
- no annotations were reported
- classification: pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Natural Shuffle product failure
- basis: the Gallery no-file bootstrap and unrelated current-main coordination commits were already observed failing this same Workers Builds lane before this Shuffle commit
- this does not substitute for exact dependency-tree Vitest / TypeScript / build:all, which remain unverified here


## 2026-09-26 branch validation — Source Ratio f8852136f803

- exact implementation SHA: f8852136f80329a873fe6862c9031a98876dc01d
- parent SHA: 55f3901660e4892c95adea8507a42294543f7398
- commit path audit: 10 changed files, all inside assignment-owned Gallery paths; 474 additions / 92 deletions
- new focused regression source covers:
  - frame-policy/source-ratio normalization
  - deterministic intrinsic ratio serialization
  - Grid/Natural/Strip/Story/Carousel source-ratio geometry
  - media-fit independence
  - source-backed item ratio metadata
  - treatment-preserving Source-ratio duplicate semantics
- pre-publication structural/invariant checks passed for:
  - explicit root frame policy and item ratio properties
  - backward-compatible Composed defaults
  - all five Source-ratio mode mappings
  - Add/Replace measurement flow
  - view/duplicate/remove/reorder/Shuffle ratio continuity
  - global-vs-responsive ratio cleanup
  - stale async measurement abort guards
  - no conflict markers in the ten postimage files
- all modified .ts files passed a lightweight delimiter-structure audit
- high-risk TSX mutation/control regions were manually inspected; heuristic TSX delimiter scanning was not treated as a compiler because JSX self-closing syntax produces false positives
- Draft PR #3 and implementation branch were verified at this SHA after publication
- current main at publication: 66a6f90ef9658e5a66409c0ebe48727715b3452b; latest commit changed tracker.md only and had no Gallery overlap
- exact repo dependency-tree Vitest / TypeScript / build:all remain UNVERIFIED in this Contract Worker environment: Node is present, but TypeScript, esbuild, SWC, Sucrase, Babel parser, Prettier, and the repository dependency tree are not available
- authored regression files are present in source but MUST NOT be reported as executed
- Cloudflare Workers Builds check 108443927173 was in progress on the first post-publication read; record final classification only after completion
- Preview/runtime QA for this unmerged Source-ratio implementation remains pending


### Cloudflare follow-up for Source Ratio f8852136f803

- Workers Builds: field check-run 108444034071 completed with failure at 2026-09-26T16:43:07Z
- no annotations were reported
- classification: pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Source Ratio product failure
- basis: this same Workers Builds lane was already failing the Gallery no-file bootstrap, prior Gallery successor commits, and unrelated current-main coordination commits before Source Ratio
- exact dependency-tree Vitest / TypeScript / build:all remain unverified and are not replaced by this classification


## 2026-09-26 branch validation — selection continuity 4f05002053e3

- exact implementation SHA: 4f05002053e3cf7af0bf9209968a332c1ec8e8c9
- parent SHA: f8852136f80329a873fe6862c9031a98876dc01d
- commit path audit: 3 Gallery-owned files; 92 additions / 8 deletions
- exact GalleryTool diff against the parent was audited before publication: +31 / -8, selection continuity wiring only
- two pure helper/regression files added under src/editor/gallery
- structural invariants passed for:
  - editor-only per-Gallery selection memory
  - current identity priority
  - remembered identity restore after remount/reorder
  - deterministic next-then-previous selection after removal
  - view and Natural Shuffle not resetting media selection
  - replace retaining media identity
  - transient parser/replica empty states not erasing remembered identity
- authored focused regressions cover remount restore, reorder/current-identity retention, stale remembered fallback, and adjacent removal behavior
- authored tests are present in source but were NOT executed in this Contract Worker environment
- exact repo dependency-tree Vitest / TypeScript / build:all remain unverified for the same toolchain limitation recorded above
- Draft PR #3 and implementation branch were verified at this SHA after publication
- Cloudflare Workers Builds check 108445502039 completed with failure and no annotations
- classification: pre-existing Workers build-lane infrastructure failure, not evidence of a selection-continuity product failure; the same lane was already failing bootstrap, prior Gallery commits, and unrelated main coordination commits
- runtime/Preview QA remains pending


## 2026-09-26 branch validation — creation wizard 463a16f9d7b4

- exact implementation SHA: 463a16f9d7b4563ef5a9f8eb05204eda4eb14371
- parent SHA: 4f05002053e3cf7af0bf9209968a332c1ec8e8c9
- commit path audit: 7 files, 568 additions / 0 deletions
- path scope:
  - 6 files are inside Gallery-owned src/code/gallery/**, src/editor/gallery/**, or src/editor/tools/GalleryTool.tsx
  - src/canvas/insertion-bridge.ts is the explicitly reserved approved_shared path
  - no src/canvas/drag/**, mutation implementation, parser, generation, store, backend, Preview sandbox, or dashboard file changed
- exact shared-file pre-publication guard:
  - src/canvas/insertion-bridge.ts had the same blob on current main and the Gallery branch immediately before publication
  - the shared edit adds only the fresh-empty-Gallery session signal around the existing successful-insert/selection seam
- semantic postimage audit passed for:
  - canonical empty-insert gating
  - insertion signal before selection rebinding
  - no source/runtime setup marker
  - Media → Layout → Behavior step order
  - canonical multi-select media picker
  - all five real views
  - frame sizing, fit, and Natural composition choices
  - Finish source mutation batch before history release
  - Cancel root removal before history release
  - normal Gallery editing after Finish
- exact published TSX was manually re-read after commit, including conditional Inspector rendering and Finish/Cancel transaction wiring
- apparent doubled regex escaping in rendered tool output was checked by literal character count: both wizard and existing duplicate media-node regexes contain exactly one backslash before the dot and are correct
- focused regression files are authored in source but NOT executed in this Contract Worker environment
- exact dependency-tree Vitest / TypeScript / npm run build:all remain unverified because the allowed environment still does not expose the repository dependency tree/compiler toolchain
- Draft PR #3 remains open/draft and points to this SHA
- Workers Builds: field check-run 108514148196 completed with failure and zero annotations
- classification: pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a wizard product failure; the same lane already failed the no-file bootstrap, prior Gallery successor commits, and unrelated current-main coordination commits
- runtime/Preview wizard QA remains pending


## 2026-09-26 branch validation — wizard planner 221364a5324e

- exact implementation SHA: 221364a5324ea1967dd13a730c633e06e91b4c20
- parent SHA: 463a16f9d7b4563ef5a9f8eb05204eda4eb14371
- commit scope: 3 Gallery-owned files; 202 additions / 33 deletions
- pure planner/regression files added under src/code/gallery; GalleryTool refactored onto the planner
- authored regressions cover canonical ordered source construction, Natural/Source-ratio state, Strip hover, Carousel semantics, fit, and invalid plan guards
- regression source was authored but not executed in this environment
- Workers Builds check 108514791363 completed failure with zero annotations
- classification: the established pre-existing Workers build-lane infrastructure failure, not product-failure evidence
- exact repo dependency-tree Vitest / TypeScript / build:all remain unverified


## 2026-09-26 branch validation — created media selection 54d1c62ea9e8

- exact implementation SHA: 54d1c62ea9e8a272ff446cff7940360e3047eda0
- parent SHA: 221364a5324ea1967dd13a730c633e06e91b4c20
- exact commit scope: 3 Gallery-owned files; 22 additions / 4 deletions
- paths:
  - src/editor/gallery/gallery-selection.ts
  - src/editor/gallery/gallery-selection.test.ts
  - src/editor/tools/GalleryTool.tsx
- focused regression source covers newly created media selection and empty-create preservation
- authored tests were not executed in this environment
- Draft PR #3 is open/draft and verified at this SHA
- Workers Builds check 108515085392 completed failure with zero annotations
- classification: the established pre-existing Workers build-lane infrastructure failure, not product-failure evidence
- runtime/Preview behavior remains pending


## 2026-09-26 branch validation — Replace preservation 7eee0dd4b229

- exact implementation SHA: 7eee0dd4b2292af13b3dce0118ada796760ed740
- parent SHA: 54d1c62ea9e8a272ff446cff7940360e3047eda0
- exact commit scope: 3 Gallery-owned files; 208 additions / 28 deletions
- pure replacement planner constrains mutation to src plus frame-owned intrinsic-ratio geometry
- same real image node ID is preserved
- focused regression source proves authored objectFit, objectPosition, transformOrigin, zoom, rotation, and composed transform survive replacement
- replacement still commits one mutation batch + one flush
- authored tests were not executed in this environment
- Workers Builds check 108515656778 completed failure with zero annotations
- classification: established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Replace product failure
- exact dependency-tree Vitest / TypeScript / build:all remain unverified


## 2026-09-26 validation note — native media drag blocker

- MediaGalleryPanel source explicitly documents no HTML5 dataTransfer path
- multi-selected images build a canonical Gallery ToolbarItem and enter startToolbarDrag after the 5px pointer threshold
- toolbar-drag-bridge exposes no public drop-target registration/subscription API
- active legacy Scale ownership still covers src/canvas/drag/**
- direct existing-Gallery media drop and image-to-image canvas swap are therefore architecture/ownership blocked, not omitted because of an unknown implementation path


## 2026-09-26 branch validation — treatment Inspector 25a379f1d32b

- exact implementation SHA: 25a379f1d32bc22f13248dac0346e0b0a6d425c9
- parent SHA: 7eee0dd4b2292af13b3dce0118ada796760ed740
- exact commit scope: 4 Gallery-owned files; 45 additions / 2 deletions
- structural checks passed for:
  - canonical neutral treatment helper
  - focal/zoom/rotation Inspector readout
  - truthful Center position-only label
  - separate full pan/zoom/rotate reset
  - one explicit flush for full treatment reset
  - Fit excluded from neutral treatment patch
- focused regression source asserts the neutral patch and absence of objectFit
- authored tests are present but were not executed in this environment
- Draft PR #3 is open/draft and points to this SHA
- Workers Builds check 108516328315 was still in progress on the first post-publication read; final classification must be recorded after completion
- runtime/Preview QA remains pending


### Cloudflare follow-up for treatment Inspector 25a379f1d32b

- Workers Builds: field check-run 108516421661 completed with failure at 2026-09-27T00:23:05Z
- zero annotations were reported
- classification: the established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a treatment-Inspector product failure
- this does not substitute for exact dependency-tree Vitest / TypeScript / build:all, which remain unverified here


## 2026-09-26 source-level UIAudit — Gallery Inspector

Audited target:
- src/editor/gallery/GalleryContentSection.tsx
- src/editor/gallery/GalleryViewSection.tsx
- src/editor/gallery/GalleryImageSection.tsx
- src/editor/gallery/GalleryCreationWizard.tsx
- shared ToolButton / ToolRow source was inspected for context but not modified because those files are outside this Gallery assignment

Implementation Integrity Verdict: PASS
- Gallery UI remains product-specific and coherent with field's existing ToolSection / ToolRow / ToolSelect system
- no new generic card system or parallel design language
- authored SVG action icons replace Unicode glyph shortcuts
- tokenized chrome remains intact

Audit Health Score (source-verifiable only):
- Accessibility: 3 / 4
  - verified: native buttons typed; icon-only controls labeled; visible focus states; 20px targets removed; Gallery selection/step/media-list semantics improved
  - withheld point: live contrast, screen-reader traversal, and end-to-end keyboard behavior require runtime / assistive-tech testing
- Performance: 4 / 4
  - audited surfaces contain no layout read/write loops or expensive animation; wizard preview is bounded to at most six media items
- Responsive Design: 3 / 4
  - no fixed outer wizard/panel width added and controls remain shrinkable
  - withheld point: narrow Inspector, 200% text/zoom, and real breakpoint rendering remain unverified without the live harness
- Theming: 3 / 4
  - audited Gallery files use field CSS variables and contain no hard-coded color literals
  - withheld point: GitHub code search did not surface the token definitions, so numerical contrast and dark-theme token resolution were not fabricated
- Implementation Integrity: 4 / 4
  - strong shared inspector alignment, field-specific behavior, no Unicode icon shortcuts, no decorative UI drift

Total: 17 / 20 — Good

Verified source fixes in 0e2cbf7ef067:
- exact scope: 4 Gallery-owned UI files; 90 additions / 36 deletions
- removed remaining 20px icon targets from audited Gallery Content controls
- replaced Unicode drag/remove/move action glyphs with SVGs
- added explicit focus-visible states to raw Gallery action buttons
- exposed current item / current wizard step semantics
- aligned treatment state into ToolRow
- reduced redundant wizard and View copy
- no hard-coded color literals in the four target files

Semantic follow-up in 2e5e527fbf50:
- exact scope: GalleryCreationWizard.tsx only; 7 additions / 7 deletions
- named section + h3 heading
- aria-live step status
- navigation role for setup steps
- semantic selected-media list/listitems

Build signal:
- Workers Builds check 108526838295 for 0e2cbf7ef067 completed failure with zero annotations
- classification: established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Gallery UI regression
- 2e5e527fbf50 had no check-run yet on the first post-publication read
- exact repo dependency-tree Vitest / TypeScript / build:all remain unverified in this environment
- live contrast, dark theme, narrow Inspector, 200% zoom, screen-reader, and runtime keyboard QA remain pending


### Cloudflare follow-up for wizard semantics 2e5e527fbf50

- Workers Builds check 108527117930 completed with failure and zero annotations
- classification: established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Gallery wizard semantic regression
- exact dependency-tree Vitest / TypeScript / build:all remain unverified


## 2026-09-26 source-level UIAudit — Reposition overlay

Initial verified findings:
- P1 Accessibility / Interaction Integrity: global Enter committed the edit even when a toolbar button had focus, conflicting with keyboard activation of Reset / rotate controls
- P1 Accessibility: exclusive Reposition mode did not contain Tab focus, allowing focus to escape into the underlying editor while the mode remained active
- P2 Accessibility: toolbar action targets were below the 24px WCAG 2.2 minimum target
- P2 Accessibility / UX: Cancel existed only as Escape; no visible cancel action or linked complete keyboard instructions
- P3 Theming / Integrity: center marker and toolbar shadow used hard-coded rgba chrome and a local arbitrary radius

Fix commit 7d8f03b02edf:
- exact scope: src/editor/gallery/GalleryCropOverlay.tsx only; 30 additions / 12 deletions
- guarded Enter from interactive descendants
- guarded overlay treatment shortcuts from child-control events
- added aria-describedby instructions
- added visible Cancel
- raised five toolbar actions to h-6 / min-w-6
- added focus-visible states and explicit titles
- replaced hard-coded rgba chrome with field tokens / color-mix
- removed local toolbar radius and used shared shadow token
- Workers Builds check 108528117951 completed failure with zero annotations
- classification: established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Reposition product failure

Focus-containment follow-up 539ce12b9a63:
- exact scope: src/editor/gallery/GalleryCropOverlay.tsx only; 22 additions / 0 deletions
- keyboard focus containment across the active Reposition controls
- Tab and Shift+Tab cycle within overlay + enabled controls
- forward/backward wrapping is explicit
- existing Escape cancel and guarded Enter commit semantics remain intact
- Draft PR #3 is open/draft and points to this SHA
- no Workers check existed on the first post-publication read

UIAudit score remains 17 / 20 — Good:
- Accessibility remains 3/4 because runtime screen-reader behavior, real focus traversal, contrast, and end-to-end keyboard behavior still require live testing even though the verified source defects above are fixed
- Performance remains 4/4 at source level; the active-only rect polling is deliberate and not a verified thrash defect
- Responsive 3/4 and Theming 3/4 remain limited by unavailable live rendering / token contrast verification
- Implementation Integrity remains 4/4


### Cloudflare follow-up for Reposition focus trap 539ce12b9a63

- Workers Builds check 108528933960 completed with failure and zero annotations
- classification: established pre-existing Cloudflare/build-lane infrastructure failure, not evidence of a Reposition focus-containment product failure


### Reposition dialog semantic correction 9890dad1996f

- exact implementation SHA: 9890dad1996f6bb651f308d851066941658d258e
- parent SHA: 539ce12b9a6369e80618fda28c0e2e68b7d3bff0
- exact scope: src/editor/gallery/GalleryCropOverlay.tsx only; 0 additions / 1 deletion
- removed aria-modal=true after verifying that Reposition intentionally continues tracking an otherwise navigable canvas
- retained role=dialog, linked instructions, Tab focus containment, guarded Enter, Escape cancel, pointer/gesture treatment input, and data-field-no-canvas-input on the edited image overlay
- semantic result: keyboard focus is contained without falsely declaring all surrounding field UI inert to assistive technology
- no Workers check existed on the first post-publication read


## 2026-09-27 immutable Canvas Preview runtime pass

Exact implementation head:
- 15bb742b8db7bf090482a6fd4fd1f1a7cfb88f5d
- main reference containing PR #19 fix: f394090180284f3a70bdf8dd6b280f692d96d0dc
- Draft PR #3 remained open/draft; no merge performed

Build/deployment:
- Workers Builds: field check 108564003826
- conclusion: success
- annotations: 0
- immutable Cloudflare Preview deployment: c82825c7

Direct Canvas host:
- https://c82825c7.canvas-preview.loew.fi/
- browser title: Canvas Sandbox
- sandbox DOM: #sandbox-root + #content-root
- expected blank/transparent sandbox shell when not bridge-driven
- no Dashboard/Recents UI
- no console errors or application crash detected

Outer editor:
- https://c82825c7.field-preview.loew.fi/builder/noauth
- onboarding dismissed
- Canvas reached first paint with visible Desktop 1440 frame
- no broken-file state
- no Canvas is taking longer to start
- Retry was not offered/needed
- right Inspector and bottom Toolbar rendered
- no fatal runtime error observed

PR #19 adaptation verdict: PASS
- origin resolver maps branch/immutable .field-preview.loew.fi to sibling .canvas-preview.loew.fi
- Worker recognizes .canvas-preview.loew.fi as Canvas and routes it to /sandbox
- Canvas isolation headers remain in the PR #19 Worker path
- the exact Gallery branch Preview now exercises that architecture successfully

Historical-build note:
- previous zero-annotation Cloudflare failures recorded earlier in this QA file remain useful history
- they are superseded for current deployment health by the successful exact-head Worker build and immutable runtime evidence above
- do not continue classifying Cloudflare Preview as globally broken for this Gallery assignment

Current functional tranche at this head also contains:
- native image-over-image Gallery identity swap
- Strip/Carousel Gallery edge auto-scroll bridge
- Media metadata carried through native toolbar drag
- deterministic Gallery media-add planner
- native Media → existing Gallery drop
- guard against mutating instance-owned Gallery content

Remaining validation is product-interaction QA (Gallery creation/edit/swap/drop/Reposition/undo across the live editor) plus any contract-required human trackpad gesture pass; Canvas Preview infrastructure itself is no longer a blocker.


## 2026-09-27 production merge + live bundle QA

Merge:
- final conflict-resolved PR head: d256a74b1bab779c7dd10e69df4e8a3532898505
- merged PR #3 commit on main: a7f56e9749050222bb6f1936c396c70e246fffbb
- PR #3 closed/merged successfully

Manual merge integrity:
- current main had advanced with Selection/Group work after Gallery's previous sync
- exact path intersection was four Canvas bridge files
- bridge-host.ts, sandbox-api.ts, and canvas-bridge.ts three-way merged automatically
- bridge-sandbox.ts had one import-block conflict only
- resolution kept both Gallery findElByNodeId nested-scroll support and Selection color-locate imports/APIs
- merge commit had both Gallery and then-current main as parents, so newer main history was preserved rather than overwritten

Production build:
- tested production descendant: 024d594b07d6ad6e04c61383778de621f170471f
- direct parent chain contains Gallery merge a7f56e9749050222bb6f1936c396c70e246fffbb
- Workers Builds: field check 108572463858
- conclusion: success
- annotations: 0
- Cloudflare build ID: 18e0fe5c-9c4f-4b53-a864-de9aad1f177f
- version ID: d24549a6-77c0-4a50-a81e-ee4e87e9f6bc

Live production:
- https://field.loew.fi/builder/noauth
- fresh bundle: assets/index-BfIQ_mva.js
- previous bundle observed before propagation: assets/index-C76GRGSL.js
- new bundle contains:
  - Create Gallery
  - Reset pan / zoom / rotate
  - gallery-drag:swap-commit
  - Gallery creation steps
- https://canvas.field.loew.fi serves Canvas Sandbox
- standalone Canvas has sandbox-root/content-root and no actual routing/runtime error; empty content-root is expected without parent bridge

Live insertion path:
- left rail Insert button: data-left-menu-item=insert / data-tutorial=insert-button
- Insert → Elements → Basic → Gallery
- Gallery card: data-toolbar-item=gallery
- Gallery card is intentionally pointer-drag only; source starts startToolbarDrag() in onPointerDown

Browser automation caveat:
- Browser Tool found the correct Gallery card but repeatedly substituted JS PointerEvent/MouseEvent synthesis for the requested native pointer drag
- no wizard failure is recorded from those synthetic attempts
- native creation/swap/drop/Reposition gesture QA remains to be performed with actual user input or a browser connector exposing genuine mouse drag
