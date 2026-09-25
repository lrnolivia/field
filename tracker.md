# field Work Tracker

> Canonical repo coordination ledger.
>
> Git/repository state remains implementation truth.
>
> Tracker entries do NOT authorize launching Workers, Codex sessions, Work mode, sub-agents, background agents, autonomous tasks, or new chats.

Last Updated: 2026-09-25T02:45:46Z

## Active Assignments

<!-- FIELD_ACTIVE_ASSIGNMENTS_START -->
<!-- Active assignment blocks are maintained between these markers. -->


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
<!-- ASSIGNMENT:{assignment_id}:END -->

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
<!-- FIELD_COMPLETED_ASSIGNMENTS_END -->
