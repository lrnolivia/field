# qa-native-scale-tool-qa-closeout.md

```yaml
assignment: native-scale-tool-qa-closeout
source_worker: field Project — existing Scale worker/chat
implementation_sha: ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a
tested_head_sha: ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a
tested_main_sha: 41189092172516e09540749de26b75b3497691eb
current_main_at_registration: 7451b55f29c94e2d56e014590067e7111cd3915a
control_head_before_registration: c2194a6e7e87d200b89248a4681d91448ef03ddd
environment: macOS disposable detached worktree using repository-installed toolchain; GitHub/Cloudflare production build check
build: pass
tests: pass
runtime_qa: not-run
tested_at: 2026-09-26T04:57:29-04:00
```

## Verified evidence

- Validated Scale postimage was committed as `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a` and pushed to `main`.
- 14 focused/regression Vitest files passed: **270/270 tests**.
- Scale-specific tests passed:
  - `src/canvas/scale/__tests__/scale-math.test.ts`
  - `src/canvas/scale/__tests__/scale-policy.test.ts`
  - `src/editor/scale-tool.integration.test.ts`
  - `src/code/stores/tool-store.scale.test.ts`
- Regression coverage passed for creator lock, toolbar parity/polish, PropertiesPanel structure, SelectionOverlay, mutation history, Group refit, RotateManager, ResizeManager, and shortcut help.
- TypeScript completed successfully with no errors.
- Modified-path ESLint completed with **0 errors**. Non-blocking warnings remained.
- `npm run build:all` passed:
  - editor: PASS
  - canvas sandbox: PASS
  - Preview sandbox: PASS
- Source commit/push completed successfully.
- Cloudflare/GitHub deployment check:
  - name: `Workers Builds: field`
  - head SHA: `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`
  - status: completed
  - conclusion: success
  - build ID: `51b577d0-4a3c-4ba9-bf5e-040d13441c9b`
  - version ID: `49688a42-30a6-4ff5-af00-f2ae1d587155`
- Tracker descendant `7451b55f29c94e2d56e014590067e7111cd3915a` records `Implementation: ec3b443...` and leaves the legacy Scale assignment active pending QA/closeout.
- At Contract Worker registration, main remained `7451b55...`, the main handoff kit was `2026-09-26.1`, and Contract Worker coordination v2 PR #2 remained open/draft at head `b00499e2838303a4a1061b8089c7137c6a301746`.

## Historical failures that are not runtime product failures

Earlier package revisions encountered:

- stale toolbar transform anchors against moving main
- the `2026-09-26.1` handoff-kit missing-file meta-self-test defect
- legitimate toolbar ownership conflict before FigUI release
- a TypeScript discriminated-union return typing defect fixed before landing
- one unused import lint error fixed before landing
- an intermediate validation allowlist that omitted coordination-only `tracker.md`

These are process/package history only.

## Not run

- Runtime packet 1: basic 2× geometry/visual metrics + one-step undo/redo.
- Runtime packet 2: typography/effects.
- Runtime packet 3: multi-selection/anchor.
- Runtime packet 4: rotated ~35° object.
- Runtime packet 5: Group baseline pass/block behavior.
- Runtime packet 6: Design ↔ Preview parity and strongest available reload/reparse verification.
- Manual/human handle hit-target, cursor direction, and mode-transition feel.
- Authenticated/cross-session behavior outside the noauth harness; not required unless current acceptance scope expands.

Current runtime acceptance classification: **NOT RUN**.

