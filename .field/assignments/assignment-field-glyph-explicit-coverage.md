# assignment-field-glyph-explicit-coverage.md

---
field_assignment: 1
id: field-glyph-explicit-coverage
status: active
branch: field/field-glyph-explicit-coverage
pr: null
base: 769dd5dc0148ff94547d51e56196262139611a3f
kit: 2026-09-26.4
type: follow-up
execution_class: contract-worker
owned:
  - src/editor/tools/CursorTool/cursor-icons.tsx
  - src/editor/tools/CursorTool/cursor-picker-grid.tsx
  - src/editor/tools/OverlayTool.tsx
  - src/editor/ui/VariableModal.tsx
  - src/editor/tools/AnimationTool/AddEffectDropdown.tsx
  - src/editor/overlays/settings-shared.tsx
  - src/editor/agent/AgentChat.tsx
  - src/editor/agent/ChangesCard.tsx
  - src/editor/tools/AnimationTool/css/KeyframeSheet.tsx
  - src/editor/tools/AnimationTool/popups/OverlayAppearPopup.tsx
  - src/editor/ui/ColorPicker.tsx
  - src/editor/ui/PresetPicker.tsx
  - src/editor/ui/FontFamilyPopup.tsx
  - src/editor/ui/SearchableDropdown.tsx
  - src/editor/tools/SelectionTool.tsx
  - src/editor/tools/ScrollSectionTool.tsx
  - src/editor/tools/ExportTool.tsx
  - src/editor/CodeEditor.tsx
approved_shared: []
---

## Goal

Explicitly animate every remaining visible interactive glyph in field in concrete batches of 25–50. The universal app-shell fallback from PR #41 is a safety net and does not count as completion for an icon.

## Batch contract

- 25–50 concrete glyphs per batch.
- Commit every completed batch before starting the next.
- Prefer semantic morphs when meaning/state changes.
- Generic action response uses shared field.GLYPH transforms.
- Preserve FigUI 3 intentional toolbar rearrangements.
- No per-icon React hover state, pointer-listener fanout, per-icon rAF loops, layout-property animation, persistent will-change, or interaction-path layout reads.
- Morphicons only for true state transitions.
- Reduced motion remains supported.
- Do not edit paths owned by other active assignments.

## Current batches

- Batch 1: 36 cursor picker glyphs.
- Batch 2: 25 explicit glyph sites across agent, variable, overlay, animation-add, and settings surfaces.
- Batch 3 planned: 34-SVG cluster across animation keyframe/appear UI, ColorPicker, PresetPicker, FontFamilyPopup, SearchableDropdown, SelectionTool, ScrollSectionTool, ExportTool, and CodeEditor.
