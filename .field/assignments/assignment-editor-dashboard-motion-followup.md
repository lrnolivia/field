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

## Full continuation plan and future goals

This section is the complete continuation map for this source chat's editor ↔ Dashboard motion lane. It is intentionally broader than the immediate QA follow-up, but it is **not** permission to start speculative implementation. Future work should be activated only by a concrete product need, regression, or a new shell/mode transition.

### Immediate work still left

1. **Legacy ownership release.**
   - `field-dashboard-handoff-overlap-20260926` must stop being active in `tracker.md` or explicitly reconcile/release the relevant paths.
   - Until then, this record owns no source and must not create a competing implementation branch.

2. **Close this migrated follow-up after ownership releases.**
   - Keep the recorded four-path human visual QA PASS.
   - Close with no implementation branch or PR if current behavior remains unchanged.

3. **Reduced-motion verification remains separately unproven by the user's four-path normal-motion pass.**
   - The four required normal-motion paths passed.
   - Do not pretend that automatically proves a `prefers-reduced-motion` visual pass.
   - The next time motion code is touched, explicitly verify reduced-motion resolves immediately, without a stranded offscreen panel, dead interaction state, or delayed Dashboard/Editor reveal.
   - This is a verification/watch item, not justification for reopening source by itself.

### Preserve this as field's motion baseline

The current result should be treated as a **baseline interaction language**, not a one-off effect.

The governing rules are:

- **Canvas is spatial truth.** It stays visually anchored while surrounding application chrome changes ownership.
- **Structural chrome is restrained.** Large side panels and Dashboard slabs should feel weighted, decisive, and critically damped rather than cartoonishly springy.
- **Floating UI may carry delight.** The bottom toolbar is the canonical playful spring/rebound example.
- **Motion should explain continuity.** It should communicate that the user is moving between persistent field surfaces, not navigating to unrelated web pages.
- **Movement, not fading, carries the relationship.** Opacity may support an entrance but should not become the primary transition language.
- **Physical surfaces move as physical surfaces.** Never slide panel content independently while its housing stays behind.
- **No intermediate broken state.** Avoid white gutters, blank slabs, bare-Canvas pauses, fully assembled ghost frames, and other transient states that expose implementation seams.
- **Reduced motion is first-class.** The same state change must resolve immediately and cleanly when animation is disabled.
- **Trace the first divergence.** If a transition looks wrong, find where shell state, navigation, physical surface ownership, or animation state first diverges instead of masking the symptom.

### Future shell / mode transitions

When field later adds or refines transitions involving Design, Content, Code, Preview, Dashboard, project switching, or other persistent application surfaces:

- reuse the same spatial logic where it genuinely applies
- keep the website/Canvas as the stable artifact whenever the transition is chrome around the artifact
- prefer same-document/persistent-shell navigation for internal field surfaces when architecture permits
- avoid full page reloads as a substitute for state transitions
- do not add animation merely for decoration
- do not force every surface into identical timing if its physical role differs

The goal is a coherent field motion grammar, not universal animation.

### When to centralize motion further

Do **not** refactor the current working system into a large generic animation framework just because it now works.

A shared `motion.FUNCTION`-style system or broader token layer becomes worthwhile only when a second/third independent field surface needs the same concepts and duplication becomes architectural rather than cosmetic.

If that point arrives, preserve semantic concepts such as:

- structural spring
- floating spring
- structural exit
- handoff lead
- physical surface target
- reduced-motion resolution
- pointer/inert ownership during motion
- final compositor ownership / settle behavior

Do not reduce this to a pile of arbitrary duration/easing constants detached from interaction meaning.

### Regression guards to preserve

Any future shell/navigation/motion change should continue guarding these specific seams:

- field-logo **Go to Dashboard** uses `showFieldDashboard()` / FieldShell, never the old ordinary hard-navigation path
- browser back / popstate returns through the same shell semantics rather than bypassing motion/state coordination
- fresh builder load and hard refresh do not run the entrance invisibly under `ProjectLoader`
- Dashboard → editor prepares editor chrome before it becomes exposed
- editor → Dashboard gives editor motion a readable lead, then overlaps Dashboard reclaim instead of showing a bare Canvas gap
- final Dashboard transforms are not released in a way that flashes the fully assembled rest state for one frame
- pointer interaction remains blocked while material chrome is in a non-interactive transition state
- Canvas itself is never added to the editor/Dashboard chrome animation target set

