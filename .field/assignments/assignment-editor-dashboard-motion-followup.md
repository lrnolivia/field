# assignment-editor-dashboard-motion-followup.md

---
field_assignment: 1
id: editor-dashboard-motion-followup
status: qa-passed-awaiting-legacy-release
branch: null
pr: null
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: transition-2026-09-26.1-to-2026-09-26.2
type: migrated-followup
execution_class: contract-worker
source_chat: field editor/dashboard motion planning and installer chat
source_legacy_assignment: field-dashboard-handoff-overlap-20260926
owned: []
approved_shared: []
protected:
  - src/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: false
  authenticated: true
---

# field — editor / Dashboard motion follow-up

## Migration classification

The implementation authored in the source chat is already landed on `main`.

Remaining work is **verification / possible follow-up repair**, but the relevant source surfaces are currently owned by the still-active legacy assignment:

`field-dashboard-handoff-overlap-20260926`

This control record therefore claims **no source ownership** and creates **no implementation branch or Draft PR**.

Do not create a competing branch or claim the legacy-owned paths while that assignment remains active.

## Goal

Preserve the settled editor/Dashboard motion decisions and complete post-integration visual verification after the current legacy Dashboard handoff assignment releases ownership.

If visual QA finds a defect after ownership is released, create a separate bounded repair assignment with fresh ownership against then-current `main`.

## Current verified repository state

Current `main` at registration:

`7451b55f29c94e2d56e014590067e7111cd3915a`

The following source behavior is present on current `main`:

- editor entrance targets the physical left/right chrome surfaces and bottom toolbar, not Canvas
- structural side panes use an effectively critically damped spring with no positional overshoot past rest
- the bottom toolbar retains the playful under-damped entrance bounce
- fresh direct `/builder/<project>` loads and browser refreshes wait for Canvas render completion and loading-shell clearance before editor entrance
- editor chrome has an explicit exit request/await seam
- the field-logo **Go to Dashboard** action routes through `showFieldDashboard()`, not the inherited hard navigation
- Dashboard and editor now overlap their ownership handoff instead of exposing a bare intermediate Canvas
- Dashboard structural motion inherits the editor's structural spring / decisive exit language
- Dashboard return starts after a two-animation-frame editor lead rather than after editor exit fully completes
- current Dashboard motion code preserves final WAAPI transform ownership to avoid a fully assembled ghost frame

## Landed implementation lineage

Important landed commits from the source work:

- `6451e677e2e815b0ecea06babca5c75a35bdccb0` — Give editor chrome a physical spring entrance
- `1b29315984bb48497fbe2dbb1c1f653d4577ac3a` — Run editor spring entrance on every reveal
- `4dbd1a74a88eb15c12658b5217d38c81d289a9bd` — Animate editor chrome out before Dashboard
- `bef8a9e4fa5c7a3daee456ad871aab843457750e` — Route editor Dashboard exit through FieldShell

Later Dashboard integration/refinement already on `main`:

- `45d0976d331f3753c8d50bb541608a6427a2bc48` — Remove bare Canvas gap from Dashboard handoff
- `cba42ea5c2a762dec7882da763d4842354f76140` — Eliminate Dashboard fully-assembled ghost frame

Current `main` is a descendant of those commits.

## Settled motion decisions

### Canvas

Canvas is the spatial truth and does not animate during editor/Dashboard transitions.

Do not solve transition defects by moving, fading, scaling, or cosmetically hiding Canvas.

### Editor entrance

Structural left/right panels should read as physical slabs:

- move the physical pane shell and its contents together
- no structural overshoot past the viewport edge
- no white gutter / exposed edge flash
- weighted, graceful, critically damped arrival

Bottom toolbar is the playful element:

- may overshoot and rebound
- starts slightly after structural panes
- current editor constants reserve the obvious bounce for this floating element

### Fresh load / refresh

The entrance must be visible on:

- fresh direct builder load
- browser refresh while already in the editor
- Dashboard → editor reveal

