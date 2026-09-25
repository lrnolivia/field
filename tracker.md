# field Work Tracker

> Canonical repo coordination ledger.
>
> Git/repository state remains implementation truth.
>
> Tracker entries do NOT authorize launching Workers, Codex sessions, Work mode, sub-agents, background agents, autonomous tasks, or new chats.

Last Updated: 2026-09-25T08:37:07.796867Z

## Active Assignments

<!-- FIELD_ACTIVE_ASSIGNMENTS_START -->
<!-- Active assignment blocks are maintained between these markers. -->




<!-- ASSIGNMENT:native-group-ungroup-20260925:START -->
### native-group-ungroup-20260925 — Native Group / Ungroup document primitive

Status: active
Baseline: a10af177e311dba88197164658d7e16f7233a377
Activation HEAD: a10af177e311dba88197164658d7e16f7233a377
Last Sync: 2026-09-25T05:48:17.282Z
Implementation baseline: c3f264661da10270df4c5be0d362728038c8e23f
Phase B baseline: 5795bfbff1fc00b387344ce91e42489bb49f549c

Scope: Implement first-class deterministic Figma-style Group/Ungroup distinct from Frame, Auto Layout, and SVG grouping. Group is a semantic collection with child-derived bounds and collective manipulation; grouping/ungrouping and subsequent child edits must preserve rendered appearance, source identity, responsive/variant behavior, and native flex/grid contracts.

Owned:
  - src/code/parsing/parser.ts
  - src/code/generation/runtime-guarantees.ts
  - src/code/groups/group-semantics.ts
  - src/code/groups/group-semantics.test.ts
  - src/canvas/commands.ts
  - src/canvas/ui/ContextMenu.tsx
  - src/canvas/shortcuts.ts
  - src/editor/LayersPanel/rows.tsx
  - src/editor/command-palette/sources/commands.ts
  - src/editor/command-palette/useSearchActions.ts
  - src/code/mutation/mutation-queue.ts
  - src/code/generation/generator-crud.ts
  - src/code/groups/group-refit.ts
  - src/code/groups/group-refit.test.ts
  - src/canvas/node-ops.ts
  - src/canvas/resize/ResizeManager.ts
  - src/canvas/resize/ResizeManager.test.ts
  - src/canvas/drag/CanvasDragOrchestrator.ts
  - src/canvas/drag/CanvasDragOrchestrator.test.ts
  - src/editor/LayersPanel/drag.ts
  - src/editor/LayersPanel/resolve-drop-structure.test.ts
  - src/editor/LayersPanel/position-fixup.test.ts
  - src/code/features/paste-engine/copy/index.ts
  - src/code/features/paste-engine/core/node-creator.ts
  - src/code/features/paste-engine/paste/executor.ts
  - src/code/features/paste-engine/types.ts
  - src/code/features/paste-engine/paste-engine.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/canvas-sandbox/protocol.ts
  - src/canvas-sandbox/bridge-host.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/bridge-host-camera.test.ts
  - src/canvas/hooks/useCanvasTransform.ts
  - src/canvas/hooks/useCanvasTransform.chrome-wheel.test.ts
  - workspace collapse / dock / float implementation
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json

Architecture:
  - Figma parity is canonical: Group = semantic collection with child-derived bounds; Frame = explicit authored box; Auto Layout = Frame behavior; Layout is not a separate node type
  - source marker: data-field-group="true"
  - source wrapper geometry is a derived cache for web/source realization, not Frame paint/layout semantics
  - a Group inside parent Auto Layout is ONE parent-layout item; grouped descendants no longer participate individually in the outer flow
  - parser exposes semantic isGroup; never infer Group from generic CSS alone
  - generic Group/Ungroup owns Cmd/Ctrl+G and Shift+Cmd/Ctrl+G; SVG Group/Ungroup remains separate
  - Phase A: structural creation/ungroup, parser, Layers glyph, menus/shortcuts/palette, source-stack preservation
  - Phase B before completion: auto-refit derived bounds, Group resize/scale, Layers drag into/out, copy/paste + undo/redo parity
Phase B:
  - Baseline: 5795bfbff1fc00b387344ce91e42489bb49f549c
  - derived Group bounds/refit after child move/resize, recursively through nested Groups
  - Group move remains one wrapper move; never rewrite every descendant per drag tick
  - normal Group resize scales descendant box geometry as one collection while leaving type sizes, strokes, and effects unchanged; Scale remains a separate operation that can scale those visual properties too
  - Layers drag supports enter/exit/Group-to-Group with geometry preservation and empty-Group deletion
  - copy/paste/duplicate must preserve data-field-group via the existing attrs pipeline unless tests prove a gap
  - undo/redo must coalesce each visible Group gesture into one coherent history step
Phase B progress:
  - Phase B3 landed at 2cd41e95461b39bdbf5cc56ed63aac31214fca92: flow-positioned Group refit, native Group descendant geometry resize, recursive nested-Group resize, and deterministic clipboard semantic-marker regression coverage
  - Existing mutation/history regression suite passed with the B3 postimage; Group resize descendant writes and wrapper write remain one mutation batch / one visible history gesture
  - Phase B4 landed at 0949d044464953f2d5f5132de8ae15cee97090df: deletion-driven Group refit plus recursive empty-Group collapse across Delete and Layers reparent
  - Phase B5 landed at 1785dbb85b9fea391ce12f8f79ac55a84de775ca: reversible flow Group/Ungroup semantics, fail-safe flow grouping, and paste remapping for Group flow metadata
  - Dedicated Scale-tool behavior remains separate future work; transformed-descendant Group resize remains conservatively gated rather than approximated
<!-- ASSIGNMENT:native-group-ungroup-20260925:END -->



<!-- ASSIGNMENT:native-gallery-authoring-20260925:START -->
### native-gallery-authoring-20260925 — Native Gallery Component + Media Authoring Foundation

Status: active
Baseline: 5795bfbff1fc00b387344ce91e42489bb49f549c
Activation HEAD: 8187f5a875f708fa88f21e75cd1cc7f56bb32c36
Last Sync: 2026-09-25T08:09:29Z

Owned:
  - src/code/gallery/**
  - src/editor/gallery/**
  - src/editor/tools/GalleryTool.tsx
  - src/canvas/gallery/**
  - src/editor/ui/ImageSearchModal.tsx
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/InspectorObjectHeader.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/canvas/drag/toolbar-item-config.ts
  - src/editor/left-toolbar/panels/insert/index.tsx
  - src/**/gallery*.test.ts
  - src/**/Gallery*.test.tsx

Approved Shared:
  - src/canvas/Canvas.tsx
  - src/shared/types.ts
  - src/editor/tools/ImageTool.tsx
  - src/editor/left-toolbar/panels/MediaGalleryPanel.tsx
  - src/editor/left-toolbar/panels/media-gallery-utils.ts
  - src/editor/left-toolbar/panels/media-gallery-utils.test.ts
  - tracker.md

