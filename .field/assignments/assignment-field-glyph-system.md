# assignment-field-glyph-system.md

---
field_assignment: 1
id: field-glyph-system
status: active
branch: field/field-glyph-system
pr: null
base: 4b368eefdb75707efc3a6f94c759cccac8a78e90
kit: 2026-09-26.4
type: follow-up
execution_class: contract-worker
owned:
  - src/editor/glyph/**
  - src/editor/motion/**
  - src/design-system/AddButton.tsx
  - src/design-system/Button.tsx
  - src/design-system/SidebarRow.tsx
  - src/editor/controls/ControlActionRow.tsx
  - src/editor/controls/ColorSwatch.tsx
  - src/editor/controls/ColorInput.tsx
  - src/editor/controls/RemoveButton.tsx
  - src/editor/controls/SpacingControl.tsx
  - src/editor/controls/ToolButton.tsx
  - src/editor/controls/ToolPlusMinus.tsx
  - src/editor/controls/ToolSection.tsx
  - src/editor/controls/ToolSwitch.tsx
  - src/editor/controls/InspectorObjectHeader.tsx
  - src/editor/LayersPanel.tsx
  - src/editor/LayersPanel/rows.tsx
  - src/editor/tools/InteractionsTool.tsx
  - src/editor/tools/LayoutTool.tsx
  - src/editor/tools/CursorTool.tsx
  - src/editor/tools/CursorTool/cursor-icons.tsx
  - src/editor/tools/PositionTool/AlignmentControl.tsx
  - src/editor/tools/PositionTool/PinControl.tsx
  - src/editor/tools/StylesTool/InspectorSectionActions.tsx
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/header/LeftHeader.tsx
  - src/editor/header/ExportDropdown.tsx
  - package.json
  - package-lock.json
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/**
  - src/editor/gallery/**
  - src/editor/tools/GalleryTool.tsx
  - src/editor/ui/ImageSearchModal.tsx
  - src/code/gallery/**
  - src/canvas/gallery/**
  - src/canvas/scale/**
  - src/canvas/selection/ScaleHandles.tsx
  - src/editor/tools/ScaleTool.tsx
  - src/editor/BottomToolbar.tsx
  - src/editor/PropertiesPanel.tsx
  - src/FieldShell.tsx
  - src/editor/EditorEntranceCoordinator.tsx
  - src/canvas/**
  - src/preview-sandbox/**
  - src/backend/**
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/mutation/**
  - cloudflare/**
  - wrangler.jsonc
qa:
  browser_preview: true
  authenticated: false
---

## Goal

Create `field.GLYPH`, the semantic interactive-glyph layer, and make motion pervasive across the owned editor chrome rather than sparse.

Within every owned surface, clickable glyph coverage is exhaustive: each interactive glyph receives a semantic response, a state morph when meaning changes, or an explicit still exemption with a reason.

## Product rules

- `field.MOTION` remains the physics/token layer.
- `field.GLYPH` owns semantic glyph response and state transitions.
- Hover/touch should make clickable glyphs feel alive.
- Press should feel tactile and interruptible.
- Stateful glyphs transform into their counterpart when meaning changes.
- Surrounding row/button/hit-target geometry remains stable.
- Motion remains editor feedback and never serializes into authored website state.

## Library decision

- Use `morphicons` behind field-owned wrappers for true stroke-path state morphs.
- Researched activation version: `1.7.1`, MIT, zero runtime dependencies, React + custom stroke icon data supported.
- No direct `morphicons` imports outside `src/editor/glyph/**`.
- Do not add `@animateicons/react` in this tranche; use it only as choreography reference.
- Preserve field's existing/custom SVG language; no wholesale Lucide migration.

## Semantic behaviors

Reactive: plus open/rotate, minus compress, eye blink, gear partial turn, arrows nudge directionally, alignment/distribution shift, copy sheet separation, ellipsis pulse, pin push, restrained delete feedback.

State morphs: chevron right/down, eye/eye-off, lock/unlock, pin/unpin, plus/minus or plus/close where the underlying state truly changes.

Never invent a state morph when product state does not change.

## Implementation intent

1. Add `src/editor/glyph/**` with `FieldGlyph`, `FieldMorphGlyph`, semantic behavior tokens/registry, field-owned morph icon data, reduced-motion behavior, and focused tests.
2. Add `morphicons` only if package-lock integrity can be maintained without unrelated churn.
3. Refactor Tranche 1 controls onto the glyph layer where appropriate.
4. Sweep every clickable glyph in the owned high-density surfaces; no hero-only implementation.
5. Keep third-party implementation details behind field-owned wrappers.

## Coverage floor

- at least 8 distinct editor surfaces migrated
- at least 25 interactive glyph instances covered
- all interactive glyphs in each touched owned surface covered
- at least 4 real state-morph pairs exercised in runtime when those states exist

The floor is not a quota to stop at.

## Runtime QA

Exact branch Preview `/builder/noauth`: Canvas health preflight; representative hover/press families; rapid reversal; state morphs; keyboard activation; reduced motion; no hit-target movement, clipping, stuck transforms, or persistent authored changes.

## Completion

Exact-head Cloudflare Preview PASS, focused glyph tests PASS, package/lock audit PASS, changed-path ownership PASS, browser runtime QA PASS, exact-SHA merge-gate refresh.

If the user still says the editor feels sparse, that is a coverage failure.