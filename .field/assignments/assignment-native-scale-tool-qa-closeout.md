# assignment-native-scale-tool-qa-closeout.md

---
field_assignment: 1
id: native-scale-tool-qa-closeout
status: blocked-product-defect
branch: null
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.1
type: qa-closeout-handoff
execution_class: contract-worker
implementation_commit: ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a
owned: []
approved_shared:
  - tracker.md
protected:
  - src/canvas/scale/**
  - src/canvas/selection/ScaleHandles.tsx
  - src/editor/tools/ScaleTool.tsx
  - src/editor/scale-tool.integration.test.ts
  - src/code/stores/tool-store.scale.test.ts
  - src/code/stores/tool-store.ts
  - src/code/stores/tool-store.creator-lock.test.ts
  - src/canvas/shortcuts.ts
  - src/canvas/selection/SelectionOverlay.tsx
  - src/editor/BottomToolbar.tsx
  - src/editor/figui3-bottom-toolbar-figma-parity.test.ts
  - src/editor/PropertiesPanel.tsx
qa:
  firecrawl: true
  authenticated: false
---

## Role and goal

Take over only the remaining runtime QA and closeout work for the already-landed first-class proportional Scale tool.

Do not rebuild, reapply, or modify Scale source under this assignment. The implementation is already on `main` at `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`.

The job is to prove deployed runtime behavior, record exact QA evidence, and close/release the still-active legacy `native-scale-tool-20260926` tracker reservation when acceptance evidence is sufficient.

## Mandatory rehydration

Before doing anything:

1. read the current repo-hosted handoff kit from `main`;
2. read current `main`;
3. read current `field/control`;
4. read this assignment, its mailbox, and QA record;
5. read active Contract Worker assignments;
6. read still-active legacy `tracker.md` ownership;
7. verify current deployment lineage/checks for the Scale implementation.

Process truth from the current repository supersedes the migration chat's old installer/process assumptions.

## Coordination transition state at registration

This assignment was registered during the Contract Worker v2 bootstrap transition.

Verified at registration:

- `main`: `7451b55f29c94e2d56e014590067e7111cd3915a`
- `field/control`: `c2194a6e7e87d200b89248a4681d91448ef03ddd` before this registration commit
- main handoff-kit: `2026-09-26.1`
- Contract Worker coordination v2 Draft PR: #2
- PR #2 head: `b00499e2838303a4a1061b8089c7137c6a301746`
- PR #2 was open and draft at registration
- no `field/native-scale-tool-qa-closeout` branch existed
- no PR associated with `native-scale-tool-qa-closeout` existed

Because the Scale implementation already landed and only QA/closeout remains, do not invent an implementation branch or Draft PR for this successor.

If PR #2 or the handoff kit changes before work starts, rehydrate and follow the new repo-hosted process.

## Current verified implementation state

- Scale implementation commit: `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`
- `ec3b443` is contained in current `main`.
- Current `main` is a tracker-only descendant of the Scale implementation.
- Legacy `tracker.md` still marks `native-scale-tool-20260926` active and records `Implementation: ec3b443...`.
- Cloudflare `Workers Builds: field` completed successfully for `ec3b443`.
- Cloudflare build ID: `51b577d0-4a3c-4ba9-bf5e-040d13441c9b`
- Cloudflare version ID: `49688a42-30a6-4ff5-af00-f2ae1d587155`
- Final landing validation passed 14 focused/regression test files: 270/270 tests passed.
- TypeScript passed.
- Modified-path ESLint completed with 0 errors.
- `npm run build:all` passed for editor, canvas sandbox, and Preview sandbox.
- No source patch is needed.
- Runtime/visual acceptance remains not run.

## Settled product decisions

Do not reopen these unless current repository truth conflicts or the user explicitly changes them.

- Resize changes box geometry. Scale changes the size of the design.
- Scale is a dedicated operation, not a mode inside `ResizeManager`.
- `K` activates Scale.
- Sketch is `Shift+P`; Path remains `P`.
- `V` returns Move.
- Scale uses proportional corner handles and anchor-aware, rotation-aware geometry.
- Inspector Scale controls expose W, H, multiplier, and a 3×3 anchor.
- W/H stay linked; multiplier must remain positive.
- Default anchor is center.
- Anchor change alone must not mutate source or create history.
- Scale persists real source geometry/visual metrics, not a wrapper `transform: scale(...)`.
- Geometry, descendant positions, font size, stroke, radius, effects, Auto Layout numeric values, image box, SVG/vector geometry, and dimensional transform translations scale where representable.
- Unitless line-height remains unitless.
- Shared tokens/variables are not globally mutated.
- Auto Layout semantics stay intact.
- Images preserve crop/fill/focal/asset semantics.
- Rotation/skew angles remain unchanged.
- Unsupported nested-instance/ambiguous semantics fail closed rather than detach or guess.
- Multi-selection uses one aggregate box/anchor/scalar and canonical roots to prevent double scaling.
- Groups are accepted only from a valid baseline; bad Group geometry must fail closed as `BLOCKED — GROUP BASELINE`.
- One Scale operation remains one history step.
- Preview is runtime truth; Design/source/Preview parity must be proven.

## Ownership

Owned:

- none

Approved Shared:

- `tracker.md` only if the current coordination procedure requires closing/releasing the legacy Scale reservation

Protected:

- all landed Scale source and integration paths listed in front matter

If QA reveals a product defect that requires source changes, stop this assignment and create a new uniquely named repair assignment with the smallest required ownership set.

## Required QA packets

Use the current repo-hosted QA protocol, especially `.field/handoff-kit/qa/FIRECRAWL_QA_PROTOCOL.md` if still current.

### Packet 1 — basic visual metrics + history

Fixture:

- rectangle 100×50
- stroke 2px
- radius 10px

Action:

- enter Scale with `K`
- scale 2× from center anchor

Expect:

- 200×100
- stroke 4px
- radius 20px
- center remains fixed
- exactly one undoable history step
- undo restores preimage
- redo restores scaled postimage

### Packet 2 — typography/effects

Verify typography/effects scale coherently while preserving text content, family, weight, style, alignment, and unitless line-height semantics.

### Packet 3 — multi-selection + anchor

Verify one shared selection box/anchor/scalar, canonical roots, no ancestor/descendant double scaling, correct anchor behavior, and no mutation/history from anchor change alone.

### Packet 4 — rotated object

Use an object rotated about 35°. Verify proportional Scale while preserving the rotation angle and expected anchor behavior.

### Packet 5 — Group baseline gate

Verify a valid Group baseline scales correctly. For a known invalid baseline, verify explicit fail-closed behavior rather than silent Group normalization.

### Packet 6 — Design ↔ Preview parity

After committed Scale edits, verify Design and Preview agree. Use the strongest reparse/reload proof the harness supports and record any harness limitation explicitly.

### Human/manual check

Briefly verify:

- handle hit targets
- directional Scale cursor behavior
- mode transitions
- `K`, `Shift+P`, `P`, `V` feel coherent

## Acceptance criteria

- [ ] deployed production lineage contains `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`
- [ ] `K` enters Scale and UI reflects Scale mode
- [ ] `Shift+P` activates Sketch
- [ ] `P` remains Path
- [ ] `V` exits Scale to Move
- [ ] packet 1 passes geometry, visual metrics, fixed-center anchor, undo, redo
- [ ] packet 2 passes typography/effects semantics
- [ ] packet 3 passes multi-selection and anchor semantics
- [ ] packet 4 passes rotated-object behavior
- [ ] packet 5 passes valid Group behavior or expected baseline block classification
- [ ] packet 6 proves Design/Preview parity at the strongest available level
- [ ] no Resize/Rotate regression is observed during the packets
- [ ] human handle/cursor/mode-feel check is recorded
- [ ] QA evidence names exact tested SHA(s), environment, and classification
- [ ] legacy `native-scale-tool-20260926` ownership is released only after acceptance evidence is sufficient

## Failure classification

Use truthful categories:

- PASS
- FAIL — PRODUCT
- BLOCKED/UNVERIFIED — HARNESS
- BLOCKED — ENVIRONMENT
- BLOCKED — GROUP BASELINE where that is the intended fail-closed result

Trace product failures to the first point of divergence. Do not cosmetically hide parity failures.

## Known traps

- Do not rerun any legacy Scale r1–r7 installer.
- Historical installer/package failures were process defects and are not runtime Scale failures.
- The FigUI toolbar worker legitimately changed `BottomToolbar.tsx` before Scale landed; Scale was validated only after that ownership was released.
- Do not treat the active legacy tracker reservation as proof source implementation is unfinished.
- Do not turn a QA-only assignment into an implementation assignment.
- Do not claim authenticated persistence/cross-session durability from `/builder/noauth`.
- Do not infer runtime acceptance from static tests or a successful Cloudflare build.

## Exact next actions

1. Rehydrate current kit, `main`, `field/control`, mail/QA, and legacy tracker.
2. Re-check whether coordination v2 PR #2 has merged; if it has, adopt the new current process before proceeding.
3. Verify deployed lineage/checks for `ec3b443`.
4. Run packet 1 and record exact evidence.
5. Run packets 2–6 in small independent QA packets.
6. Perform the brief human/manual feel check.
7. Update only this assignment's QA/mail records as permitted by the current control-plane rules.
8. If all acceptance criteria pass, close/release the legacy Scale tracker reservation through the current canonical procedure.
9. If a product defect is found, create a separate repair assignment; do not patch protected source here.

## Completion contract

Complete only when:

- required runtime QA has been truthfully recorded;
- deployment ancestry is proven;
- human/manual acceptance is recorded where required;
- any harness limitations are explicit;
- any product defects have been split into separate repair work;
- the legacy Scale ownership reservation is released/closed under the current coordination rules.



## Runtime QA stop — 2026-09-26

Classification: **FAIL — PRODUCT**.

QA stopped after Packet 1, as required by this assignment, because deployed Scale changed box geometry but did not scale the rectangle's visual metrics.

Observed on the disposable production QA harness:

- preimage: width 100, height 50, X 963, Y 570, stroke 2, corner radius 10
- action: dedicated Scale, center anchor, factor 2 committed through the Scale inspector
- postimage: width 200, height 100, X 913, Y 545, stroke 2, corner radius 10
- center before: (1013, 595)
- center after: (1013, 595)
- one undo restored 100 × 50 at X 963 / Y 570
- one redo restored 200 × 100 at X 913 / Y 545
- expected visual metrics were stroke 4 and radius 20
- actual visual metrics remained stroke 2 and radius 10

Packets 2–6 and the final human feel check are intentionally not run after this product failure.

Successor repair assignment:

- `native-scale-visual-metrics-repair`
- canonical control record: `.field/assignments/assignment-native-scale-visual-metrics-repair.md`

Do not release the legacy `native-scale-tool-20260926` reservation yet. The repair successor must resume within that existing ownership lineage rather than create a competing legacy tracker reservation.
