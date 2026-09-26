# qa-editor-dashboard-motion-followup.md

```yaml
assignment: editor-dashboard-motion-followup
branch: null
pr: null
tested_head_sha: bef8a9e4fa5c7a3daee456ad871aab843457750e
tested_main_sha: bef8a9e4fa5c7a3daee456ad871aab843457750e
current_main_at_registration: 7451b55f29c94e2d56e014590067e7111cd3915a
environment: user local macOS isolated installer worktree plus current GitHub source inspection
build: passed-for-bef8a9e-tree
tests: focused-routing-tests-passed-for-bef8a9e-tree
runtime_qa: pass-human-authenticated-all-four-paths
tested_at: 2026-09-26
evidence: installer-log-current-repository-state-and-user-human-visual-pass
```

## Tests that actually ran for the routing repair

The user ran the r7 transactional installer that produced commit:

`bef8a9e4fa5c7a3daee456ad871aab843457750e`

The installer reported:

- focused file: `src/editor/header/left-header-dashboard-navigation.test.ts`
- 2 tests passed
- TypeScript `tsc --noEmit --pretty false` passed
- `npm run build:all` passed
  - main Vite build passed
  - sandbox build passed
  - preview build passed
- `git diff --check` passed
- exact two-file scope was enforced
- push to `main` succeeded

The focused tests specifically proved:

- field-logo **Go to Dashboard** routes through the live FieldShell path instead of hard page navigation
- account/settings navigation still keeps its separate save-before-hard-nav path

## Current repository evidence

At registration, current `main` was:

`7451b55f29c94e2d56e014590067e7111cd3915a`

Git ancestry checks showed current `main` is a descendant of:

- `bef8a9e4fa5c7a3daee456ad871aab843457750e`
- `45d0976d331f3753c8d50bb541608a6427a2bc48`
- `cba42ea5c2a762dec7882da763d4842354f76140`

Current source inspection also confirmed:

- editor entrance/exit request machinery remains present
- direct-load render boundary remains present
- `LeftHeader.tsx` still uses `showFieldDashboard`
- `FieldShell.tsx` now overlaps editor exit with Dashboard return after `DASHBOARD_EDITOR_HANDOFF_FRAMES`
- Dashboard structural motion inherits the editor structural spring / exit timing in `src/field-shell-motion.ts`

## Human/runtime observations already known

Before the routing repair, the user observed that returning to Dashboard could blink like a new page load.

Repository inspection found the reason: one field-logo Dashboard action still used hard navigation.

That defect was repaired by `bef8a9e`.

The user had positively reacted to the editor entrance work before discovering that separate hard-navigation bypass.

## Human authenticated visual QA — PASS

On 2026-09-26, after the Dashboard integration landed, the user explicitly reported **all four pass** for the required visual acceptance paths:

1. fresh editor load
2. browser refresh while already in the editor
3. Dashboard → editor
4. editor → Dashboard

Repository `main` observed immediately before recording this evidence:

`7451b55f29c94e2d56e014590067e7111cd3915a`

This is human visual evidence, not automated/browser-harness evidence.

No defect was reported for:

- white-space / viewport-edge flash
- blank panel slab
- bare-Canvas handoff pause
- fully assembled Dashboard ghost frame
- hard-navigation/page-load blink
- physical panel/content separation
- the overall structural-versus-playful motion hierarchy

The visual acceptance requirement for this migrated follow-up is therefore satisfied.

Coordination closeout remains pending only because the legacy tracker still marks `field-dashboard-handoff-overlap-20260926` active and owning the relevant source paths.

## Not run / not proven

Do **not** upgrade these to PASS:

- no Firecrawl authenticated production packet succeeded; Cloudflare Access blocked that route
- no fresh full build was rerun by this source chat at current `main` `7451b55...`
- the user-provided human visual PASS does not by itself prove reduced-motion behavior unless separately exercised

## Required remaining QA

After the active legacy Dashboard handoff assignment releases ownership, perform authenticated human visual QA for:

1. fresh editor load
2. editor refresh
3. Dashboard → editor
4. editor → Dashboard

Record optical findings explicitly, including any white edge, blank slab, bare Canvas beat, ghost frame, or page-load blink.
