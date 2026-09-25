# field Work Tracker

> Canonical repo coordination ledger.
>
> Git/repository state remains implementation truth.
>
> Tracker entries do NOT authorize launching Workers, Codex sessions, Work mode, sub-agents, background agents, autonomous tasks, or new chats.

Last Updated: 2026-09-25T03:36:05Z

## Active Assignments

<!-- FIELD_ACTIVE_ASSIGNMENTS_START -->
<!-- Active assignment blocks are maintained between these markers. -->

<!-- ASSIGNMENT:trackpad-pan-feel-20260924:START -->
### trackpad-pan-feel-20260924 — Tune trackpad canvas pan responsiveness

Status: active
Baseline: 9a74cb25344466ef4ba9adc9046a3365b245a661
Activation HEAD: 2333f0c65c351d38a32f1cc59cc78f6ddf5795d2
Last Sync: 2026-09-25T03:36:05Z

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
<!-- FIELD_ACTIVE_ASSIGNMENTS_END -->

## Blocked / Integration Notes

<!-- FIELD_BLOCKED_NOTES_START -->
- 2026-09-25T02:17:03Z — Existing-chat adoption: this tracker was initialized after `81a7dbd633db` had already landed because the generic handoff kit was introduced midstream. No pre-implementation tracker reservation existed. Git history is authoritative.
- 2026-09-25T02:17:03Z — Pages/Layers source work is landed and deployed. Screenshot-level post-deploy visual parity remains unverified and should be registered as a new assignment before further implementation.
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

## Commit Ledger

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

<!-- FIELD_COMPLETED_ASSIGNMENTS_END -->
