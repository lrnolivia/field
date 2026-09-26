# mail-native-scale-tool-qa-closeout.md

to: successor
type: migration-handoff

## What matters most

1. **Do not rebuild or reapply Scale.** Source is already on `main` at `ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a`, and its Cloudflare production build check succeeded.
2. **The active legacy Scale tracker reservation means QA/closeout is unfinished, not implementation.** This successor intentionally owns no Scale source.
3. **Historical installer failures are not product failures.** The final landing run passed 270 tests, TypeScript, modified-path lint with 0 errors, and `build:all`.

## Start here

Rehydrate from current Git first. This registration happened while Contract Worker coordination v2 PR #2 was still open/draft and main still used handoff-kit `2026-09-26.1`.

Then prove current deployed lineage contains `ec3b443` and run the basic 2× rectangle packet through the current QA protocol with pre/post geometry plus one-step undo/redo evidence.

## Settled decisions

- Resize changes box geometry; Scale changes design size.
- Scale is a dedicated operation, not ResizeManager mode state.
- `K` = Scale; `Shift+P` = Sketch; `P` = Path; `V` = Move.
- Scale persists source geometry/visual metrics, not a wrapper Scale transform.
- One Scale operation is one history step.
- Unsupported/ambiguous semantics fail closed.
- Group baseline problems are not normalized by Scale.
- Preview is runtime truth and still needs explicit parity proof.

## Watch these surfaces

- `tracker.md` — legacy Scale reservation is still active.
- `src/editor/BottomToolbar.tsx` — prior moving-main/ownership hotspot; protected here.
- `src/canvas/selection/SelectionOverlay.tsx` — protected Scale handle integration.
- `src/canvas/scale/scale-operation.ts` — protected operation/fail-closed behavior.
- `src/editor/tools/ScaleTool.tsx` — protected numeric/anchor UI.
- `.field/handoff-kit/qa/FIRECRAWL_QA_PROTOCOL.md` — current protocol wins.

## Diagnostic shortcuts

- K does nothing / Sketch still owns K → verify deployed lineage before debugging behavior.
- Box grows but stroke/radius/type do not → likely geometry-only/Resize-like product failure.
- Design changes but Preview/source reverts → persistence/parity failure.
- Group structure changes unexpectedly → Scale may be masking a Group baseline problem.
- One gesture creates multiple undo steps → history batching regression.
- QA requires source edits → stop and create a separate repair assignment with explicit ownership.



## 2026-09-26 runtime QA stop

Packet 1 produced a real product failure.

Verified behavior:
- 100 × 50 rectangle with stroke 2 and radius 10
- Scale factor 2 from center
- geometry became 200 × 100
- center remained fixed at (1013, 595)
- undo/redo restored the correct geometry states
- stroke remained 2 instead of 4
- radius remained 10 instead of 20

Classification: **FAIL — PRODUCT**.

The QA-only successor stopped immediately and did not modify protected Scale source. Packets 2–6 were not run.

Repair work is split into `native-scale-visual-metrics-repair`. Preserve the active legacy `native-scale-tool-20260926` tracker reservation until repaired Scale passes the original closeout acceptance matrix.