Protected:
  - src/backend/**
  - cloudflare/**
  - wrangler.jsonc
  - .env*
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/mutation/mutation-queue.ts
  - src/canvas/commands.ts
  - src/canvas/shortcuts.ts
  - src/editor/LayersPanel/rows.tsx
  - src/editor/command-palette/sources/commands.ts
  - src/editor/command-palette/useSearchActions.ts
  - src/code/generation/generator-crud.ts
  - src/code/stores/project-store.ts
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:native-gallery-authoring-20260925:END -->

<!-- ASSIGNMENT:figui3-corrective-destroke-font-20260925:START -->
### figui3-corrective-destroke-font-20260925 — FigUI3 Corrective De-stroke + Font Browser Polish

Status: active
Baseline: 8187f5a875f708fa88f21e75cd1cc7f56bb32c36
Activation HEAD: f195fa500f68f1523d167a224180e61a540c134f
Last Sync: 2026-09-25T08:20:35Z

Owned:
  - src/styles/loew-theme.css
  - src/editor/ui/FontFamilyPopup.tsx
  - src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx
  - src/editor/controls/ToolSegmentedControl.tsx
  - src/editor/controls/InspectorIconButtonGroup.tsx
  - src/editor/figui3-global-parity.test.ts
  - src/editor/figui3-typography-controls.test.ts
  - src/editor/figui3-corrective-polish.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/editor/LayersPanel/**
  - src/editor/command-palette/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/code/mutation/**
  - src/backend/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:figui3-corrective-destroke-font-20260925:END -->

<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-005:START -->
### FIELD-INSPECTOR-FIGUI3-005 — Field-native Inspector dropdowns — Phase A core select primitive + Animation migration

Status: active — partial implementation; Typography round intentionally deferred
Baseline: 41fd215381b8bf40bb68eb7cc7ed75c15002b2f6
Activation HEAD: 19b787f501fcbf40b40a9082acd16008493aaddd
Last Sync: 2026-09-25T08:23:14Z

Owned:
  - src/editor/controls/FieldSelect.tsx
  - src/editor/tools/AnimationTool/css/KeyframeSheet.tsx
  - src/editor/figui3-inspector-native-select-contract.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/editor/controls/ToolSelect.tsx
  - src/editor/controls/index.ts
  - src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx
  - src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx
  - src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx
  - src/editor/figui3-typography-controls.test.ts
  - src/editor/ui/FontFamilyPopup.tsx
  - src/editor/ui/ToolPopup.tsx
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/ToolSection.tsx
  - src/canvas/hooks/useCanvasTransform.ts
  - src/canvas/hooks/useCanvasTransform.chrome-wheel.test.ts
  - src/editor/LayersPanel/**
  - src/editor/command-palette/**
  - src/editor/left-toolbar/**
  - src/editor/header/**
  - src/editor/agent/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/code/mutation/**
  - src/canvas/drag/**
  - src/canvas/resize/**
  - src/canvas-sandbox/**
  - src/backend/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-005:END -->


<!-- FIELD_ACTIVE_ASSIGNMENTS_END -->

## Blocked / Integration Notes

<!-- FIELD_BLOCKED_NOTES_START -->
- 2026-09-25T02:17:03Z — Existing-chat adoption: this tracker was initialized after `81a7dbd633db` had already landed because the generic handoff kit was introduced midstream. No pre-implementation tracker reservation existed. Git history is authoritative.
- 2026-09-25T02:17:03Z — Pages/Layers source work is landed and deployed. Screenshot-level post-deploy visual parity remains unverified and should be registered as a new assignment before further implementation.
- Workspace chrome housing integration: user explicitly authorized `workspace-chrome-floating-panes` against the Pages/Layers source postimage landed at `9a74cb253444`. `LeftHeader.tsx` and `LeftMenu.tsx` are shared integration surfaces only; the installer is exact-postimage guarded and must stop on later drift rather than replay stale changes.
<!-- FIELD_BLOCKED_NOTES_END -->

## Installer / Handoff Kit Lessons

These notes are coordination-infrastructure guidance. They are not product behavior and do not expand any completed assignment's source ownership.

### FIELD-INSPECTOR-CONTINUATION-001 packaging lessons

- **Preserve Git porcelain prefix spacing.** An installer preflight parsed `git status --porcelain` with whole-output `.strip()`, which removed the leading status-space from the first dirty line. A later fixed-position slice then corrupted `src/editor/PropertiesPanel.tsx` into `rc/editor/PropertiesPanel.tsx` and produced a false ownership violation. Parse porcelain output without trimming leading whitespace; only remove trailing newlines or use a status-aware parser.

- **Resume must adopt an existing active reservation.** A repaired package re-ran reservation publication even though `FIELD-INSPECTOR-CONTINUATION-001` was already active, creating redundant tracker-only reservation commits. Resumable installers must detect and preserve the live active assignment instead of publishing another reservation.

- **Expanded repair scope must propagate through every gate.** When `src/editor/tools/SvgShapeTool.tsx` was added to the repair package after validation exposed an existing SVG Stroke contract issue, that path also had to be added to the explicit staging/final commit allowlist. Any revision that expands owned repair paths must update target manifests, ownership checks, staging allowlists, commit allowlists, validation, and resume-state recognition together.

- **Package revisions must resume from a predecessor's partial postimage.** The successful r3 package recognized the 12 already-applied inspector files plus one pending SVG repair as a valid mixed state, applied only the missing repair, and later recognized the complete postimage as a no-op before final commit/push. Future r2/r3/r4-style repairs must not require destructive reset/reapply when the previous package stopped safely.

- **Differentiate installer defects from product/test findings.** The SVG Stroke failure that triggered the first repair was not an installer bug: the focused regression test correctly exposed that an SVG without an authored stroke hid the entire addable Stroke section. Product/test findings belong in assignment implementation history; this section is for packaging, coordination, resume, ownership, staging, and deployment-verifier defects.

- **Any installer defect that forces r2/r3/r4/etc. must be recorded here.** Record the failed revision, symptom, root cause, whether repository/source work was affected, the repair, and the reusable prevention rule so parallel chats do not rediscover the same failure.

<!-- LESSON:canvas-interaction-parity-20260924-r1-ts-target:START -->
### canvas-interaction-parity-20260924 r1 packaging lesson

- **r1 stopped safely at TypeScript after focused tests passed.** The newly added sandbox-marquee regression test used `onSelectionChange.mock.calls.at(-1)`, but field's configured TypeScript library target does not include `Array.prototype.at()`. No source commit was created; the already-pushed assignment reservation remained authoritative.
- **r2 resumes the validated partial postimage instead of resetting/reapplying.** It requires the exact 11-file dirty assignment set, checks strong r1 postimage signatures, repairs only the test expression to indexed access, and adopts the existing active tracker reservation.
- **Prevention rule:** generated tests must use syntax compatible with the repository's configured TypeScript target, and package validation should include the real `npx tsc --noEmit --pretty false` gate before handoff whenever a dependency-complete validation environment is available.
<!-- LESSON:canvas-interaction-parity-20260924-r1-ts-target:END -->

<!-- LESSON:pages-layers-ui3-refinement-ii-r1-global-clean:START -->
### pages-layers-ui3-refinement-ii r1 packaging lesson

- **r1 stopped safely before any write because its clean-tree gate was repository-global.** While `canvas-interaction-parity-20260924` was actively modifying canvas files plus approved-shared `src/editor/header/LeftHeader.tsx`, r1 rejected the entire dirty working tree before it could distinguish unrelated work from the genuine shared-path overlap. It made no source writes, tracker writes, commits, or pushes.
- **The shared `LeftHeader.tsx` dirtiness was a real overlap at that moment.** A silo-aware installer still must refuse a dirty/actively-owned path that it intends to change; the defect was treating every other dirty canvas path as equally blocking.
- **r2 uses silo-scoped dirtiness and isolated validation.** Unrelated unstaged/untracked files are fingerprinted and allowed; unrelated staged changes are refused because a commit could accidentally capture them. Owned/shared dirtiness must either be clean baseline state or this package's exact resumable postimage. Tests, TypeScript, and `build:all` run in a detached clean worktree so another chat's uncommitted work cannot contaminate validation.
- **Prevention rule:** field installers must gate on owned/shared overlap, not global cleanliness; preserve and verify unrelated dirty state; never stage outside the allowlist; and validate buildable source in an isolated clean worktree whenever unrelated local work exists.
<!-- LESSON:pages-layers-ui3-refinement-ii-r1-global-clean:END -->

<!-- LESSON:context-components-command-surface-r1-purple-anchor:START -->
### context-components-command-surface r1 packaging lesson

- **r1 stopped safely during complete no-write validation before tracker reservation or source writes.** The installer required every bulk replacement token to exist in `src/editor/LayersPanel/rows.tsx`; semantic tokens `usePurple` and `var(--accent-secondary)` existed, but the comment-only literal `Purple` did not.
- **Root cause: optional/comment cleanup was encoded as a required source anchor.** A cosmetic string replacement was placed in the same mandatory bulk-transform list as semantic code migrations.
- **Repository/source impact: none.** The failing run wrote no tracker/source files and created no commits.
- **r2 repair:** remove only the optional lowercase/uppercase comment-token requirements while retaining exact semantic anchors and all product scope.
- **Prevention rule:** installer compatibility gates must distinguish semantic required anchors from optional comment/text cleanup. Optional substitutions may run conditionally, but their absence must never invalidate a package.
<!-- LESSON:context-components-command-surface-r1-purple-anchor:END -->

<!-- LESSON:canvas-camera-fast-path-safari-r2-mapfile:START -->
### canvas-camera-fast-path Safari r2 packaging lesson

- **Safari r2 stopped after the tracker ownership expansion because macOS system Bash 3.2 does not provide `mapfile`.**
- **Repository/source impact:** tracker-only scope expansion landed; Safari product source was untouched.
- **Repair:** subsequent runners use Bash-3.2-compatible indexed arrays + `while read` for dirty/staged path gates.
- **Prevention rule:** field shell installers must target macOS system Bash 3.2 unless they explicitly invoke and verify a newer Bash.
<!-- LESSON:canvas-camera-fast-path-safari-r2-mapfile:END -->

<!-- LESSON:canvas-camera-fast-path-safari-r3-package-path:START -->
### canvas-camera-fast-path Safari r3 packaging lesson

- **Safari r3 resolved its package directory after changing into the repository.** When launched with a relative script path, `dirname "$0"` therefore resolved to the repo root and Node searched for repo-root `apply.mjs`.
- The user's manual copy of `apply.mjs` then correctly tripped the unrelated-dirt ownership gate.
- **Repository/source impact:** no Safari product source landed.
- **Repair:** resolve the absolute package directory before `cd "$REPO"`; r4 also self-healed only the exact byte-identical untracked installer residue.
- **Prevention rule:** self-contained installers must resolve their own absolute path before changing working directories and must never require helper files to be copied into the target repo.
<!-- LESSON:canvas-camera-fast-path-safari-r3-package-path:END -->

<!-- LESSON:canvas-camera-fast-path-safari-r5-worktree-deps:START -->
### canvas-camera-fast-path Safari r5 packaging lesson

- **Safari r5 correctly created a clean detached worktree but did not provide the repository dependency tree inside it.** `npx vitest` downloaded a standalone Vitest and then failed to resolve field's Vite/Vitest plugins.
- **Repository/source impact:** tracker-only Canvas.tsx ownership expansion landed; product source remained untouched.
- **Repair:** r6 linked the real repo's installed `node_modules` into the isolated worktree and invoked repo-local `./node_modules/.bin/vitest` / `tsc` directly.
- **Prevention rule:** isolated validation must pair clean source with the exact project dependency tree; never let `npx` silently fetch a replacement toolchain during validation.
<!-- LESSON:canvas-camera-fast-path-safari-r5-worktree-deps:END -->


<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r1-fill-anchor:START -->
### FIELD-INSPECTOR-FIGUI3-002 r1 packaging lesson

- **r1 stopped safely during no-write validation after the tracker reservation landed.** The source tree was still clean; no Inspector product files were written, staged, committed, or pushed.
- **Root cause: one required FillControl transform anchor encoded an intermediate/hypothetical preimage rather than the canonical activation blob.** The installer expected `labelText = toHexDisplay(bgColor).replace(/^#/, '');`, while the verified `FillControl.tsx` blob `e094a510a128134ee3a4cb19cd824f56d8c1def5` actually contains `labelText = toHexDisplay(bgColor);`. The manifest was correct; the exact-string transform was not.
- **r2 repair:** use the canonical activation preimage, keep the intended postimage (FigUI3 inline hex without `#`), adopt the existing assignment reservation instead of creating another one, and add package regression coverage for this canonical preimage.
- **Prevention rule:** exact-string installers must derive required preimages from the verified activation blob, never from an intermediate local draft. When the manifest asserts a blob hash, any manually authored transform anchor must be checked against that blob's literal source before delivery.
<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r1-fill-anchor:END -->


<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r2-fileurl-space:START -->
### FIELD-INSPECTOR-FIGUI3-002 r2 packaging lesson

- **r2 stopped safely during no-write validation after adopting the existing Inspector reservation and publishing the r1 lesson.** The source tree was still clean; no Inspector product files were written, staged, committed, or pushed by r2.
- **Root cause: the Node installer derived its own directory from `new URL(import.meta.url).pathname`.** When macOS Finder extracted the package into a suffixed directory containing a space (`...-work 2`), the URL pathname contained percent-encoding (`%20`). The installer therefore looked for payload files under a non-existent percent-encoded filesystem path and reported `missing payload: src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx` even though the payload was present in the ZIP.
- **r3 repair:** resolve the module path with Node's `fileURLToPath(import.meta.url)` before taking `dirname`, preserving spaces and other URL-escaped filesystem characters. r3 also adds a package self-test executed from a temporary directory whose name contains spaces.
- **Prevention rule:** Node ESM installers must never use `new URL(import.meta.url).pathname` as a filesystem path. Always convert file URLs with `fileURLToPath`, and validate self-contained packages from a path containing spaces before delivery.
<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r2-fileurl-space:END -->


<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r3-stale-regression-expectations:START -->
### FIELD-INSPECTOR-FIGUI3-002 r3 validation lesson

- **r3 applied the intended 23-file Inspector postimage, then stopped safely at focused regression tests before any implementation commit.** The working tree contains only the exact assignment postimage; the tracker reservation and prior installer lessons remain authoritative.
- **Root cause: two pre-existing regression expectations encoded the superseded UI contract.** `figma-inspector-contract.test.ts` still required the old generic `<PaddingControl />` even though this assignment intentionally replaces it with the dedicated Layout-owned Auto-layout padding control. `SvgShapeTool.undo-remount.test.tsx` still required `#FF0000`, while the FigUI3 inline paint grammar intentionally displays hex without the leading `#`.
- **Repository/source impact:** no implementation commit was created. The 23 intended Inspector files remain as an exact resumable dirty postimage; only tracker-only coordination commits were pushed.
- **r4 repair:** expand this assignment's owned regression-test surface to `src/editor/figma-inspector-contract.test.ts` and `src/editor/tools/SvgShapeTool.undo-remount.test.tsx`, update only those stale expectations, preserve the 23-file product postimage byte-for-byte, then rerun the full focused suite, TypeScript, and `build:all`.
- **Prevention rule:** when an assignment intentionally changes a visible/source contract, package validation must audit the existing regression suite for expectations that describe the old contract and include those test updates in the ownership manifest before handoff.
<!-- LESSON:FIELD-INSPECTOR-FIGUI3-002-r3-stale-regression-expectations:END -->

<!-- LESSON:native-group-ungroup-phase-a-r1-escaped-newline:START -->
### native-group-ungroup Phase A r1 packaging lesson

- **r1 advanced tracker architecture only, then stopped safely in the isolated worktree before any Group product source was written to the real repository.** The landed tracker commit is `4dce6c1e293ba12c2dfa737841cca716d3fafff8`.
- **Symptom:** all focused suites failed during transform because `src/code/parsing/parser.ts` contained literal `\n` text inside the inserted `CanvasNode.isGroup` declaration.
- **Root cause:** the package generator double-escaped newlines in one exact replacement payload. Installer JavaScript syntax was valid, so `node --check` and the installer self-test passed even though the generated TypeScript postimage was invalid.
- **Repository/source impact:** no Group product source was staged, committed, or pushed. The failure occurred in the detached validation worktree; unrelated Inspector work remained preserved.
- **r2 repair:** encode actual newline characters in the parser replacement, adopt the already-updated active Group tracker state, and add a package self-test that rejects literal escaped-newline artifacts in the `isGroup` replacement payload.
- **Prevention rule:** package validation must distinguish installer syntax from generated-source syntax. For generated exact-replacement payloads, self-tests must validate critical postimage strings themselves, and the detached TypeScript/Vitest/build gate remains mandatory before any real-tree source apply.
<!-- LESSON:native-group-ungroup-phase-a-r1-escaped-newline:END -->

<!-- LESSON:figui3-global-visual-parity-r1-record-commit-args:START -->
### figui3-global-visual-parity r1 packaging lesson

- **r1 fully validated and pushed the intended 22-file implementation, then stopped only at tracker publication.** The landed product commit is `3dd7fafebb83c054f7b89c987d025266ed6c2609`; focused tests, TypeScript, `build:all`, ownership checks, and the implementation push had already succeeded.
- **Root cause: the runner called `field_handoff_kit.py record-commit` with unsupported `--sha` / `--summary` flags.** The helper's argparse contract defines `sha` and `summary` as positional arguments, so the CLI rejected the call after source publication.
- **Repository/source impact:** no product rollback is needed. The implementation is already on `main`; only the commit-ledger/tracker publication step was skipped and the assignment correctly remained active.
- **r2 repair:** adopt the existing active reservation, verify the exact implementation commit/pathset, verify the source deployment before moving HEAD with a tracker-only commit, call `record-commit` with positional `sha` / `summary`, and leave the assignment active for screenshot QA.
- **Prevention rule:** package self-tests must exercise the exact helper CLI invocation shape used by the runner (including argparse positional-vs-option semantics), not merely syntax-check the shell/Python files.
<!-- LESSON:figui3-global-visual-parity-r1-record-commit-args:END -->


<!-- LESSON:figui3-global-visual-parity-r2-ledger-detection:START -->
### figui3-global-visual-parity r2 packaging lesson

- **r2 correctly verified the landed implementation and successful Cloudflare build, then stopped before any tracker commit.**
- **Root cause:** after inserting the r1 lesson, r2 tested `grep -q "$IMPL_SHA" tracker.md` to decide whether the implementation ledger entry already existed. The r1 lesson itself contains that SHA, so the test produced a false positive and skipped `record-commit`. The following deployment annotator correctly required `Commit: <sha>` and then failed because no ledger block existed.
- **Repository/source impact:** product source remained untouched; the only local change was the intended uncommitted tracker lesson from r2.
- **r3 repair:** detect an existing ledger entry only by the exact `Commit: <sha>` field, adopt the known dirty tracker partial postimage, write the ledger entry with the helper's positional CLI, annotate deployment, and commit only `tracker.md`.
- **Prevention rule:** coordination-state detection must test the semantic record being sought, not a broad substring that may also occur in lessons, notes, or historical text.
<!-- LESSON:figui3-global-visual-parity-r2-ledger-detection:END -->

<!-- LESSON:field-project-dashboard-r1-vitest-file-url:START -->
### field-project-dashboard-20260925 r1 validation lesson

- **r1 applied the exact 19-file dashboard postimage, then stopped safely at focused Vitest before staging or committing product source.** The dashboard reservation commit `937d378` was already pushed; the implementation remained an unstaged resumable postimage.
- **Root cause:** `src/dashboard/dashboard-route.test.ts` read `ProjectChip.tsx` with `readFileSync(new URL(..., import.meta.url))`. Under the repository's Vitest/Vite transform, that module URL was not a `file:` URL, so Node rejected it with `TypeError: The URL must be of scheme file`.
- **Repository/source impact:** no dashboard implementation commit was created by r1. The intended 19 dashboard/integration files remained local and unstaged; product behavior was not implicated by the failing assertion harness.
- **r2 repair:** resolve the repository file from `process.cwd()` + `node:path.resolve`, explicitly accept r1's broken test as a predecessor state, replace only that test during resume, and continue the same focused tests, Worker regressions, TypeScript, `build:all`, scoped staging, commit, push, and deployment verification.
- **Prevention rule:** filesystem-reading Vitest tests must not assume transformed `import.meta.url` is a local `file:` URL. Use a repository-root path when the test runner owns `cwd`, or convert a known file URL with `fileURLToPath`; package validation should execute the real focused test command, not only syntax/idempotence checks.
<!-- LESSON:field-project-dashboard-r1-vitest-file-url:END -->

## Commit Ledger


<!-- LESSON:trackpad-pan-feel-20260924-r1-negative-zero:START -->
### trackpad-pan-feel-20260924 r1 packaging lesson

- **r1 stopped safely at focused tests after the pan implementation itself behaved as intended.** Nineteen of twenty focused tests passed; the only failure was the zero-vector assertion because Vitest `toBe` uses `Object.is`, which distinguishes JavaScript `-0` from `+0`.
- **This was a regression-test defect, not a product behavior defect.** `-0 === 0` is true and the camera receives a numerical no-op either way. No implementation commit was created by r1; the pushed reservation remained authoritative.
- **r3 resumes the exact r1 postimage and changes only the test assertion.** The two production files must match the r1 postimage byte-for-byte; the test may be either the exact r1 broken postimage or the exact repaired postimage for idempotent resume. r2 made no writes because its preflight failed first.
- **Prevention rule:** regression tests for a zero vector must not over-specify the IEEE-754 sign bit unless signed zero is part of the contract. Use a sign-agnostic zero assertion when direction at magnitude zero is semantically irrelevant.
<!-- LESSON:trackpad-pan-feel-20260924-r1-negative-zero:END -->


<!-- LESSON:trackpad-pan-feel-20260924-r2-locale-order:START -->
### trackpad-pan-feel-20260924 r2 packaging lesson

- **r2 stopped safely before any validation or source write even though the dirty path set was correct.** It rendered the same three intended paths in the stop message.
- **Root cause: locale-sensitive ordered-string comparison.** The expected list was sorted by the host shell's `sort` command while the actual list was sorted by Python. macOS locale collation may order uppercase `InputHandler...` and lowercase `constants...` differently, so two equal path sets produced unequal multiline strings.
- **Repository/source impact: none.** The r2 runner stopped before its installer `--check`, test repair, staging, commit, or push. The r1 partial postimage and existing tracker reservation remained authoritative.
- **r3 prevention rule: exact ownership/path gates compare sets, never locale-dependent sorted strings.** Diagnostic output may be sorted for readability, but ordering must not determine equality. The staged-path gate uses the same set semantics.
<!-- LESSON:trackpad-pan-feel-20260924-r2-locale-order:END -->

<!-- LESSON:workspace-chrome-floating-panes-r1-comments-indent:START -->
### workspace-chrome-floating-panes r1 packaging lesson

- **r1 stopped safely during the no-write compatibility preflight.** `CommentsListPanel.tsx` contains two right-sidebar shell returns; the installer expected two byte-identical multiline anchors but found only one, so it emitted `INTEGRATION OVERLAP DETECTED` before tracker/source writes.
- **Root cause: indentation-sensitive repeated-JSX matching.** The empty-state shell is nested one JSX level deeper than the populated shell, so the same `className`/`style` pair has eight leading spaces in one branch and six in the other. r1 incorrectly counted them with one exact-indentation anchor.
- **Repository/source impact: none.** The failing r1 run occurred in `--check` mode with a clean working tree and explicitly reported that no source files were written.
- **r2 repair:** transform the empty and populated comment shells as two bounded anchors, preserving exact activation-blob guards and resumable postimage checks. r2 also checks active tracker ownership before source work so broad protected areas are respected even when target blobs have not changed.
- **Prevention rule:** repeated JSX/source transforms must not assume identical indentation across separate branches. Match bounded occurrences independently or use an indentation-aware structural pattern, then assert the exact intended transformed occurrences before writes.
<!-- LESSON:workspace-chrome-floating-panes-r1-comments-indent:END -->

<!-- LESSON:workspace-chrome-floating-panes-r2-protected-ownership:START -->
### workspace-chrome-floating-panes r2 packaging lesson

- **r2 stopped safely at active-assignment preflight after its no-write source compatibility check passed.** It reported broad conflicts against `src/editor/**` and `src/code/**` even though those paths were listed under other assignments as Protected/no-touch areas, not Owned work.
- **Root cause: tracker ownership semantics were inverted.** The r2 gate combined another assignment's `Owned` and `Protected` patterns when looking for conflicts. In field, `Protected` means that assignment promises not to modify those paths; it does not reserve those paths against other independently authorized work.
- **Repository/source impact:** no product source files were written. r2 only published the already-required r1 tracker lesson as commit `0fe4faa40ff65f80b9e1a779a50323a95dc2425c` before the false-positive gate stopped.
- **r3 repair:** cross-assignment overlap checks consider only active `Owned` paths, with `Approved Shared` acting as an explicit exception. `Protected` remains enforced by each assignment against its own writes, but never blocks unrelated work.
- **Prevention rule:** coordination tooling must preserve the distinction between `Owned`, `Approved Shared`, and `Protected`: Owned reserves; Shared permits deliberate overlap; Protected constrains the declaring assignment itself. Never merge Owned + Protected into one conflict set.
<!-- LESSON:workspace-chrome-floating-panes-r2-protected-ownership:END -->

<!-- LESSON:workspace-chrome-floating-panes-r3-stale-sha-verifier:START -->
### workspace-chrome-floating-panes r3 packaging lesson

- **r3 landed the implementation successfully but its final production waiter appeared hung.** It pushed implementation commit `5427d5446a2215b22e0b8ee1a6a0e79bd0422479`, then immediately pushed tracker-only commit `87d4c01a08c5ad7cc2930cffc677150054ec0b9e`, and only afterward polled the implementation SHA for `Workers Builds: field`.
- **Root cause: the verifier polled a superseded SHA.** Cloudflare built the later tracker commit at the head of `main`, so the production UI showed the workspace implementation live while the installer kept waiting for a check run on the earlier implementation SHA.
- **Repository/source impact: none.** The implementation and tracker record were already committed and pushed; the user visually verified the workspace chrome was live and otherwise golden. The only remaining product defect was the Inspector collapse-control placement corrected by r4.
- **r4 repair:** verify the source patch commit while it is still the pushed remote HEAD; only after that check succeeds publish tracker completion.
- **Prevention rule:** a deployment verifier must poll the actual build-triggering HEAD that contains the source change, or verify the source commit before any tracker-only follow-up advances `main`. Never require an exact stale SHA check after deliberately moving HEAD.
<!-- LESSON:workspace-chrome-floating-panes-r3-stale-sha-verifier:END -->

<!-- LESSON:native-group-ungroup-b2-r1-porcelain-trim:START -->
### native-group-ungroup B2 r1 packaging lesson

- **r1 applied the exact five-file Phase B2 Layers reparent/refit postimage and all validation passed before the ownership gate.** Focused validation passed 6 files / 139 tests, TypeScript passed, and `npm run build:all` passed.
- **r1 then stopped before staging or committing product source because its copied handoff-kit ownership parser corrupted the first Git porcelain path.** `run()` called `.strip()` on `git status --porcelain`, removing the first line's leading status-space; `dirty_paths()` then sliced from character 3 and turned `src/code/groups/group-refit.test.ts` into `rc/code/groups/group-refit.test.ts`.
- **Repository/source impact:** the five intended B2 product files remain as the validated unstaged r1 postimage. No B2 implementation commit was created by r1; no reset/reapply is required.
- **r2 repair:** preserve porcelain leading whitespace, parse resume state with NUL-delimited porcelain bytes, require the exact five intended unstaged paths plus strong B2 postimage signatures, and continue from the existing dirty postimage.
- **Prevention rule:** wrappers around `git status --porcelain` must never trim leading whitespace. Strip only terminal newlines or parse `--porcelain=v1 -z` bytes directly. A failed post-validation ownership gate must resume the validated postimage instead of resetting/reapplying it.
<!-- LESSON:native-group-ungroup-b2-r1-porcelain-trim:END -->

<!-- LESSON:native-gallery-authoring-r1-porcelain-trim:START -->
### native-gallery-authoring r1 packaging lesson

- **r1 stopped safely after registering Gallery in the local tracker and before any Gallery product source was written.** The repository source tree remained otherwise clean; the only dirty file was `tracker.md`.
- **Root cause:** the bundled handoff helper called `.strip()` on `git status --porcelain`, removing the first record's leading status-space. Fixed-position slicing then turned `tracker.md` into `racker.md`, causing a false ownership violation.
- **Repository/source impact:** no Gallery source files were staged, committed, pushed, or reset. The uncommitted Gallery reservation in `tracker.md` is an exact resumable partial state.
- **r2 repair:** preserve leading command output whitespace, parse ownership state with `git status --porcelain=v1 -z` bytes, self-test the first dirty path from a temporary repo, adopt the existing local Gallery reservation, then publish reservation + lesson together before source edits.
- **Prevention rule:** ownership tooling must never trim Git porcelain prefixes; use NUL-delimited porcelain parsing and test the first dirty record explicitly.
<!-- LESSON:native-gallery-authoring-r1-porcelain-trim:END -->

<!-- LESSON:native-gallery-authoring-r2-ownership-manifest:START -->
### native-gallery-authoring r2 packaging lesson

- **r2 repaired the Git-porcelain parser, published the Gallery reservation, and applied the exact 21-file Gallery postimage, then stopped before focused tests, TypeScript, build, staging, or source commit.**
- **Root cause:** the implementation intentionally routes Gallery layout authoring through `src/editor/tools/LayoutTool.tsx` and semantic Gallery naming through `src/editor/controls/InspectorObjectHeader.tsx`, but those two genuine integration surfaces were present in the installer target list without being added to the assignment ownership manifest.
- **Repository/source impact:** reservation commit `7641fbf01971cfe8b80b474ac081469e54928e3a` is pushed; the 21 intended Gallery source files remain as an exact unstaged r2 postimage; no Gallery source commit was created and nothing was reset.
- **r4 repair:** explicitly expand Gallery ownership to the two integration surfaces, verify the exact 21-file r2 postimage before tracker mutation, publish the scope expansion as tracker-only coordination, and resume validation from the existing source state without reapplying it.
- **Prevention rule:** every installer mutation target must be represented in Owned or Approved Shared before source application; package self-tests must compare the transform target set against the assignment ownership set.
<!-- LESSON:native-gallery-authoring-r2-ownership-manifest:END -->

<!-- LESSON:native-gallery-authoring-r3-concurrent-main:START -->
### native-gallery-authoring r3 packaging lesson

- **r3 stopped safely before tracker mutation, validation, staging, or source commit because it required local and remote `main` to remain exactly at the Gallery reservation SHA.**
- **Root cause:** native Group Phase B3 legitimately advanced `main` by two commits after the Gallery reservation while touching only Group/resize/paste/Layers paths plus `tracker.md`; none of the 21 Gallery implementation paths changed. The exact-HEAD resume guard treated safe concurrent progress as a conflict.
- **Repository/source impact:** no r3 writes occurred. The 21-file Gallery postimage remained exact and unstaged, while `main` advanced independently.
- **r4 repair:** accept a descendant of the Gallery reservation only after proving the entire intervening source pathset is disjoint from the exact Gallery postimage, then pin the resolved descendant HEAD while publishing Gallery's ownership expansion.
- **Prevention rule:** resumable field installers should distinguish *ancestry drift* from *ownership overlap*: a newer descendant HEAD is safe only after path-level reconciliation proves no assignment integration surface changed.
<!-- LESSON:native-gallery-authoring-r3-concurrent-main:END -->

<!-- LESSON:native-gallery-authoring-r4-typecheck:START -->
### native-gallery-authoring r4 validation lesson

- **r4 successfully reconciled concurrent Group B3 work, published Gallery's expanded ownership, and passed all 5 focused Gallery suites / 22 tests before stopping at TypeScript.**
- **TypeScript finding 1:** `gallery-model.test.ts` constructed the test helper with `id` both before and inside `...partial`, triggering TS2783 even though runtime behavior was harmless.
- **TypeScript finding 2:** `naturalPatch()` covers all runtime values of `index % 4`, but TypeScript does not narrow arithmetic modulo to the finite set 0..3, so the function required an explicit unreachable fallback return to satisfy TS2366.
- **Repository/source impact:** no Gallery source commit was created by r4. Ownership expansion commit `7a531419506f6d1482d635b993a1b7fd26a77358` is pushed; all 21 Gallery implementation files remain unstaged and resumable.
- **r5 repair:** preserve the validated r4 postimage, patch only those two TypeScript findings, rerun the focused suites, full TypeScript, `build:all`, exact ownership/staging gates, source commit, production verification, and tracker completion.
- **Prevention rule:** generated test helpers must avoid duplicate object keys across explicit properties and spreads; finite arithmetic invariants that TypeScript cannot prove need an explicit exhaustive fallback or type-level narrowing.
<!-- LESSON:native-gallery-authoring-r4-typecheck:END -->

<!-- FIELD_COMMIT_LEDGER_START -->
### 2026-09-25T02:12:32Z — pages-layers-ui3-20260924 — 81a7dbd633db

Summary: Match Figma UI3 Pages and Layers panel
Commit: 81a7dbd633dbb7bd64ff22615250323627eefd54

Paths:
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
  - src/editor/left-toolbar/panels/pages-layers-split.ts
  - src/editor/left-toolbar/panels/pages-layers-split.test.ts
  - src/editor/left-toolbar/panels/pages-layers.css

Validation / Build / Deploy:
- `git diff --check`: passed
- focused tests: 4 files / 37 tests passed
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed (main field + sandbox + Preview sandbox)
- ownership allowlist: passed for exactly 7 assignment-owned paths
- push: `c74f5b1..81a7dbd` → `main`
- final Git state after source push: `main...origin/main`, clean
- Cloudflare check: `Workers Builds: field`
- Cloudflare status: completed
- Cloudflare conclusion: success
- Cloudflare Build ID: `27a22ab1-ec65-486b-9594-39544207e9a3`
- Cloudflare Version ID: `f423ab95-5dbe-4ed3-9fcd-e4bee02c1d95`

### 2026-09-25T02:41:44Z — FIELD-INSPECTOR-CONTINUATION-001 — 93c230621054

Summary: Inspector stacking/property-interaction implementation; focused tests, TypeScript, and build:all passed; visual QA acknowledged.
Commit: 93c230621054903aa71d0f57441fa9a2924dfd9d

Paths:
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/InspectorModeTabs.tsx
  - src/editor/controls/RemoveButton.tsx
  - src/editor/controls/ToolSection.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/SizeTool.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx
  - src/editor/tools/StylesTool/atoms/BorderControl.tsx
  - src/editor/tools/StylesTool/atoms/FillControl.tsx
  - src/editor/tools/StylesTool/atoms/FilterControl.tsx
  - src/editor/tools/StylesTool/atoms/ShadowControl.tsx
  - src/editor/tools/SvgShapeTool.tsx

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T02:43:04Z — FIELD-INSPECTOR-CONTINUATION-001 — 93c230621054

Summary: Production verified: Workers Builds: field completed successfully; check-run id 107922233504.
Commit: 93c230621054903aa71d0f57441fa9a2924dfd9d

Paths:
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/InspectorModeTabs.tsx
  - src/editor/controls/RemoveButton.tsx
  - src/editor/controls/ToolSection.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/SizeTool.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx
  - src/editor/tools/StylesTool/atoms/BorderControl.tsx
  - src/editor/tools/StylesTool/atoms/FillControl.tsx
  - src/editor/tools/StylesTool/atoms/FilterControl.tsx
  - src/editor/tools/StylesTool/atoms/ShadowControl.tsx
  - src/editor/tools/SvgShapeTool.tsx

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T03:10:31Z — canvas-interaction-parity-20260924 — 18bde1edec94

Summary: Figma-style hierarchy selection, iframe/host marquee parity, explicit pan priority, and Direct Selection preference retirement
Commit: 18bde1edec94b97ae519e0a206f99f2e7eda674f

Paths:
  - src/canvas-sandbox/bridge-host.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/protocol.ts
  - src/canvas/mouse/CanvasMouseController.test.ts
  - src/canvas/mouse/CanvasMouseController.ts
  - src/canvas/selection/SelectionBox.test.ts
  - src/canvas/selection/SelectionBox.tsx
  - src/canvas/shortcuts.ts
  - src/code/stores/user-preferences-store.ts
  - src/editor/header/LeftHeader.tsx
  - src/editor/header/menu-builders.tsx

Validation / Build / Deploy:
- focused canvas tests: 3 files / 54 passed / 1 todo
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed (main field + sandbox + Preview sandbox)
- ownership allowlist: passed for exactly 11 assignment paths
- implementation push: `origin main`
- r2 repair: replaced TypeScript-target-incompatible `Array.prototype.at()` in SelectionBox regression test
- `Workers Builds: field`: completed / success
- Cloudflare/GitHub check-run ID: 107927933152
- production check: https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/83cdb347-738c-41f0-9449-bdc12e14fdff

### 2026-09-25T03:20:57Z — pages-layers-ui3-refinement-ii-20260924 — 9a74cb253444

Summary: Restore Layers search/page icons, move pane collapse into Figma-style header, refine project/page identity, localize layer selection, and tighten semantic layer chrome.
Commit: 9a74cb25344466ef4ba9adc9046a3365b245a661

Paths:
  - src/editor/header/LeftHeader.tsx
  - src/editor/header/ProjectChip.tsx
  - src/editor/header/project-chip-label.ts
  - src/editor/header/project-chip-label.test.ts
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/left-toolbar/panels/pages-layers.css

Validation / Build / Deploy:
- tracker reservation commit: a61f6ec042209d30b09462cbe7f869a7386e16be
- focused regression tests: 7 files / 78 tests passed
- `git diff --check`: passed
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed (main field + sandbox + Preview sandbox)
- isolated detached-worktree validation: passed
- exact source ownership / scoped staging: passed
- implementation push: `9a74cb25344466ef4ba9adc9046a3365b245a661` → `main`
- `Workers Builds: field`: completed / success
- Cloudflare/GitHub check-run ID: 107930190103
- Cloudflare Build ID: 05e8b7f2-3a40-4084-a46e-f97fed2c6e0a
- Cloudflare Version ID: ed439218-c57d-42c9-ba0b-a95e7e7757a3
- production check: https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/05e8b7f2-3a40-4084-a46e-f97fed2c6e0a

### 2026-09-25T03:47:15Z — trackpad-pan-feel-20260924 — c78cbbfe090b

Summary: Trackpad-aware wheel pan normalization with high-resolution gain curve and line/page delta normalization
Commit: c78cbbfe090be9cbdb0b0fd407a2ef709a362980

Paths:
  - src/canvas/transform/InputHandler.pan.test.ts
  - src/canvas/transform/InputHandler.ts
  - src/canvas/transform/constants.ts

Validation / Build / Deploy:
- focused pan + zoom tests: passed (20/20)
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed (main field + sandbox + Preview sandbox)
- ownership allowlist: passed for exactly 3 assignment-owned paths
- implementation push: `origin main`
- r3 resume: repaired the r1 signed-zero regression assertion; r2 made no source writes because its locale-sensitive path-order preflight stopped before validation/application
- `Workers Builds: field`: completed / success
- Cloudflare/GitHub check-run ID: 107935502945
- production check: https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/2f0352f7-6925-46b0-b307-582d7eab3601

### 2026-09-25T04:02:42Z — canvas-camera-fast-path-20260924 — 0de7d3090d3e

Summary: One-way latest-wins canvas camera transport replacing per-frame Comlink RPC
Commit: 0de7d3090d3eedfa76627b6ba9ab38b03197b069

Paths:
  - src/canvas-sandbox/bridge-host-camera.test.ts
  - src/canvas-sandbox/bridge-host.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/protocol.ts

Validation / Build / Deploy:
- focused camera/bridge + pan/zoom tests: passed
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed (main field + sandbox + Preview sandbox)
- ownership allowlist: passed for exactly 4 assignment paths
- implementation push: `origin main`
- `Workers Builds: field`: completed / success
- Cloudflare/GitHub check-run ID: 107938598530
- production check: https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/a882e386-caf4-4953-86ca-43255644aa46
- live visual cadence verification: PENDING USER CHECK — assignment intentionally remains active

### 2026-09-25T04:27:29Z — workspace-chrome-floating-panes — 5427d5446a22

Summary: Deterministic docked/floating workspace housing, full left collapse, right utility header redistribution, camera-safe geometry, and persisted left-panel context.
Commit: 5427d5446a2215b22e0b8ee1a6a0e79bd0422479

Paths:
  - src/App.tsx
  - src/code/stores/left-panel-store.ts
  - src/code/stores/workspace-panels-store.ts
  - src/editor/ChromeIslands.tsx
  - src/editor/CommentsListPanel.tsx
  - src/editor/PropertiesPanel.tsx
  - src/editor/VibeDockShell.tsx
  - src/editor/WorkspaceRestoreBar.tsx
  - src/editor/collab/InspectorCollaborators.tsx
  - src/editor/header/LeftHeader.tsx
  - src/editor/header/RightHeader.tsx
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/left-toolbar/LeftPanel.tsx
  - src/editor/workspace-layout.test.ts
  - src/editor/workspace-layout.ts

Validation / Build / Deploy:
- `git diff --check`: passed
- focused workspace layout tests: passed
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed
- validation executed in an isolated detached worktree before live apply
- source staging restricted to the workspace assignment allowlist
- production verification: pending

### 2026-09-25T04:37:39Z — workspace-chrome-floating-panes — c25a5cd15b94

Summary: Move the Inspector collapse control into the canvas gutter so it no longer overlaps the Design / Prototype row.
Commit: c25a5cd15b945e01a3e8b0cd8765b7cd78187a7b

Paths:
  - src/App.tsx

Validation / Build / Deploy:
- `git diff --check`: passed
- `npx tsc --noEmit --pretty false`: passed
- `npm run build:all`: passed in isolated detached worktree
- visual QA: workspace chrome confirmed golden except this collapse-control placement defect
- fix: 24px Inspector collapse control moved to the canvas gutter, 8px outside the Inspector
- `Workers Builds: field`: completed / success

### 2026-09-25T04:43:04Z — context-components-command-surface-20260925 — 9ea4ededb270

Summary: Complete command-surface/component interaction pass, including final project-title menu anchoring/density polish.
Commit: 9ea4ededb2706509270e96c0cbc601e3c88b53fb

Implementation chain:
- 2e053876a7cc3ecbf8ac4bfb7c62f9b4f2238782 — Refine context commands and component semantics
- 06155d9b05ece916c5fb77c14bf5e50b623a57e5 — Expand title menu polish ownership
- 9ea4ededb2706509270e96c0cbc601e3c88b53fb — Polish project title menu anchoring

Validation / Build / Deploy:
- command-surface source passed isolated focused tests, TypeScript, and `npm run build:all`
- final title-menu focused tests: 4 files / 16 tests passed
- final title-menu `npx tsc --noEmit --pretty false`: passed
- final title-menu `npm run build:all`: passed
- source ownership / scoped staging: passed
- `Workers Builds: field`: completed / success for final source HEAD
- Cloudflare/GitHub check-run ID: 107946994267
- Cloudflare Build ID: 2c750344-82c1-4ed9-a7af-318bfb39d1cf
- Cloudflare Version ID: c63b492e-3a92-4888-b0cf-58bd0d75d7eb


### 2026-09-25 — canvas-camera-fast-path-20260924 — a10af177e311

Summary:
- eliminated stop-motion camera transport by moving live transforms off Comlink RPC
- tuned high-resolution trackpad pan input
- made Safari trackpad routing deterministic with a same-document parent input surface above the iframe
- preserved Chrome's smooth camera behavior

Commits:
- c78cbbfe090be9cbdb0b0fd407a2ef709a362980 — Improve trackpad canvas pan responsiveness
- 0de7d3090d3eedfa76627b6ba9ab38b03197b069 — Fix canvas camera frame transport
- 1d5ced54297537fa2b3462d83c74896d8e6d4156 — Route Safari trackpad wheel input to canvas
- a10af177e311dba88197164658d7e16f7233a377 — Add Safari-safe parent canvas input surface

Validation / Deploy:
- focused regression tests passed
- TypeScript passed
- `npm run build:all` passed
- ownership / scoped staging passed
- `Workers Builds: field`: completed / success
- Cloudflare Build ID: c5818c96-d456-42fb-8bb1-53edf510c78a
- live QA: Chrome smooth; Safari pan fixed
- assignment status: complete

### 2026-09-25T05:29:00Z — FIELD-INSPECTOR-FIGUI3-002 — 2d5cbcc74340

Summary: FigUI3 Inspector paint rows, vector effects, Auto layout padding, and Typography implementation; r5 repaired a TypeScript narrowing defect in the Typography number-style preservation array; focused tests, TypeScript, build:all, and visual QA passed. Production verified: Workers Builds: field completed successfully; check-run id 107956486532.
Commit: 2d5cbcc743403c121d729c18fb7c3835e28b152f

Paths:
  - src/editor/controls/ColorInput.tsx
  - src/editor/controls/ControlActionRow.tsx
  - src/editor/controls/EffectRow.tsx
  - src/editor/controls/PaintRow.tsx
  - src/editor/controls/index.ts
  - src/editor/figma-inspector-contract.test.ts
  - src/editor/figui3-inspector-parity.test.ts
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx
  - src/editor/tools/StylesTool/atoms/BorderControl.tsx
  - src/editor/tools/StylesTool/atoms/FillControl.tsx
  - src/editor/tools/StylesTool/atoms/FilterControl.tsx
  - src/editor/tools/StylesTool/atoms/ShadowControl.tsx
  - src/editor/tools/StylesTool/index.tsx
  - src/editor/tools/SvgShapeTool.tsx
  - src/editor/tools/SvgShapeTool.undo-remount.test.tsx
  - src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx
  - src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx
  - src/editor/tools/TextStyleTool/atoms/StrokeControl.tsx
  - src/editor/tools/TextStyleTool/atoms/TextColorControl.tsx
  - src/editor/tools/layout-padding.test.ts
  - src/editor/tools/layout-padding.ts
  - src/editor/ui/paint-opacity.test.ts
  - src/editor/ui/paint-opacity.ts

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T05:41:15Z — field-persistent-project-storage-20260925 — 66a33356fa1e

Summary: R2-backed hosted project persistence with conditional writes, migration, Access validation, and remote-safe autosave
Commit: 66a33356fa1ee1fdc02134cc7aa866e4d1ed62ba

Paths:
  - .env.example
  - cloudflare/field-persistence.test.ts
  - cloudflare/worker.js
  - src/backend/autosave.ts
  - src/backend/field-backend.test.ts
  - src/backend/field-backend.ts
  - src/backend/index.ts
  - wrangler.jsonc

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T06:07:04Z — FIELD-INSPECTOR-FIGUI3-003 — c4f884aa7d6e

Summary: FigUI3 Inspector object/component header depth, Selection colors overflow and hover actions, neutral linked-style rows, and searchable Custom styles popup. Focused tests, TypeScript, build:all, and visual QA passed. Production verified: Workers Builds: field completed successfully; check-run id 107964533315.
Commit: c4f884aa7d6e398cd6bddcc4de455ee0c17bff4a

Paths:
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/ColorInput.tsx
  - src/editor/controls/InspectorObjectHeader.tsx
  - src/editor/figma-inspector-contract.test.ts
  - src/editor/figui3-inspector-header-selection.test.ts
  - src/editor/tools/SelectionTool.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/ui/PresetPicker.tsx

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T06:31:23Z — FIELD-INSPECTOR-FIGUI3-004 — 922592cf85b6

Summary: FigUI3 Typography: left-aligned family dropdown with separate rich browser, supplied font-size preset ladder, and opt-in persistent numeric steppers. Focused tests, TypeScript, build:all, and visual QA passed. Production verified: Workers Builds: field completed successfully; check-run id 107970051127.
Commit: 922592cf85b673d7525d60f2a4b450fd64a5e698

Paths:
  - src/editor/controls/ToolInput.tsx
  - src/editor/figui3-typography-controls.test.ts
  - src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx
  - src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T07:20:06Z — figui3-global-visual-parity-20260925 — 3dd7fafebb83

Summary: Global FigUI3 polish, neutral chrome levels, compact font/popup/tooling geometry, and editor-only per-page canvas appearance. Isolated focused tests, TypeScript, build:all, and diff checks passed.
Commit: 3dd7fafebb83c054f7b89c987d025266ed6c2609

Paths:
  - src/App.tsx
  - src/canvas/Canvas.tsx
  - src/code/project/page-appearance-config.test.ts
  - src/code/project/page-appearance-config.ts
  - src/code/stores/page-appearance-store.ts
  - src/code/stores/user-preferences-store.ts
  - src/design-system/SearchBar.tsx
  - src/design-system/SectionLabel.tsx
  - src/design-system/SidebarRow.tsx
  - src/editor/BottomToolbar.tsx
  - src/editor/PageAppearanceBridge.tsx
  - src/editor/PropertiesPanel.tsx
  - src/editor/builder-theme.ts
  - src/editor/controls/ToolSection.tsx
  - src/editor/figui3-global-parity.test.ts
  - src/editor/tools/PageAppearanceTool.tsx
  - src/editor/ui/FontFamilyPopup.tsx
  - src/editor/ui/ThemeNeutralPopover.tsx
  - src/editor/ui/ToolPopup.tsx
  - src/shared/editor-neutral-theme.test.ts
  - src/shared/editor-neutral-theme.ts
  - src/styles/loew-theme.css

Validation / Build / Deploy:
- Production verified: Workers Builds: field completed successfully; check-run id 107980451951; https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/1b266cbd-3ac2-4e64-8f18-abdd82542918

### 2026-09-25T07:23:37Z — native-group-ungroup-20260925 — 6a0a8c07f2b7

Summary: Phase B2 r2 resume: semantic Group inside-drop, world-geometry-preserving Layers reparent, source/destination refit, nested refit chaining, and empty-Group cleanup. Focused tests 139/139, TypeScript, build:all, and Workers Builds: field passed.
Commit: 6a0a8c07f2b77ecc8b6606ac3c890eea10d73f6c

Paths:
  - src/code/groups/group-refit.test.ts
  - src/code/groups/group-refit.ts
  - src/editor/LayersPanel/drag.ts
  - src/editor/LayersPanel/resolve-drop-structure.test.ts
  - src/editor/LayersPanel/rows.tsx

Validation / Build / Deploy:
- update this event if production verification is still pending

### 2026-09-25T08:23:02Z — figui3-corrective-destroke-font-20260925 — 3bc7fe18b801

Summary: Corrective FigUI3 de-stroke pass plus field-native font family trigger and rebuilt Fonts browser; focused visual-contract tests, TypeScript, build:all, ownership, and isolated validation passed.
Commit: 3bc7fe18b80145f7cde8672274e460955c71bda5

Paths:
  - src/editor/controls/InspectorIconButtonGroup.tsx
  - src/editor/controls/ToolSegmentedControl.tsx
  - src/editor/figui3-corrective-polish.test.ts
  - src/editor/figui3-global-parity.test.ts
  - src/editor/figui3-typography-controls.test.ts
  - src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx
  - src/editor/ui/FontFamilyPopup.tsx
  - src/styles/loew-theme.css

Validation / Build / Deploy:
- Production verified: Workers Builds: field completed successfully; check-run id 107999247734; https://dash.cloudflare.com/8df30cd302a4d4a4c01db9863c712166/workers/services/view/field/production/builds/c3a1219b-1afb-421b-a7d7-47402d97253b

### 2026-09-25T08:32:39Z — field-project-dashboard-20260925 — e0d050d85f3c

Summary: Dashboard implementation landed; focused dashboard/Worker tests, TypeScript, build:all, and Workers Builds: field passed. Manual Access-authenticated production smoke remains required before completion.
Commit: e0d050d85f3cc16764dd564dd589a620180e1d11

Paths:
  - cloudflare/field-dashboard.test.ts
  - cloudflare/worker.js
  - src/Dashboard.tsx
  - src/backend/field-projects.test.ts
  - src/backend/field-projects.ts
  - src/dashboard/DashboardHeader.tsx
  - src/dashboard/DashboardSidebar.tsx
  - src/dashboard/EmptyState.tsx
  - src/dashboard/ProjectCard.tsx
  - src/dashboard/ProjectCardMenu.tsx
  - src/dashboard/ProjectGrid.tsx
  - src/dashboard/RenameProjectDialog.tsx
  - src/dashboard/dashboard-route.test.ts
  - src/dashboard/dashboard-route.ts
  - src/dashboard/project-meta.test.ts
  - src/dashboard/project-meta.ts
  - src/editor/header/ProjectChip.tsx
  - src/main.tsx
  - src/styles/dashboard.css

Validation / Build / Deploy:
- update this event if production verification is still pending

<!-- FIELD_COMMIT_LEDGER_END -->

## Completed Assignments

<!-- FIELD_COMPLETED_ASSIGNMENTS_START -->
<!-- ASSIGNMENT:pages-layers-ui3-20260924:START -->
### pages-layers-ui3-20260924 — Figma UI3 Pages / Layers parity pass

Status: complete
Baseline: c74f5b1ccc538638fef558422bcad12d4edf55f2
Activation HEAD: 81a7dbd633dbb7bd64ff22615250323627eefd54
Last Sync: 2026-09-25T02:17:03Z
Scope: Figma UI3 Pages/Layers density, semantic hierarchy/glyphs, selection treatment, and persistent resizable document-panel split while preserving existing layer-order/reorder architecture.

Owned:
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
  - src/editor/left-toolbar/panels/pages-layers-split.ts
  - src/editor/left-toolbar/panels/pages-layers-split.test.ts
  - src/editor/left-toolbar/panels/pages-layers.css

Approved Shared:
  - none

Protected:
  - src/canvas/**
  - src/code/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json

Deferred:
  - Post-deploy screenshot-level visual parity review before declaring the surface visually final.
<!-- ASSIGNMENT:pages-layers-ui3-20260924:END -->

<!-- ASSIGNMENT:FIELD-INSPECTOR-CONTINUATION-001:START -->
### FIELD-INSPECTOR-CONTINUATION-001 — Continue field Inspector Panel Figma-Parity Cleanup

Status: complete
Baseline: c74f5b1ccc538638fef558422bcad12d4edf55f2
Activation HEAD: 9686d94bba1840f79c20f287664a61d27f217fb8
Last Sync: 2026-09-25T02:43:04Z

Owned:
  - src/editor/PropertiesPanel.tsx
  - src/editor/tools/StylesTool/**
  - src/editor/tools/TextStyleTool/**
  - src/editor/tools/SvgShapeTool.tsx
  - src/editor/tools/SizeTool.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/editor/controls/ToolSection.tsx
  - src/editor/controls/ToolDivider.tsx
  - src/editor/controls/ControlActionRow.tsx
  - src/editor/controls/ColorSwatch.tsx
  - src/editor/controls/RemoveButton.tsx
  - src/editor/controls/ToolSegmentedControl.tsx
  - src/editor/controls/InspectorModeTabs.tsx
  - src/editor/controls/SingleEntryRow.tsx
  - src/editor/controls/EntryList.tsx

Approved Shared:
  - src/styles/loew-theme.css

Protected:
  - src/canvas/**
  - src/editor/left-toolbar/**
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
<!-- ASSIGNMENT:FIELD-INSPECTOR-CONTINUATION-001:END -->

<!-- ASSIGNMENT:canvas-interaction-parity-20260924:START -->
### canvas-interaction-parity-20260924 — Figma-style canvas selection, marquee, and pan parity

Status: complete
Baseline: c74f5b1ccc538638fef558422bcad12d4edf55f2
Activation HEAD: bff959b01a6cac352fad3685638274457f89a5dc
Last Sync: 2026-09-25T03:10:31Z

Owned:
  - src/canvas/mouse/CanvasMouseController.ts
  - src/canvas/mouse/CanvasMouseController.test.ts
  - src/canvas/selection/SelectionBox.tsx
  - src/canvas/selection/SelectionBox.test.ts
  - src/canvas/shortcuts.ts
  - src/canvas-sandbox/protocol.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/bridge-host.ts

Approved Shared:
  - src/code/stores/user-preferences-store.ts
  - src/editor/header/menu-builders.tsx
  - src/editor/header/LeftHeader.tsx

Protected:
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/**
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
  - src/editor/left-toolbar/panels/pages-layers-split.ts
  - src/editor/left-toolbar/panels/pages-layers-split.test.ts
  - src/editor/left-toolbar/panels/pages-layers.css
  - src/canvas/drag/**
  - src/code/mutation/**
  - src/code/parsing/**
  - src/code/components/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:canvas-interaction-parity-20260924:END -->
<!-- ASSIGNMENT:pages-layers-ui3-refinement-ii-20260924:START -->
### pages-layers-ui3-refinement-ii-20260924 — Pages / Layers UI3 Refinement II

Status: complete
Baseline: 7664c15eb7b81d5c07aaa7a554cfa28a1681c339
Activation HEAD: 7664c15eb7b81d5c07aaa7a554cfa28a1681c339
Landed Commit: 9a74cb25344466ef4ba9adc9046a3365b245a661
Last Sync: 2026-09-25T03:20:57Z

Scope: Restore compact page icons and Layers search, move pane collapse into the Figma-style header, convert project/page identity to two-line UI3 hierarchy, localize layer selection to one row, and tighten semantic glyph/action chrome without changing layer ordering, drag/reparent, search, rename, visibility, lock, component, viewport/variant, or canvas-selection semantics.

Owned:
  - src/editor/header/LeftHeader.tsx
  - src/editor/header/ProjectChip.tsx
  - src/editor/header/project-chip-label.ts
  - src/editor/header/project-chip-label.test.ts
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/left-toolbar/panels/pages-layers.css

Approved Shared:
  - tracker.md

Protected:
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/**
  - src/editor/PropertiesPanel.tsx
  - src/editor/tools/**
  - src/editor/controls/**
  - src/editor/header/menu-builders.tsx
  - src/design-system/**
  - src/styles/loew-theme.css
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json

Validation / Deploy:
  - 7 focused test files / 78 tests passed
  - TypeScript passed
  - `npm run build:all` passed
  - production Cloudflare build completed successfully
  - check-run ID: 107930190103
  - build ID: 05e8b7f2-3a40-4084-a46e-f97fed2c6e0a
  - version ID: ed439218-c57d-42c9-ba0b-a95e7e7757a3
<!-- ASSIGNMENT:pages-layers-ui3-refinement-ii-20260924:END -->

<!-- ASSIGNMENT:trackpad-pan-feel-20260924:START -->
### trackpad-pan-feel-20260924 — Tune trackpad canvas pan responsiveness

Status: complete
Baseline: 9a74cb25344466ef4ba9adc9046a3365b245a661
Activation HEAD: 2333f0c65c351d38a32f1cc59cc78f6ddf5795d2
Last Sync: 2026-09-25T03:47:15Z

Owned:
  - src/canvas/transform/InputHandler.ts
  - src/canvas/transform/constants.ts
  - src/canvas/transform/InputHandler.pan.test.ts

Approved Shared:
  - none

Protected:
  - src/canvas/mouse/**
  - src/canvas/selection/**
  - src/canvas/drag/**
  - src/canvas-sandbox/**
  - src/code/**
  - src/editor/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:trackpad-pan-feel-20260924:END -->

<!-- ASSIGNMENT:workspace-chrome-floating-panes:START -->
### workspace-chrome-floating-panes — Figma-style floating workspace chrome

Status: complete
Baseline: 9a74cb25344466ef4ba9adc9046a3365b245a661
Activation HEAD: 4044ba6404f82cec551dee6a3e3421459b230114
Last Sync: 2026-09-25T04:37:39Z

Owned:
  - src/App.tsx
  - src/code/stores/workspace-panels-store.ts
  - src/code/stores/left-panel-store.ts
  - src/editor/ChromeIslands.tsx
  - src/editor/header/RightHeader.tsx
  - src/editor/left-toolbar/LeftPanel.tsx
  - src/editor/workspace-layout.ts
  - src/editor/workspace-layout.test.ts
  - src/editor/WorkspaceRestoreBar.tsx
  - src/editor/collab/InspectorCollaborators.tsx

Approved Shared:
  - src/editor/header/LeftHeader.tsx
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/PropertiesPanel.tsx
  - src/editor/CommentsListPanel.tsx
  - src/editor/VibeDockShell.tsx
  - tracker.md

Protected:
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/**
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
  - src/editor/left-toolbar/panels/pages-layers-split.ts
  - src/editor/left-toolbar/panels/pages-layers-split.test.ts
  - src/editor/left-toolbar/panels/pages-layers.css
  - src/editor/tools/**
  - src/editor/controls/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/mutation/**
  - src/code/parsing/**
  - src/code/components/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
<!-- ASSIGNMENT:workspace-chrome-floating-panes:END -->
<!-- ASSIGNMENT:context-components-command-surface-20260925:START -->
### context-components-command-surface-20260925 — Context Commands + Component Interaction

Status: complete
Baseline: 42502f7db62980401bd4a2ccfdd981ba62f7f565
Activation HEAD: 27a2d58506765eae2386cb7573b5c06a47d53e64
Landed Commit: 9ea4ededb2706509270e96c0cbc601e3c88b53fb
Last Sync: 2026-09-25T04:43:04Z

Scope: Refine field's object/layer context menu, Pages context menu, and project/title menu; keep component controls at the top; and migrate component identity to a semantic component accent derived from the active field accent. Only already-real component/navigation behavior is surfaced. Native generic Group/Ungroup remains a separate deterministic document-model feature immediately after this UI pass.

Owned:
  - src/canvas/ui/ContextMenu.tsx
  - src/editor/FileExplorer.tsx
  - src/editor/header/ProjectChip.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/left-toolbar/panels/LibraryPanel/sections/ComponentsSection.tsx
  - src/editor/left-toolbar/panels/LibraryPanel/items/ComponentRow.tsx
  - src/canvas/ui/ComponentBreadcrumb.tsx
  - src/editor/ui/NameInputModal.tsx
  - src/styles/loew-theme.css
  - src/editor/page-menu-commands.ts
  - src/editor/page-menu-commands.test.ts
  - src/design-system/DropdownMenu.tsx

Approved Shared:
  - tracker.md

Protected:
  - src/canvas/** except src/canvas/ui/ContextMenu.tsx and src/canvas/ui/ComponentBreadcrumb.tsx
  - src/canvas-sandbox/**
  - src/code/**
  - src/editor/left-toolbar/LeftPanel.tsx
  - src/editor/left-toolbar/panels/PagesLayersPanel.tsx
  - src/editor/header/LeftHeader.tsx
  - workspace collapse / dock / float implementation
  - src/editor/PropertiesPanel.tsx
  - src/editor/tools/**
  - src/editor/controls/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json

Notes:
  - Collapsible Workspace may land after this reservation. If it changes none of the owned paths, this installer integrates it and proceeds. If it changes an owned path, the installer stops with INTEGRATION OVERLAP DETECTED.
  - `Group Selection` is intentionally disabled for non-SVG selections in this pass. Existing Revyme SVG grouping remains real and is relabeled `Group SVGs` / `Ungroup SVGs`. Native field Group/Ungroup is not faked with Frame.

Notes:
  - Title-menu final polish: project menu anchors from title end/chevron and uses opt-in compact dropdown density.
Validation / Deploy:
  - implementation commit: 2e053876a7cc3ecbf8ac4bfb7c62f9b4f2238782
  - final title-menu polish: 9ea4ededb2706509270e96c0cbc601e3c88b53fb
  - final focused tests: 4 files / 16 tests passed
  - TypeScript passed
  - npm run build:all passed
  - Workers Builds: field completed successfully
  - check-run ID: 107946994267
  - build ID: 2c750344-82c1-4ed9-a7af-318bfb39d1cf
  - version ID: c63b492e-3a92-4888-b0cf-58bd0d75d7eb
<!-- ASSIGNMENT:context-components-command-surface-20260925:END -->
<!-- ASSIGNMENT:canvas-camera-fast-path-20260924:START -->
### canvas-camera-fast-path-20260924 — Remove stop-motion canvas camera updates

Status: complete
Baseline: 42502f7db62980401bd4a2ccfdd981ba62f7f565
Activation HEAD: 42502f7db62980401bd4a2ccfdd981ba62f7f565
Last Sync: 2026-09-25T04:51:36Z

Scope:
- make trackpad pan responsive rather than under-driven
- remove frame-rate camera traffic from Comlink RPC
- preserve Chrome's smooth camera path
- restore two-finger pan in Safari and Safari Private Browsing

Implementation:
- c78cbbfe090be9cbdb0b0fd407a2ef709a362980 — Improve trackpad canvas pan responsiveness
- 0de7d3090d3eedfa76627b6ba9ab38b03197b069 — Fix canvas camera frame transport
- 1d5ced54297537fa2b3462d83c74896d8e6d4156 — Route Safari trackpad wheel input to canvas
- a10af177e311dba88197164658d7e16f7233a377 — Add Safari-safe parent canvas input surface

Final architecture:
- TransformManager remains the camera authority.
- high-frequency camera transforms bypass Comlink request/reply traffic through the raw one-way parent→sandbox fast path.
- trackpad wheel normalization remains in InputHandler with the tuned gain curve.
- Safari uses the same camera transport as Chrome.
- the canvas iframe remains non-interactive; a transparent same-document parent input surface above it gives WebKit a deterministic wheel hit target without relying on iframe event-region routing.
- interactive field overlays remain above the input surface.

Validation / Build / Deploy:
- focused camera/pan/zoom/Safari routing regression tests passed during the implementation sequence.
- TypeScript passed.
- `npm run build:all` passed.
- implementation ownership gates passed.
- `Workers Builds: field` completed / success for a10af177e311dba88197164658d7e16f7233a377.
- Cloudflare Build ID: c5818c96-d456-42fb-8bb1-53edf510c78a.
- live physical QA: Chrome smooth; Safari two-finger pan fixed after the parent input surface revision.
- user acceptance: fixed.

Notes:
- the Safari failure was not a transform-math problem after Chrome was proven smooth.
- coordinate/window wheel rerouting alone did not restore Safari pan.
- first point of divergence was the embedded iframe input boundary; moving the physical input hit target into the parent document fixed WebKit without browser-specific gesture APIs.
<!-- ASSIGNMENT:canvas-camera-fast-path-20260924:END -->

<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-002:START -->
### FIELD-INSPECTOR-FIGUI3-002 — FigUI3 Paint Rows, Effects, Auto Layout Padding, and Typography

Status: complete
Baseline: 93c230621054903aa71d0f57441fa9a2924dfd9d
Activation HEAD: 52f6f8e646b12b3ef644406c64e7fdf36daad004
Last Sync: 2026-09-25T05:29:00Z

Owned:
  - src/editor/controls/PaintRow.tsx
  - src/editor/controls/EffectRow.tsx
  - src/editor/controls/index.ts
  - src/editor/controls/ControlActionRow.tsx
  - src/editor/controls/ColorInput.tsx
  - src/editor/ui/paint-opacity.ts
  - src/editor/ui/paint-opacity.test.ts
  - src/editor/tools/layout-padding.ts
  - src/editor/tools/layout-padding.test.ts
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/SvgShapeTool.tsx
  - src/editor/tools/StylesTool/index.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/tools/StylesTool/atoms/FillControl.tsx
  - src/editor/tools/StylesTool/atoms/BorderControl.tsx
  - src/editor/tools/StylesTool/atoms/ShadowControl.tsx
  - src/editor/tools/StylesTool/atoms/FilterControl.tsx
  - src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx
  - src/editor/tools/TextStyleTool/TypographyAdvancedPopover.tsx
  - src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx
  - src/editor/tools/TextStyleTool/atoms/TextColorControl.tsx
  - src/editor/tools/TextStyleTool/atoms/StrokeControl.tsx
  - src/editor/figui3-inspector-parity.test.ts

  - src/editor/figma-inspector-contract.test.ts

  - src/editor/tools/SvgShapeTool.undo-remount.test.tsx

Approved Shared:
  - none

Protected:
  - src/editor/PropertiesPanel.tsx
  - src/editor/FileExplorer.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/**
  - src/editor/left-toolbar/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/editor/header/**
  - src/code/stores/user-preferences-store.ts
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-002:END -->

<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-003:START -->
### FIELD-INSPECTOR-FIGUI3-003 — FigUI3 Inspector Header, Selection Colors, Styles, and Overflow

Status: complete
Baseline: 2aabfa52e7f053405511f5604e8b988c9b089df1
Activation HEAD: 37c5097cf2a8a2cfb447d5be30255c7d0a0f0571
Last Sync: 2026-09-25T06:07:04Z

Owned:
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/InspectorObjectHeader.tsx
  - src/editor/tools/SelectionTool.tsx
  - src/editor/controls/ColorInput.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/ui/PresetPicker.tsx
  - src/editor/figui3-inspector-header-selection.test.ts
  - src/editor/figma-inspector-contract.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/editor/LayersPanel/**
  - src/editor/FileExplorer.tsx
  - src/editor/left-toolbar/**
  - src/editor/header/**
  - src/editor/PropertiesPanel.tsx workspace dock/float shell semantics outside the object-header composition
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/backend/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-003:END -->

<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-004:START -->
### FIELD-INSPECTOR-FIGUI3-004 — FigUI3 Typography Dropdowns and Numeric Steppers

Status: complete
Baseline: 6df9a5554d9933a2a195fef9300cbd113d07820f
Activation HEAD: d6c2a691f0f95ffd7bb8c0ab38969f414db8235c
Last Sync: 2026-09-25T06:31:24Z

Owned:
  - src/editor/tools/TextStyleTool/atoms/FontFamilyControl.tsx
  - src/editor/tools/TextStyleTool/atoms/TextPropertyControl.tsx
  - src/editor/controls/ToolInput.tsx
  - src/editor/figui3-typography-controls.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/editor/PropertiesPanel.tsx
  - src/editor/controls/InspectorObjectHeader.tsx
  - src/editor/tools/SelectionTool.tsx
  - src/editor/tools/StylesTool/**
  - src/editor/LayersPanel/**
  - src/editor/header/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/backend/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
<!-- ASSIGNMENT:FIELD-INSPECTOR-FIGUI3-004:END -->

<!-- ASSIGNMENT:figui3-global-visual-parity-20260925:START -->
### figui3-global-visual-parity-20260925 — FigUI3 Global Visual Parity + Neutral Chrome + Page Appearance

Status: complete
Baseline: f4e1139b2b95588b65d4f34d209ec2d9a58c0c19
Activation HEAD: d9bb916d4f03b0f1d0f54718dc8dda046ab11c4b
Last Sync: 2026-09-25T07:37:00Z

Owned:
  - src/styles/loew-theme.css
  - src/code/stores/user-preferences-store.ts
  - src/editor/builder-theme.ts
  - src/editor/BottomToolbar.tsx
  - src/editor/PropertiesPanel.tsx
  - src/App.tsx
  - src/canvas/Canvas.tsx
  - src/editor/ui/FontFamilyPopup.tsx
  - src/editor/ui/ToolPopup.tsx
  - src/editor/controls/ToolSection.tsx
  - src/design-system/SectionLabel.tsx
  - src/design-system/SidebarRow.tsx
  - src/design-system/SearchBar.tsx
  - src/shared/editor-neutral-theme.ts
  - src/shared/editor-neutral-theme.test.ts
  - src/editor/ui/ThemeNeutralPopover.tsx
  - src/code/project/page-appearance-config.ts
  - src/code/project/page-appearance-config.test.ts
  - src/code/stores/page-appearance-store.ts
  - src/editor/PageAppearanceBridge.tsx
  - src/editor/tools/PageAppearanceTool.tsx
  - src/editor/figui3-global-parity.test.ts

Approved Shared:
  - tracker.md

Protected:
  - src/editor/LayersPanel/rows.tsx
  - src/editor/LayersPanel/drag.ts
  - src/editor/command-palette/**
  - src/canvas/drag/**
  - src/canvas/resize/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/code/mutation/**
  - src/preview/**
  - src/backend/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
Deferred:
  - Live screenshot-level visual QA against the supplied Figma UI3 references.
  - Any corrections discovered during that review reopen as a new, narrowly scoped polish assignment; this completed implementation does not retain file ownership while waiting.

<!-- ASSIGNMENT:figui3-global-visual-parity-20260925:END -->
<!-- ASSIGNMENT:field-persistent-project-storage-20260925:START -->
### field-persistent-project-storage-20260925 — Cross-Browser Persistent Project Storage

Status: complete
Baseline: 4a9b306393407be5d05cf6a806401b74102375a4
Activation HEAD: 2aabfa52e7f053405511f5604e8b988c9b089df1
Last Sync: 2026-09-25T08:26:10Z

Owned:
  - src/backend/field-backend.ts
  - src/backend/field-backend.test.ts
  - src/backend/index.ts
  - src/backend/types.ts
  - src/backend/autosave.ts
  - src/backend/save-store.ts
  - src/backend/local-backend.ts
  - src/backend/project-id.ts
  - src/code/stores/project-store.ts
  - cloudflare/worker.js
  - cloudflare/field-persistence.test.ts
  - wrangler.jsonc
  - .env.example

Approved Shared:
  - tracker.md
  - src/backend/revyme-backend.ts

Protected:
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/editor/**
  - src/preview/**
  - src/design-system/**
  - src/styles/**
  - package.json
  - package-lock.json

Reconciliation:
  - 2026-09-25T08:26:10Z — repository truth already contains FieldBackend + Access-protected R2 project persistence; dashboard assignment documented the active planned reservation as stale.
<!-- ASSIGNMENT:field-persistent-project-storage-20260925:END -->

<!-- ASSIGNMENT:field-project-dashboard-20260925:START -->
### field-project-dashboard-20260925 — FigUI3 Project Dashboard / File Browser

Status: complete
Baseline: `d6c2a691f0f95ffd7bb8c0ab38969f414db8235c`
Activation HEAD: 56720ae35ceb78802a40a6c1ee65208742075524
Last Sync: 2026-09-25T08:33:45Z

Owned:
  - src/Dashboard.tsx
  - src/dashboard/**
  - src/main.tsx
  - src/backend/field-projects.ts
  - src/backend/field-projects.test.ts
  - cloudflare/worker.js
  - cloudflare/field-dashboard.test.ts
  - src/editor/header/ProjectChip.tsx

Approved Shared:
  - src/backend/types.ts
  - src/backend/field-backend.ts
  - src/backend/project-id.ts
  - src/backend/leave-builder.ts
  - src/shared/loew-figma-icons.tsx
  - src/styles/dashboard.css
  - tracker.md

Protected:
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/components/**
  - src/editor/tools/**
  - src/editor/PropertiesPanel.tsx
  - src/editor/BottomToolbar.tsx
  - src/editor/LayersPanel/**
  - src/preview/**
  - src/styles/globals.css
  - src/styles/loew-theme.css
  - package.json
  - package-lock.json
  - wrangler.jsonc` unless a verified binding change is required
  - public `loew.fi` portfolio source
<!-- ASSIGNMENT:field-project-dashboard-20260925:END -->
<!-- FIELD_COMPLETED_ASSIGNMENTS_END -->
