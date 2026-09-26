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
runtime_qa: fail-product
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



## Runtime QA — 2026-09-26

### Repository/deployment lineage

- Scale implementation: `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`
- production QA session started from deployed main descendant `7e585a2fe66e062bae8a46041a6e08901027f9a8`
- Cloudflare `Workers Builds: field` for `7e585a2...`: completed / success, build `19506efb-9c57-4f49-97ef-3ccf1f5dec23`
- current main after QA: `5ca48d5e99fbc90e07a1bc8707486defa05430ae`
- comparison from tested head to current main changes only handoff-kit coordination files and `tracker.md`; no Scale implementation path changed

### Packet 1 — basic visual metrics + history

Classification: **FAIL — PRODUCT**

Fixture preimage:
- width: 100
- height: 50
- X: 963
- Y: 570
- stroke: 2
- corner radius: 10
- center: (1013, 595)

Action:
- dedicated Scale tool active
- center anchor selected
- factor 2 committed through Scale multiplier Enter/blur path

Committed postimage:
- width: 200
- height: 100
- X: 913
- Y: 545
- stroke: **2**
- corner radius: **10**
- center: (1013, 595)

Expected:
- width: 200
- height: 100
- stroke: **4**
- corner radius: **20**
- center unchanged

History:
- one undo restored 100 × 50 at X 963 / Y 570
- one redo restored 200 × 100 at X 913 / Y 545

Failure:
- geometry and center-anchor placement pass
- undo/redo geometry pass
- visual metric scaling fails: stroke and radius are not scaled

### Harness notes

- Firecrawl `/builder/noauth` live-interaction attempts were blocked by the account's two-concurrent-job limit after the initial session; this is **BLOCKED/UNVERIFIED — HARNESS**, not a field product failure.
- The product failure above was reproduced in the disposable `/builder/noauth` runtime with Composio Browser and visible inspector values.
- An earlier browser-agent summary claimed Packet 1 passed, but its own step log contradicted that summary; it was rejected. A narrowed explicit Enter/blur + field-read pass produced the failure evidence recorded above.

### Stop condition

Per assignment contract, QA stops here. Packets 2–6 and final human feel are not run until the separate repair assignment lands and deployment lineage is re-verified.

Successor: `native-scale-visual-metrics-repair`.
