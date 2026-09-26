# assignment-figui3-paint-stacks.md

---
field_assignment: 1
id: figui3-paint-stacks
status: ready-for-implementation
branch: null
pr: null
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.1
type: migrated-product-followup
execution_class: contract-worker
source_chat: field FigUI3 planning / implementation continuation chat
source_legacy_assignment: figui3-polish-addendum-rich-inspector-popovers-20260925
source_implementation_commit: dca7cd406f66fbfc391cec1c6ce3bb7e1c06b4ec
owned: []
approved_shared: []
protected:
  - src/dashboard/**
  - src/backend/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: true
  authenticated: false
---

# field — FigUI3 complete paint stacks

## Migration classification

The preceding FigUI3 rich-Inspector / toolbar implementation is already landed and its legacy assignment is complete.

The remaining work is a **new product follow-up** derived from the settled Figma UI3 direction:

> Under Fill and Stroke, field must show the complete ordered paint stack — every paint/color actually contributing to the selected object — rather than flattening the object down to one representative value.

No source implementation for this follow-up has started.

This control record therefore:
- creates no fake implementation branch or Draft PR;
- claims no source ownership yet;
- preserves the product requirement and verified current implementation context;
- instructs the successor to re-read current main/control/tracker, narrow exact paths, activate ownership, then create `field/figui3-paint-stacks` from then-current `main` when implementation actually begins.

## Current verified repository state at registration

Current `main`:

`7451b55f29c94e2d56e014590067e7111cd3915a`

Previous FigUI3 implementation:

`dca7cd406f66fbfc391cec1c6ce3bb7e1c06b4ec`

Previous assignment:

`figui3-polish-addendum-rich-inspector-popovers-20260925`

That assignment is complete.

Current control-plane branch existed and was re-read immediately before registration.

No branch or open PR matching `figui3-paint-stacks` existed at registration.

### Relevant current source observations

Observed on current `main`:

- `src/editor/controls/PaintRow.tsx` already defines the canonical FigUI3 paint-row grammar: compound paint value + paint-local opacity + visibility slot + remove slot.
- The visibility slot is intentionally empty today because field does not yet have persistent per-paint enabled/disabled state; do not fake it.
- `src/editor/tools/StylesTool/atoms/FillControl.tsx` already supports single and multiple background-layer modes and uses `parseBackgroundLayers` / `formatBackgroundLayers`.
- `src/editor/ui/background-layer-utils.ts` already parses CSS background-image layer lists into structured ordered `BgLayer[]` values and folds background color into the bottom layer when formatting a multi-layer fill.
- `src/editor/ui/paint-opacity.ts` already provides deterministic paint-local opacity encoding for supported solid paints while preserving token identity where possible.
- `src/editor/tools/TextStyleTool/atoms/StrokeControl.tsx` currently represents text stroke as one `WebkitTextStroke` paint and uses `PaintRow`; it is not a general ordered multi-stroke model.
- No dedicated cross-surface semantic paint-stack model was established by the inspected current paths. The successor must verify the broader document/parsing/generation architecture before deciding where that canonical representation belongs.

Observed blobs at registration:
- `PaintRow.tsx`: `c2138496862751060069aa9403ef508690600f17`
- `FillControl.tsx`: `e2c4bc762acb5c787bdd6a22f3c015d3dd39e60c`
- `background-layer-utils.ts`: `bc3042f0e995447b27ccb8d1512914289dd509db`
- `paint-opacity.ts`: `c7cc75d6e739021ea735cf081d8325006e0462e0`
- `StrokeControl.tsx`: `9ac01190c2adb6d27a8b0ee14661772052e1d6f9`

These blobs are historical registration evidence only. Re-read current `main` before implementation.

## Settled product requirement

### Fill / Stroke must show the whole stack

Under **Fill** and **Stroke**, the Inspector must display the complete ordered paint stack for the selected object.

Do not reduce the section to one "current color" when multiple paints contribute.

The default collapsed Inspector state should make the object's actual paint structure legible without forcing the user to open a picker.

### Paint-row contract

Each paint row should expose, where the underlying paint supports it:

- swatch / visual preview;
- paint type: solid, gradient, image, token/variable-backed, or other explicit supported type;
- actual authored value or bound variable/token;
- per-paint opacity;
- persistent visibility toggle;
- affordance to open the richer paint editor;
- drag/reorder when multiple paints are meaningful;
- remove;
- `+` / add-new-paint affordance at section level.

Use the established FigUI3 row grammar rather than inventing another bespoke shell.

### UX hierarchy

Canonical interaction:

> **section heading → compact ordered list of actual values → rich editor for the selected row**

The section itself is state inspection + stack manipulation.
The popup/editor is for deep editing of one row.

### Semantic requirement

This must **not** be an Inspector-only array laid over one flattened CSS field.

field needs a deterministic canonical representation of ordered paints at the first architecture layer capable of preserving:

- order;
- paint type;
- authored value;
- token/variable identity;
- per-paint opacity;
- enabled/disabled state;
- paint-specific metadata required for round-trip behavior.

The worker must inspect current architecture before naming or placing that model. Do not invent a parallel "design graph" store if the existing source/document model already has the correct semantic home.

### Source / Preview / Figma requirement

The ordered stack must preserve meaning through:

- source generation;
- Design reparse;
- Preview;
- serialization;
- Figma import where the source concept is supported;
- eventual Figma synchronization.

Preview remains runtime truth.

Where Figma paint semantics cannot map 1:1 to CSS, preserve the semantic intent and use explicit deterministic translation rules. Do not silently drop, reorder, bake, or flatten unsupported layers merely to make the UI look correct.

### Web translation

Real web output may require coordinated CSS such as:

- `background-color`;
- one or more `background-image` layers;
- per-layer size/position/repeat/attachment/blend values;
- SVG fill/stroke + native opacity;
- borders / text-stroke / other representable stroke paths;
- explicit generated wrappers/effects only if the architecture already permits them and source semantics remain honest.

Do not counterfeit multi-stroke support by emitting unrelated CSS effects without an explicit semantic contract.

### Stack principle beyond Fill / Stroke

The same design principle should generalize to legitimate ordered visual stacks such as:

- effects;
- shadows;
- layered backgrounds;
- future stackable visual treatments.

This assignment should architect for that direction, but **Fill and Stroke are the required implementation target**. Do not let effects/shadows turn the first paint-stack implementation into an unbounded redesign.

## Known current ownership state

At registration, the active legacy tracker assignments did not own the inspected core paint paths above.

Other active work still exists, including Gallery, Dashboard/editor motion, thumbnail capture, and Scale closeout.

This assignment deliberately claims:

`owned: []`

because no implementation branch has started.

Before any source write, the successor must:

1. refresh `main`;
2. refresh `field/control`;
3. refresh active legacy `tracker.md` ownership;
4. identify the smallest exact source path set;
5. stop on parent/child overlap;
6. update this assignment to active ownership under the current control-plane process;
7. then create/adopt the implementation branch and Draft PR.

## Intended implementation surfaces to inspect

These are **not reserved ownership** yet:

- `src/editor/controls/PaintRow.tsx`
- `src/editor/tools/StylesTool/atoms/FillControl.tsx`
- `src/editor/tools/TextStyleTool/atoms/StrokeControl.tsx`
- other actual non-text Stroke/Fill inspector controls discovered on current main
- `src/editor/ui/background-layer-utils.ts`
- `src/editor/ui/paint-opacity.ts`
- source/document parsing + generation paths actually responsible for these authored paint properties
- Figma import/sync paths only if already present and necessary to preserve semantics
- focused regression tests colocated with those systems

Do not pre-own broad `src/code/**`, `src/editor/**`, or `src/canvas/**`.

## Exact next actions for the successor

1. Rehydrate from current repo-hosted handoff kit, `main`, `field/control`, this assignment, this mailbox, this QA record, and active legacy tracker state.
2. Inventory every current Fill and Stroke rendering/editing path for:
   - element backgrounds;
   - gradients;
   - images;
   - token/variable-backed paints;
   - SVG fill/stroke;
   - border/stroke controls;
   - text fill/stroke;
   - multi-selection;
   - current Figma import representation if present.
3. Trace current data from authored source → parser/document model → Inspector → mutation → generated source → Preview.
4. Identify the **first point where multiple paint semantics become flattened or lost**.
5. Propose the smallest canonical ordered-paint representation that preserves current source-first architecture.
6. Define deterministic CSS translation and unsupported-state behavior.
7. Re-run ownership preflight and activate the smallest exact path set.
8. Create `field/figui3-paint-stacks` from then-current `main`.
9. Open Draft PR `[field] figui3-paint-stacks`.
10. Implement one coherent end-to-end paint-stack slice before broadening:
    - complete Fill list;
    - real source-backed visibility;
    - reorder;
    - add/remove;
    - opacity;
    - token identity;
    - source/Preview round trip.
11. Bring Stroke onto the same stack contract only where the source model can preserve it honestly.
12. Add focused tests, TypeScript, `npm run build:all`, exact changed-path audit, and runtime/visual QA.

## Acceptance criteria

### Inspector
- [ ] Fill displays every contributing paint in deterministic order.
- [ ] Stroke displays every supported contributing paint in deterministic order.
- [ ] one row corresponds to one semantic paint, not one arbitrary CSS property.
- [ ] row order matches authored/rendering order under documented field semantics.
- [ ] add/remove/reorder are real authored mutations and history-safe.
- [ ] visibility is persistent source-backed state; no fake eye icon.
- [ ] opacity remains paint-local and token-safe.
- [ ] bound variables/tokens remain identifiable instead of being baked to literals.
- [ ] rich editing opens for the selected row without hiding the rest of the stack.
- [ ] empty state is compact and obvious.

### Source / runtime
- [ ] source generation preserves the stack deterministically.
- [ ] Design reparse reconstructs equivalent ordered paint semantics.
- [ ] Preview matches Design.
- [ ] unsupported mappings fail closed or use explicit documented translation; no silent paint loss.
- [ ] CSS background-layer ordering remains correct.
- [ ] existing single-fill documents remain compatible.
- [ ] existing variable/token references survive round trip.
- [ ] current image/gradient/background behavior does not regress.

### Figma direction
- [ ] the model can preserve imported multi-paint meaning where supported.
- [ ] implementation does not create a dead-end UI-only representation that blocks future Figma sync.
- [ ] field semantics remain explainable independently of Figma's internal implementation.

## Required validation

Before source publication:

- focused paint-stack/model tests;
- existing Fill/background-layer regressions;
- existing PaintRow/opacity regressions;
- relevant Stroke/text regressions;
- parser/generator round-trip tests for changed semantics;
- undo/redo tests for add/remove/reorder/visibility;
- token/variable preservation tests;
- `git diff --check`;
- TypeScript;
- `npm run build:all`;
- exact changed-path allowlist;
- moving-main reconciliation.

## Runtime QA

Use small packets.

### Packet 1 — multiple Fill visibility
Create a frame with:
- solid base;
- gradient;
- image.

Verify all three appear as separate ordered rows and Design rendering matches the list.

### Packet 2 — reorder + undo
Reorder two paints.
Verify:
- visible compositing order changes;
- authored source changes deterministically;
- one undo restores exact prior order;
- redo restores new order.

### Packet 3 — visibility
Disable one paint.
Verify:
- authored paint is preserved;
- render omits only that paint;
- re-enable restores it;
- reload/reparse preserves enabled state.

### Packet 4 — opacity/token
Use a token-backed solid paint with local opacity.
Verify token identity survives and Preview matches Design.

### Packet 5 — source round trip
Reload/reparse after a multi-paint edit and verify identical order/type/value/opacity/enabled state.

### Packet 6 — Stroke
Exercise every Stroke stack behavior actually implemented.
Do not claim Figma-equivalent multi-stroke behavior for source representations that are intentionally unsupported.

## Human visual QA

Confirm:
- rows feel like Figma UI3: compact, clear, quiet, precise;
- every actual paint is discoverable at a glance;
- reorder hit targets are usable;
- swatches and value labels remain legible;
- the stack does not devolve into a tall generic form;
- selection blue remains functional rather than decorative.

## Explicit non-goals

- no generic Inspector redesign;
- no unrelated toolbar work;
- no Dashboard/Canvas transition work;
- no Gallery redesign;
- no fake visibility state;
- no AI-driven paint interpretation where deterministic parsing is possible;
- no silent flattening to "closest CSS";
- no broad effects/shadows implementation unless needed to prove the paint-stack abstraction;
- no Figma sync implementation beyond preserving semantic compatibility unless separately assigned;
- no broad parser/generator rewrite without first proving the exact divergence.

## Unknown / unverified at migration

The successor must verify rather than assume:

- exact canonical document-model home for ordered paints;
- all non-text Stroke implementations;
- current Figma import handling of multiple fills/strokes;
- whether any existing semantic enabled/disabled paint state already exists outside inspected paths;
- multi-selection alignment semantics for unequal paint-stack lengths;
- whether CSS translation needs a compatibility encoding for persistent disabled paints.

## Completion contract

This assignment is complete only when:

- Fill and supported Stroke stacks are represented semantically and visibly;
- every supported paint row is editable without flattening unrelated paints;
- order, opacity, visibility, token identity, source, reparse, and Preview parity are tested;
- unsupported mappings are explicit and fail-safe;
- existing single-paint behavior remains compatible;
- runtime/human QA is recorded against exact tested SHA(s);
- ownership is released under the current control-plane process;
- any broader effects/shadows or Figma-sync work is split into a separate follow-up instead of silently expanding scope.
