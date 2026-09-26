# mail-figui3-paint-stacks.md

to: successor Contract Worker for figui3-paint-stacks
type: migrated-product-followup

## What matters most

The previous FigUI3 rich-Inspector / toolbar work already landed and is closed.

This is **new follow-up work**, not an excuse to replay r8/r9.

The settled requirement is:

> Fill and Stroke must list every actual contributing paint as an ordered stack in the Inspector.

Do not flatten the object to one representative color.

## The biggest trap

`PaintRow.tsx` already has a visibility slot, but its source explicitly says the slot is intentionally empty until field has persistent per-paint enabled/disabled state.

Do **not** wire an eye icon to ephemeral React state.

Visibility must survive authored source, reparse, Preview, and reload.

## Useful current foundation

- `FillControl.tsx` already has single/multiple background modes.
- `background-layer-utils.ts` already parses/formats CSS background layers in order.
- `PaintRow.tsx` is already the canonical FigUI3 row grammar.
- `paint-opacity.ts` already preserves paint-local opacity/token identity for supported paints.
- Text `StrokeControl.tsx` is still fundamentally one `WebkitTextStroke` paint.

Start by tracing where semantic paint information is already preserved and where it becomes flattened. Extend the existing architecture; do not build a second fake paint system beside it.

## Product direction that is settled

Each row should expose, where supported:
- swatch/type;
- authored value or token;
- local opacity;
- persistent visibility;
- rich editor;
- reorder;
- remove;
- add.

Canonical UX:
**section heading → compact ordered list → rich editor for selected row**

The model must remain compatible with source-first field, Preview truth, Figma import, and eventual Figma sync.

Where CSS cannot represent a paint 1:1, use explicit deterministic translation or fail closed. Never silently drop a layer.

## Why there is no branch yet

Nothing for this follow-up has been implemented.

The control record intentionally claims no source ownership and has no branch/PR.

When you actually start:
1. refresh main/control/tracker;
2. narrow exact ownership;
3. activate it;
4. create `field/figui3-paint-stacks`;
5. open Draft PR `[field] figui3-paint-stacks`.

Do not create a branch merely to make the migration record look active.

## Current registration baseline

- main: `7451b55f29c94e2d56e014590067e7111cd3915a`
- prior FigUI3 implementation: `dca7cd406f66fbfc391cec1c6ce3bb7e1c06b4ec`
- current handoff kit on main: `2026-09-26.1`

Re-read all three before implementation.
