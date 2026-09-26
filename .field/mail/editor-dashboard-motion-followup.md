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

## First useful action

After the legacy Dashboard handoff assignment finishes, visually test:

fresh editor load → refresh → Dashboard to editor → editor to Dashboard.

If those are clean, close this follow-up without touching source.

If one is not clean, create a NEW narrowly owned repair assignment after reconciling ownership.

## Full continuity carried forward

The source chat explicitly wanted **all remaining work and future goals preserved**, not just the immediate ghost-frame closeout.

The assignment now contains a `Full source-chat continuity / deferred roadmap` section. Read it before assuming this handoff was only about one animation bug.

The key distinction is:

- **active remaining work:** coordination closeout only — release the legacy reservation and close this follow-up; source is already landed and human visual QA passed
- **deferred future goals:** preserve the live Dashboard/Canvas shell, shared structural motion grammar, compact Dashboard/no-thumbnail/wizard treatment, optional New Project page two, templates later, thumbnail integrity, same-document navigation, interruption/reversal safety, and future style-set evolution into real field design-system semantics

Those deferred items are continuity/backlog, **not automatic authorization to edit source**. Create fresh bounded assignments against current repo truth when one becomes real work.
