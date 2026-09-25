# field Work Tracker

> Canonical repo coordination ledger.
>
> Git/repository state remains implementation truth.
>
> Tracker entries do NOT authorize launching Workers, Codex sessions, Work mode, sub-agents, background agents, autonomous tasks, or new chats.

Last Updated: 2026-09-25T04:51:50.158Z

## Active Assignments

<!-- FIELD_ACTIVE_ASSIGNMENTS_START -->
<!-- Active assignment blocks are maintained between these markers. -->

<!-- ASSIGNMENT:canvas-camera-fast-path-20260924:START -->
### canvas-camera-fast-path-20260924 — Remove stop-motion canvas camera updates

Status: active
Baseline: 42502f7db62980401bd4a2ccfdd981ba62f7f565
Activation HEAD: 42502f7db62980401bd4a2ccfdd981ba62f7f565
Last Sync: 2026-09-25T04:21:13Z

Owned:
  - src/canvas/Canvas.tsx
  - src/canvas-sandbox/protocol.ts
  - src/canvas-sandbox/bridge-host.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/bridge-host-camera.test.ts
  - src/canvas/hooks/useCanvasTransform.ts
  - src/canvas/hooks/useCanvasTransform.chrome-wheel.test.ts

Approved Shared:
  - none

Protected:
  - src/canvas/transform/**
  - src/canvas/mouse/**
  - src/canvas/selection/**
  - src/canvas/drag/**
  - src/code/**
  - src/editor/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json

Notes:
  - Safari r5 adds a same-document transparent input surface above the canvas iframe so trackpad wheel input no longer depends on WebKit iframe event-region routing.
<!-- ASSIGNMENT:canvas-camera-fast-path-20260924:END -->



<!-- ASSIGNMENT:native-group-ungroup-20260925:START -->
### native-group-ungroup-20260925 — Native Group / Ungroup document primitive

Status: active
Baseline: a10af177e311dba88197164658d7e16f7233a377
Activation HEAD: a10af177e311dba88197164658d7e16f7233a377
Last Sync: 2026-09-25T04:51:50.158Z

Scope: Implement first-class deterministic Group/Ungroup distinct from Frame, Auto Layout, and SVG grouping. Group is structural hierarchy with layout-transparent semantics; grouping/ungrouping must preserve rendered appearance, source identity, responsive/variant behavior, and native flex/grid contracts.

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
  - source marker: data-field-group="true"
  - layout-transparent wrapper target: display: contents
  - parser exposes semantic isGroup; never infer from display: contents alone
  - runtime layout guarantees must flatten Group when reasoning about ancestor flex/grid children
  - generic Group/Ungroup remains separate from existing SVG Group/Ungroup
  - Phase B canvas derived-bounds/drag ownership must be verified and expanded explicitly after source touch points are audited against then-current main
<!-- ASSIGNMENT:native-group-ungroup-20260925:END -->
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
<!-- FIELD_COMPLETED_ASSIGNMENTS_END -->