It must not complete invisibly underneath `ProjectLoader`'s loading shell.

### Editor → Dashboard

The transition must remain same-document.

Do not reintroduce:

`leaveBuilderTo('/dashboard', ...)`

for the ordinary field-logo **Go to Dashboard** action.

The current path is:

`showFieldDashboard()`
→ `FieldShell.showDashboard()`
→ editor chrome exit begins
→ brief two-frame directional lead
→ Dashboard slabs reclaim the workspace while editor chrome is still moving
→ both settle

This overlap replaced the earlier full-wait handoff because the exposed bare Canvas read like a shifted/broken duplicate.

### Structural versus playful motion

Major slabs are restrained.

Visible bounce belongs to small/floating UI, especially the bottom toolbar.

Dashboard and editor should feel like one spatial system transferring ownership, not two unrelated animations.

## Current source ownership blocker

The active legacy tracker assignment currently owns:

- `src/FieldShell.tsx`
- `src/field-shell-motion.ts`
- `src/field-shell-motion.test.ts`
- `src/editor/EditorEntranceCoordinator.tsx`

It also protects neighboring editor/Dashboard motion surfaces.

This migrated follow-up must not touch those paths while that legacy assignment remains active.

## Acceptance criteria after ownership clears

Perform human/authenticated visual QA for all four paths:

1. fresh `/builder/<project>` load
2. browser refresh in editor
3. Dashboard → editor
4. editor → Dashboard

The result should satisfy all of the following:

- Canvas remains visually anchored
- left/right chrome moves as complete physical surfaces, never content detached from its panel
- no white-space or viewport-edge flash
- no fully assembled Dashboard ghost frame
- no dead bare-Canvas pause that reads like a broken duplicate
- side structural motion is restrained and graceful
- bottom toolbar is the only clearly playful bounce
- ordinary Go to Dashboard navigation remains same-document
- no page-load blink
- reduced-motion still resolves immediately and cleanly

## Human visual QA — PASS

On 2026-09-26, the user explicitly verified all four required visual paths and reported that **all four pass**:

1. fresh `/builder/<project>` load
2. browser refresh while already in the editor
3. Dashboard → editor
4. editor → Dashboard

This is authenticated human visual QA evidence for the motion acceptance criteria. No white-edge flash, blank slab, bare-Canvas pause, fully assembled Dashboard ghost frame, page-load blink, or panel/content separation was reported.

The implementation does not need another motion repair based on this QA result.

The only remaining closeout dependency is coordination: `field-dashboard-handoff-overlap-20260926` is still marked active in the legacy tracker and still owns the relevant motion integration paths. Do not create a competing source assignment merely to close this record.

## Exact next actions

1. Re-read current `main`, `field/control`, and legacy `tracker.md`.
2. Confirm whether `field-dashboard-handoff-overlap-20260926` is still active.
3. While it remains active, do not modify its source surfaces.
4. Once that legacy assignment releases ownership, mark this follow-up complete/closed with no implementation branch.
5. Only create a new repair assignment if a later regression is observed.

## Non-goals

- no new animation redesign while the current system passes
- no Canvas animation
- no generic UI motion refactor
- no Dashboard visual redesign
- no realtime/autosave/persistence changes
- no reopening the direct-load/refresh requirement
- no reintroduction of hard navigation for ordinary Dashboard return

## Validation / QA requirements

This follow-up is primarily optical and authenticated.

DOM/unit tests can protect routing and motion contracts, but final acceptance requires human visual QA because animation grace, white-edge flashes, dead beats, and ghost frames are perceptual.

Firecrawl previously could not inspect the authenticated editor through Cloudflare Access. Do not classify that harness limitation as a field defect.

## Completion contract

Complete only when:

- legacy ownership is released or explicitly reconciled
- four-path visual QA is recorded
- same-document Dashboard return is still present
- no source repair remains, or any required repair has been moved into its own separately owned assignment
