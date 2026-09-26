# Firecrawl QA — small-packet protocol

Use small isolated Firecrawl QA packets instead of one long browser session attempting the full acceptance matrix.

## Default packet

One behavior family or about 1–3 closely related assertions.

1. Open `https://field.loew.fi/builder/noauth`.
2. Wait for the editor to settle.
3. If **Welcome to Revyme** appears, dismiss it with **Don't show again**. It intercepts pointer events and can create false failures. Long term, `/builder/noauth` should suppress onboarding automatically.
4. Build the smallest deterministic fixture directly in field.
5. Capture a pre-operation snapshot from the canvas iframe using DOM/computed geometry, not screenshots alone.
6. Perform one focused interaction through the real field UI/shortcut whenever practical.
7. Capture the post-operation snapshot and calculate explicit deltas/assertions.
8. Exercise undo/redo in the same packet when history is relevant.
9. Classify as `PASS`, `FAIL — FIELD`, or `BLOCKED/UNVERIFIED — HARNESS`.
10. Stop the Firecrawl session immediately after the packet. Start fresh for unrelated work.

Reuse the same `scrapeId` only for immediate follow-up assertions on the same fixture.

## Preferred evidence

Prefer numerical/semantic evidence:

- node IDs
- parent IDs
- direct-child order
- `data-field-group` and other semantic markers
- authored `style`
- relevant computed styles
- computed `transform`
- `getBoundingClientRect()`
- explicit before/after deltas

Example:

```text
child world delta:
dx = 0
dy = 0
dw = 0
dh = 0

Group vs painted-child union:
dx = 0
dy = 0
dw = 0.0068px
dh = 0.0039px
```

Treat tiny subpixel browser rounding separately from meaningful geometry drift.

## Group / reparent / transform checks

For Group tests, derive the painted union from child `getBoundingClientRect()` values and compare the Group wrapper with that union. For nested Groups, verify every affected ancestor independently. For reparenting, compare every moved node's world-space geometry before and after.

For transformed objects, do not judge correctness from `left` / `top` alone. Compare painted world geometry, computed transform, and semantic parentage/order. Retaining `rotate(35deg)` while jumping 14 px is still a field failure.

## Design ↔ Preview parity packets

When the change affects runtime parity, inspect both Design and Preview runtimes, including `canvas.field.loew.fi` and `preview.field.loew.fi` where applicable.

Compare IDs, semantic markers, parent/order, authored styles, relevant computed geometry, transforms, and node existence.

Preview is runtime truth.

## Clipboard testing

For deterministic `Ctrl+C` / `Ctrl+V`:

1. let field perform real `Ctrl+C` so its internal `revyme_clipboard` path is populated
2. grant `clipboard-read` / `clipboard-write`
3. write a harmless marker such as `revyme-node:qa` to `navigator.clipboard`
4. invoke real `Ctrl+V`

Do not classify browser clipboard restrictions as field defects.

## Session examples

Good:

```text
Group child resize
→ wrapper refit
→ sibling stationary
→ undo
→ stop
```

Good:

```text
rotated child
→ Ungroup
→ world-space transform comparison
→ stop
```

Avoid giant sessions spanning unrelated subsystems.

## Security / infrastructure

The QA bypass is intentionally narrow:

```text
field.loew.fi/builder/noauth
field.loew.fi/assets/*
```

The normal dashboard and API remain protected.

Do not widen the bypass to:

```text
field.loew.fi/*
/api/*
```

`/builder/noauth` is disposable and in-memory; refresh resets it.

It does not prove authenticated project persistence, R2 durability, reload persistence, dashboard identity, multi-browser stale-revision behavior, or Access policy behavior. Mark those unavailable in the noauth harness and use authenticated/staging/manual verification.

## Reporting

After each packet, report only what passed, what failed, exact reproduction/evidence, and any harness limitation. Prefer one consolidated defect when multiple failures share one architectural cause.