### Visual QA contract for future changes

After any future change that touches shell navigation, physical panel targets, editor entrance/exit, Dashboard slab motion, or reveal timing, rerun the canonical visual matrix:

1. fresh editor load
2. refresh in editor
3. Dashboard → editor
4. editor → Dashboard
5. reduced-motion variant when motion behavior changed

Judge more than "animation ran." Look for:

- edge/gutter flashes
- content moving separately from panel housing
- one-frame rest-state ghosts
- bare Canvas dead beats
- page-load blink
- delayed URL/state mismatch
- pointer availability at the wrong time
- toolbar bounce becoming too weak or structural slabs becoming too playful

Human optical QA remains appropriate here because these are perceptual defects even when DOM/unit contracts pass.

### Accepted implementation details: watch, do not churn

The following are known implementation details and should **not** be proactively changed while the accepted visual result remains clean:

- editor structural side spring values currently in `editor-entrance.ts`
- under-damped bottom-toolbar spring and its slight delayed start
- the current two-animation-frame editor → Dashboard handoff lead
- entrance opacity beginning at `0.96`
- Dashboard transform hold after WAAPI completion
- current physical-target selection in the editor entrance coordinator

If a future regression appears after DOM/chrome restructuring, inspect these as possible divergence points. Do not "clean them up" merely because a different abstraction looks prettier.

### Known historical traps

Do not repeat these solved failure modes:

- starting editor entrance on mount while Dashboard/loading shell still hides it
- animating only child content while the actual pane surface stays fixed
- using under-damped bounce on major structural slabs and exposing white viewport gaps
- waiting for editor exit to finish completely before Dashboard enters, producing a bare-Canvas beat
- handing transform ownership back to CSS at the wrong frame and flashing a fully assembled Dashboard
- routing one Dashboard command through hard navigation while another uses the persistent shell
- assuming a nice motion unit test proves optical grace in production

### Future repair discipline

If a real regression appears later:

1. establish current `main` and current ownership
2. reproduce the first visual/state divergence
3. create a new narrowly scoped assignment only after ownership is available
4. preserve the accepted motion invariants above
5. prefer the smallest repair over a motion-system rewrite
6. validate focused contracts + TypeScript/build as required by the current repo-hosted handoff kit
7. perform the visual matrix again
8. record exact evidence in `field/control`

If a terminal installer is appropriate, use the **current repo-hosted handoff kit** and the standardized field installer UX. Do not resurrect bespoke runner conventions from old chat history.

### What is explicitly *not* pending from this chat

There is no currently justified source task to:

- redesign the transition again
- alter the Canvas
- add more bounce
- refactor the motion code generically
- change realtime/persistence/autosave
- redesign Dashboard
- change editor panel architecture
- create a branch simply because this chat is being handed off

Normal-motion visual acceptance is already PASS. The default future action is preservation, not churn.


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


## Successor rehydration — coordination v2 merged

Rehydrated again after Contract Worker coordination v2 merged to current main.

Current Git truth at this refresh:

- main: fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e
- field/control: 8baae7d04b1999913f18227e0ff6c8f39c72d500
- canonical handoff kit on main: 2026-09-26.2

A direct compare from the recorded visual-QA registration baseline 7451b55f29c94e2d56e014590067e7111cd3915a to current main shows only tracker.md and .field/handoff-kit/** changes. No src/** product or motion path changed, so there is no source-change evidence requiring motion repair or renewed normal-motion QA.

The legacy tracker reservation field-dashboard-handoff-overlap-20260926 is still explicitly Status: active on both main and field/control, with the same owned motion integration paths. The current 2026-09-26.2 Contract Worker contract explicitly preserves active legacy tracker.md Owned: reservations until those assignments finish.

Therefore:

- this follow-up remains qa-passed-awaiting-legacy-release
- it still owns no source paths
- no implementation branch or PR should be created
- the prior four-path authenticated human visual QA PASS remains the accepted motion evidence
- reduced-motion remains an explicit future verification/watch item, not a reason to reopen source
- closeout becomes eligible only after the legacy reservation is formally completed/released or explicitly reconciled
