# Figma behavioral parity — Stage 0

## Purpose

This is the Stage 0 interaction-semantics gate for field.

Official Figma Learn / Help Center documentation is the reference for **behavior**, not field visual styling. Field keeps its own product identity and chrome. A row only becomes `verified` when the current implementation is understood and the behavior has appropriate regression coverage; corrected foundational interactions should receive real-Chromium Playwright coverage where reliable.

Status vocabulary:

- `verified` — behavior is present and backed by relevant automated coverage.
- `pass / chromium pending` — implementation matches the documented behavior, but this audit still owes browser-level coverage.
- `gap` — documented behavior is missing or materially different.
- `pending audit` — not yet inspected; no parity claim is being made.
- `not applicable` — the Figma behavior does not map to field's web-design scope.

## Batch 1 — selection and canvas interaction

Official reference: https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects

| Figma documented behavior | field current behavior | parity status | discrepancy / required fix | regression coverage |
| --- | --- | --- | --- | --- |
| Clicking a nested object selects its parent/surface by default | CanvasMouseController resolves ordinary hits through the active hierarchy instead of always selecting the deepest DOM hit | verified | none | CanvasMouseController unit + `figma-selection-parity.spec.ts` Chromium |
| Double-click, or Enter, selects one nesting level deeper | Double-click drills one level; Enter uses `selectChildren(...)[0]` and enters that container | verified | none | mouse-controller + shortcut unit + `figma-selection-parity.spec.ts` Chromium |
| Cmd/Ctrl click deep-selects a nested object | Cmd/Ctrl bypasses hierarchy redirection and keeps the deepest eligible hit | verified | none | CanvasMouseController unit + `figma-selection-parity.spec.ts` Chromium |
| Enter / Shift+Enter / Tab / Shift+Tab navigate child / parent / next sibling / previous sibling | Registered directly in `src/canvas/shortcuts.ts` | verified | none | shortcut/unit + `figma-selection-parity.spec.ts` Chromium |
| Shift-click adds an object; Shift-clicking a selected object removes it | Canvas shift-toggle preserves drag semantics and removes on click release | verified | none | CanvasMouseController unit + `figma-selection-parity.spec.ts` Chromium |
| Normal marquee selects objects in an area using the surface/parent selection model | SelectionBox intersects the bridge rect cache, collapses matched ancestry to the topmost selected node, and now recognizes the real transparent canvas input surface as an empty-canvas marquee start target | verified | fixed in Batch 1: real input-surface drags now enter SelectionBox | SelectionBox unit + `figma-selection-parity.spec.ts` Chromium |
| Cmd/Ctrl marquee selects nested layers without requiring their parent | SelectionBox allows Cmd/Ctrl marquee and switches ancestry filtering from containing surfaces to deepest matched layers | verified | fixed in Batch 1: modifier marquee no longer rejects the gesture and no longer returns the containing parent | SelectionBox unit + `figma-selection-parity.spec.ts` Chromium |
| Clicking empty canvas or pressing Escape clears selection | Mouse-up on proven empty canvas clears selection; Escape clears active container + selection after edit-mode exits | pass / chromium pending | empty-canvas click is Chromium-verified; Escape remains unit-covered in this batch | shortcut/controller unit + empty-canvas Chromium coverage |
| Layers-panel click selects a layer | Layers rows route selection through `handleSelect` | pass / chromium pending | none | LayersPanel coverage |
| Layers-panel Shift-click selects the visible row range | `computeRangeSelection` selects the visible range from the plain-click anchor | verified | none | LayersPanel range tests |
| Layers-panel Cmd/Ctrl-click adds/removes individual rows | modifier click routes to additive toggle | verified | none | LayersPanel coverage |
| Locked objects are not selectable through normal canvas left-click | canvas hit-testing excludes a locked node or locked ancestor; Layers remains an explicit selection surface | verified | none | node-ops / lock Playwright coverage |
| Hidden objects are not canvas-selectable | rendered hidden nodes have no selectable painted target | pass / chromium pending | Select-layer-menu semantics are a separate future audit item | existing visibility coverage |
| Hovering a Layers row highlights its canvas location | implementation exists through the Layers hover/highlight path | pending audit | confirm exact parity and preference behavior before claiming pass | pending |
| View-only users can select objects for inspection | field supports viewer selection outlines/properties, but this audit has not yet verified the full Figma selection surface (including marquee) | pending audit | inspect viewer-mode selection paths | pending |

## Batch 2 — hierarchy, reparenting, frames, groups

Official references:

- https://help.figma.com/hc/en-us/articles/360039959014-Parent-child-and-sibling-relationships
- https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups
- https://help.figma.com/hc/en-us/articles/360041539473-Frames-in-Figma-Design

Status: **pending audit**.

Priority behaviors include containment, reparent-on-drag, Space modifier behavior, group bounds derived from children, frame bounds independent from children, nesting, frame-from-selection, and duplication.

## Batch 3 — move, resize, snapping, guides, duplication

Official references:

- https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions
- https://help.figma.com/hc/en-us/articles/360040449713-Add-guides-to-the-canvas-or-frames
- https://help.figma.com/hc/en-us/articles/4409078832791-Copy-and-paste-objects

Status: **pending audit**.

## Batch 4 — Auto Layout and constraints

Official references:

- https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout
- https://help.figma.com/hc/en-us/articles/31351261703063-FD4B-Auto-layout-fundamentals
- https://help.figma.com/hc/en-us/articles/360039957734-Apply-constraints-to-define-how-layers-resize
- https://help.figma.com/hc/en-us/articles/360039957934-Combine-layout-guides-and-constraints

Status: **pending audit**.

## Batch 5 — geometry semantics

Official references:

- https://help.figma.com/hc/en-us/articles/360039957534-Boolean-operations
- https://help.figma.com/hc/en-us/articles/360040450253-Masks

Status: **pending audit**.

## Stage 0 exit rule

Do not mark Stage 0 complete from visual polish alone. The agreed foundational interaction set must have:

1. an explicit Figma-documented behavior row in this matrix;
2. a current field behavior determination;
3. no unresolved foundational `gap` rows;
4. regression coverage for corrected deterministic behavior;
5. real-Chromium coverage for the agreed core interaction flows.
