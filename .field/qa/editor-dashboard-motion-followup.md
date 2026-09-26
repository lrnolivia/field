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
runtime_qa: not-run-after-routing-fix
tested_at: 2026-09-26
evidence: installer-log-and-current-repository-state
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

## Not run / not proven

Do **not** upgrade these to PASS:

- post-`bef8a9e` authenticated visual verification of editor → Dashboard was not explicitly recorded in this source chat
- the later `45d0976` overlap refinement was not visually verified by this source chat
- the later `cba42ea` ghost-frame repair was not visually verified by this source chat
- no Firecrawl authenticated production packet succeeded; Cloudflare Access blocked that route
- no fresh full build was rerun by this source chat at current `main` `7451b55...`

## Required remaining QA

After the active legacy Dashboard handoff assignment releases ownership, perform authenticated human visual QA for:

1. fresh editor load
2. editor refresh
3. Dashboard → editor
4. editor → Dashboard

Record optical findings explicitly, including any white edge, blank slab, bare Canvas beat, ghost frame, or page-load blink.
