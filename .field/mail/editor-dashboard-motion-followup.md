# mail-editor-dashboard-motion-followup.md

to: successor chat
type: migrated-handoff
assignment: editor-dashboard-motion-followup

## What will waste your time

1. **Rebuilding the motion system from old chat history.** The core editor entrance/exit work already landed, and current `main` contains later Dashboard handoff refinements on top of it.
2. **Competing with `field-dashboard-handoff-overlap-20260926`.** It currently owns the key FieldShell / motion coordinator paths. This migrated record intentionally owns nothing.
3. **Treating a browser/harness limitation as a product bug.** Authenticated optical animation QA is the missing evidence; Firecrawl previously stopped at Cloudflare Access.

## Read current truth first

At migration registration, current `main` was:

`7451b55f29c94e2d56e014590067e7111cd3915a`

Current `field/control` before this registration was:

`c2194a6e7e87d200b89248a4681d91448ef03ddd`

Refresh both before acting.

## Settled decisions

- Canvas does not animate.
- Structural side panes arrive without overshooting past their resting viewport edge.
- The bottom toolbar keeps the fun bounce.
- Entrance must run on direct load, refresh, and Dashboard reveal.
- Go to Dashboard must be same-document through `showFieldDashboard()`.
- Editor and Dashboard now overlap the ownership handoff; do not restore the bare-Canvas gap.
- Major Dashboard/editor slabs share one restrained structural motion language.
- Do not hide parity/motion bugs cosmetically; find the first divergence.

## Current important commits

- `bef8a9e4fa5c7a3daee456ad871aab843457750e` fixed the field-logo hard-navigation bypass.
- `45d0976d331f3753c8d50bb541608a6427a2bc48` removed the bare Canvas gap.
- `cba42ea5c2a762dec7882da763d4842354f76140` removed the fully assembled Dashboard ghost frame.

## Current completion state

The four normal-motion visual paths have now been explicitly reported PASS by the user.

The source chat has no justified motion repair left to implement.

The remaining closeout is:

1. wait for `field-dashboard-handoff-overlap-20260926` to release/reconcile its legacy tracker ownership
2. then close `editor-dashboard-motion-followup` with no implementation branch
3. keep reduced-motion as an explicit future verification item when motion is next touched

## Future goals to preserve

Treat the landed motion as field's baseline interaction language:

- Canvas stays spatially fixed while application chrome transfers ownership around it
- structural slabs stay restrained / critically damped
- delight belongs to floating controls such as the bottom toolbar
- internal Dashboard/editor movement remains same-document and visually continuous
- physical housing and content move together
- no white gaps, ghost frames, bare-Canvas dead beats, or page-load blink
- reduced-motion must resolve the same state immediately
- future Design / Content / Code / Preview shell transitions should reuse these principles when they are actually applicable
- do not build a generic motion framework until multiple real surfaces need the same semantic primitives
- after any future shell/motion change, repeat the canonical visual matrix and trace regressions to the first divergence

## Known things not to churn

The currently accepted two-frame editor→Dashboard lead, side spring, toolbar spring, 0.96 entrance opacity, Dashboard WAAPI transform hold, and current physical-target selection are all **accepted postimages**.

They are watchpoints if future DOM/shell changes cause a regression, not cleanup tasks.

## If you are the successor

Your first job is not to code.

Refresh `main`, `field/control`, and `tracker.md`.

If legacy Dashboard ownership is released, close this record.

If it is still active, wait; do not compete for its paths.

Only create a new implementation assignment when there is a concrete later regression or a genuinely new field surface that needs motion integration.

## Full continuity carried forward

The source chat explicitly wanted **all remaining work and future goals preserved**, not just the immediate ghost-frame closeout.

The assignment now contains a `Full source-chat continuity / deferred roadmap` section. Read it before assuming this handoff was only about one animation bug.

The key distinction is:

- **active remaining work:** coordination closeout only — release the legacy reservation and close this follow-up; source is already landed and human visual QA passed
- **deferred future goals:** preserve the live Dashboard/Canvas shell, shared structural motion grammar, compact Dashboard/no-thumbnail/wizard treatment, optional New Project page two, templates later, thumbnail integrity, same-document navigation, interruption/reversal safety, and future style-set evolution into real field design-system semantics

Those deferred items are continuity/backlog, **not automatic authorization to edit source**. Create fresh bounded assignments against current repo truth when one becomes real work.


## Successor status refresh after coordination v2 merge

Current main is fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e; current field/control is 8baae7d04b1999913f18227e0ff6c8f39c72d500; the canonical handoff kit on main is now 2026-09-26.2.

The legacy Dashboard handoff reservation is still formally active on both trackers. Coordination v2 explicitly says active legacy Owned: reservations remain authoritative until those assignments finish.

A compare from the visual-QA registration baseline to current main contains only tracker.md and .field/handoff-kit/** changes, with no src/** product changes. No new motion regression is indicated by repository state.

Do not create implementation work. Continue to wait for formal legacy release/reconciliation; then close this follow-up with no implementation branch if current behavior remains unchanged.
