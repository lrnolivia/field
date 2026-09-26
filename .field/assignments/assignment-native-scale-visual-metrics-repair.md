# assignment-native-scale-visual-metrics-repair.md

---
field_assignment: 1
id: native-scale-visual-metrics-repair
status: active
branch: field/native-scale-visual-metrics-repair
pr: null
base: d9f178361333a2a3bb17be90c0277e4b98708ae4
kit: 2026-09-26.3
type: repair
execution_class: contract-worker
source_assignment: native-scale-tool-qa-closeout
source_legacy_assignment: native-scale-tool-20260926
owned:
  - src/canvas/scale/**
  - src/editor/scale-tool.integration.test.ts
approved_shared:
  - tracker.md
protected:
  - src/editor/PropertiesPanel.tsx
  - src/editor/BottomToolbar.tsx
  - src/canvas/selection/**
  - src/canvas/resize/**
  - src/canvas/drag/**
  - src/code/**
  - src/backend/**
  - src/dashboard/**
  - src/design-system/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: true
  authenticated: false
---

## Mandatory rehydration

Use Composio exclusively for all GitHub reads and writes.

Read the current repo-hosted handoff kit from `main`, then this assignment, its mailbox and QA record from `field/control`, current `main`, and the active legacy `native-scale-tool-20260926` tracker reservation.

Current repo process rules supersede stale source-chat process instructions.

## Goal

Repair dedicated Scale so proportional Scale authors visual metrics together with box geometry.

For the canonical rectangle fixture, Scale 2× from center must change:

- 100 × 50 → 200 × 100
- stroke 2 → 4
- corner radius 10 → 20

while preserving center position and one-step undo/redo semantics.

## Why this exists

The QA-only `native-scale-tool-qa-closeout` successor reproduced a deployed product defect in Packet 1. Geometry, center anchoring, and history behaved correctly, but stroke and radius did not scale.

This is separate implementation work and must not be patched inside the QA-closeout assignment.

## Current verified state

- original Scale implementation: `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`
- tested production descendant: `7e585a2fe66e062bae8a46041a6e08901027f9a8`
- current main at registration: `5ca48d5e99fbc90e07a1bc8707486defa05430ae`
- no Scale implementation path changed between the tested head and current main
- `scale-policy.ts` already declares `borderWidth`, `borderRadius`, and `strokeWidth` as dimensional Scale properties
- runtime Packet 1 still left stroke/radius unchanged
- active legacy `native-scale-tool-20260926` reservation already owns the Scale lineage; do not create a second competing legacy tracker reservation

## Decisions already made

- Scale remains a dedicated operation, not Resize.
- Scale authors real source geometry/visual metrics; do not replace this with a permanent CSS `transform: scale(...)`.
- center-anchor scaling must preserve the object's visual center.
- one Scale gesture/commit remains one undoable history step.
- shared variables/tokens are not globally mutated.
- unsupported/ambiguous semantics fail closed.
- the expected Packet 1 result is stroke 4 and radius 20; do not redefine acceptance to match the buggy deployed behavior.

## Implementation intent

Find the first divergence between authored rectangle visual metrics and the Scale snapshot/plan/commit path.

Start inside the owned Scale subsystem. Determine why the runtime rectangle's stroke and corner radius are not included in the committed proportional scale despite the policy declaring their dimensional properties.

Repair the smallest source path that restores actual authored visual-metric scaling without regressing geometry, anchoring, live preview, or history.

Add regression coverage that fails on the deployed behavior and passes only when the authored visual metrics are truly scaled.

## Acceptance criteria

- [ ] 100 × 50 rectangle, stroke 2, radius 10 scales 2× to 200 × 100, stroke 4, radius 20
- [ ] center remains unchanged when center anchor is selected
- [ ] one undo restores 100 × 50 / stroke 2 / radius 10
- [ ] one redo restores 200 × 100 / stroke 4 / radius 20
- [ ] Scale inspector values re-measure coherently after commit
- [ ] no permanent wrapper `transform: scale(...)` is introduced
- [ ] Resize and Rotate focused regressions remain green
- [ ] existing Scale policy/math/integration tests remain green
- [ ] production deployment is verified against the exact repair lineage
- [ ] original `native-scale-tool-qa-closeout` can resume at Packet 1 after repair

## Intended ownership

Owned:
- `src/canvas/scale/**`
- `src/editor/scale-tool.integration.test.ts`

Approved Shared:
- `tracker.md` only when required by the canonical current process for the existing Scale lineage

Protected:
- all other product/source paths

If diagnosis proves the fix requires mutation outside Owned, stop and request an explicit ownership expansion. Do not silently grab `PropertiesPanel`, selection, resize, store, parser, generator, or other subsystems.

## Investigation permitted during implementation

Read any source needed to trace the first divergence, including shape/style representation and inspector mappings.

Mutation remains restricted to Owned until an explicit ownership expansion is recorded.

## Out of scope

- changing Scale product semantics
- changing shortcuts
- redesigning the Scale inspector
- unrelated FigUI3 work
- Group normalization unrelated to this visual-metric defect
- typography/effects, multi-selection, rotated-object, or Design ↔ Preview closeout beyond what is necessary to ensure this repair does not regress them

## Known traps / prior findings

- static Scale policy tests passed before this runtime defect was discovered; do not treat them as proof of runtime metric persistence
- `planScaledStyles` explicitly lists border/stroke/radius dimensional properties, so the bug may be in runtime authored-style representation, snapshot capture, or commit application rather than the pure scaling arithmetic
- the browser QA agent initially emitted a false PASS summary; trust directly observed field/state evidence, not narrative summaries
- do not rerun legacy installer/package history
- do not release the active legacy Scale reservation from this repair assignment

## Validation

At minimum:
- targeted regression reproducing 100 × 50 / stroke 2 / radius 10 → factor 2
- existing `src/canvas/scale/**` tests
- `src/editor/scale-tool.integration.test.ts`
- relevant Resize/Rotate regression tests
- TypeScript
- `npm run build:all`
- `git diff --check`
- exact changed-path allowlist
- moving-main reconciliation before publication

## Runtime QA

Primary evidence:
- disposable `https://field.loew.fi/builder/noauth`
- current small-packet protocol from the repo-hosted handoff kit
- verify exact deployed repair lineage first
- rerun original Packet 1 with explicit pre/post values and one-step undo/redo

Expected:
- 100 × 50 / stroke 2 / radius 10
- factor 2 center anchor
- 200 × 100 / stroke 4 / radius 20
- fixed center
- undo restores preimage
- redo restores postimage

After repair Packet 1 passes, hand control back to `native-scale-tool-qa-closeout` for Packets 2–6 and final closeout.

Human/authenticated QA:
- none required beyond the original closeout contract unless the current repo-hosted protocol expands it

## Handoff source

- `.field/assignments/assignment-native-scale-tool-qa-closeout.md`
- `.field/qa/native-scale-tool-qa-closeout.md`
- `.field/mail/native-scale-tool-qa-closeout.md`
- implementation commit `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`

## Completion contract

- implementation remains on `field/native-scale-visual-metrics-repair`
- do not push repair implementation directly to `main`
- update this assignment's mailbox and QA record
- record QA against exact tested branch/main SHAs
- merge only after the current merge gate passes
- do not close/release legacy `native-scale-tool-20260926`; original QA closeout owns final acceptance and release
- once repair lands, original `native-scale-tool-qa-closeout` resumes from Packet 1


## Activation — 2026-09-26

- branch: `field/native-scale-visual-metrics-repair`
- activated from current `main` at `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- current repo-hosted handoff kit adopted: `2026-09-26.3`
