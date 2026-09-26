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


## Full source-chat continuity / deferred roadmap

This section preserves the **entire continuity carried by the source Dashboard/Canvas chat**, including deferred goals that are not part of the current closeout.

It does **not** expand this assignment's active source ownership. Treat the items below as preserved product direction / backlog seeds. Any future implementation must be rehydrated against then-current `main`, ownership, and product architecture and should receive its own bounded assignment when appropriate.

### What the source chat actually had left to do

The source chat's implementation work is effectively finished. The complete remaining closeout is:

1. release/reconcile legacy tracker assignment `field-dashboard-handoff-overlap-20260926`
2. mark this migrated follow-up complete after that ownership release, because authenticated human visual QA already passed all four required paths
3. make no source changes merely for closeout
4. if a later regression appears, diagnose the first divergence and create a **new narrow repair assignment** against then-current repo truth

There is no hidden unfinished motion redesign, Canvas rewrite, Dashboard rewrite, or implementation branch waiting to be migrated.

### Deferred Dashboard / Canvas goals that should survive

#### 1. Keep the live-shell architecture as the baseline

Dashboard is a live layer over the same mounted editor/Canvas application. Normal movement between Dashboard and editor should remain same-document and preserve the website as the stationary artifact.

Future shell work should continue to protect:

- same-document Dashboard ↔ editor navigation
- live Canvas/editor state under Dashboard
- safe project switching without cross-project writes
- browser Back/Forward behavior
- no inherited "Leaving Page" interruption for ordinary in-app movement
- source/Preview/runtime truth remaining aligned

#### 2. Preserve the approved motion language as a reusable system

The desired long-term motion grammar is:

- large structural panes/slabs: restrained, weighted, no goofy rebound
- small floating affordances: allowed to be playful
- Canvas/site: stationary
- Dashboard/editor: read as one spatial system transferring ownership
- no fade as the primary relationship
- interruption/reversal should never expose CSS/WAAPI ownership gaps
- reduced-motion should resolve immediately and cleanly

Future motion changes should prefer shared deterministic profiles/seams instead of unrelated one-off timing values.

#### 3. Keep the Dashboard visually compact and professional

The source chat approved:

- compact neutral Dashboard chrome
- the small stacked-field no-thumbnail artwork with the little `f`
- stable project cards during realtime refresh instead of skeleton replacement
- a simplified/cuter New Project presentation rather than settings-card UI

Do not regress toward large decorative placeholder art, generic SaaS cards, or configuration-heavy UI.

#### 4. Continue the New Project flow, but keep page one sufficient

The intended New Project product direction is still:

- maximum two pages
- page one is enough to create a project
- page one: project name, starting Canvas/device size, page color, optional style set
- brief `Done` moment before the Dashboard reveals the ready Canvas
- actual reveal waits for Canvas readiness, not an arbitrary timer
- page two stays optional

Deferred page-two ideas from the source work:

- responsive/smaller companion canvases
- **templates later**

Templates were deliberately deferred, not abandoned.

When templates are eventually implemented, they should create real field/source/design-graph state rather than a presentation-only mock layer.

#### 5. Preserve project/runtime integrity around the Dashboard

Future Dashboard work should continue to preserve the already-established behavior:

- realtime Dashboard awareness while Dashboard is hidden
- authoritative refresh rather than polling as the primary model
- project metadata/current document/thumbnail durability
- safe save/flush before switching the live runtime project
- New Project creates durable project state before reveal
- project cards remain visually stable while metadata refreshes

Thumbnail-generation changes belong to the thumbnail subsystem/owner and should not be casually folded into shell-motion work.

#### 6. Keep thumbnail UX quiet and trustworthy

The no-thumbnail state is intentionally small and secondary. A missing thumbnail should not dominate a card.

Long-term thumbnail goals are continuity/integrity rather than decorative complexity:

- durable thumbnail persistence
- fast refresh after meaningful project changes
- no stale/incorrect project image crossover
- no skeleton/card replacement flash during realtime refresh
- placeholder only when there truly is no valid thumbnail

#### 7. Keep project switching and reveal paths as regression surfaces

Any future shell/navigation work should smoke at least:

- Dashboard → existing project
- New Project → Done → Canvas
- Canvas → Dashboard
- fresh direct builder load
- browser refresh in editor
- Back/Forward
- quick reversal/interruption
- switching to a different project with pending edits

The critical invariant is that the website itself remains the stable artifact while field chrome changes ownership around it.

#### 8. Treat current starter style sets as seeds, not a finished design-system feature

The current wizard's `None / Neutral / Editorial / Studio` choices are lightweight creation presets.

If this concept grows later, it should graduate into real field design-system/token/variable semantics instead of becoming Dashboard-only decoration. That evolution belongs in a separate design-system/product assignment, not this closeout.

### Explicitly deferred, not forgotten

These items are **not active work here**, but should not disappear from continuity:

- New Project templates
- richer optional page-two project setup
- future evolution of starter style sets into real design-system semantics
- continued hardening of thumbnail freshness/integrity
- regression protection for same-document navigation, reversal/interruption, reduced motion, and cross-project switching
- keeping Dashboard/editor motion tied to one coherent field motion language

Broader field goals beyond this Dashboard/Canvas lane remain authoritative in `FIELD_PRODUCT_ARCHITECTURE.md`; do not duplicate or reinterpret that product roadmap here.

## Completion contract

Complete only when:

- legacy ownership is released or explicitly reconciled
- four-path visual QA is recorded
- same-document Dashboard return is still present
- no source repair remains, or any required repair has been moved into its own separately owned assignment
