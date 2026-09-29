---
field_assignment: 1
id: field-motion-quality
status: active
branch: field/field-motion-quality
pr: null
base: a445ee8e7acd484603fb97204ac96c5db186ed60
kit: 2026-09-26.4
type: plan-to-action
execution_class: contract-worker
owned:
  - src/FieldShell.tsx
  - src/styles/field-shell.css
  - src/editor/motion/**
  - src/editor/ChromeIslands.tsx
  - src/editor/FloatingLeftPanelHost.tsx
  - src/editor/ToolbarPanelHost.tsx
protected:
  - src/editor/editor-entrance.ts
  - src/field-shell-motion.ts
  - src/canvas/**
  - src/dashboard/**
  - src/code/gallery/**
  - src/canvas/gallery/**
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

# Goal

Make field chrome motion consistently smooth, interruptible, judder-resistant, and accessibility-correct without changing the accepted product language or adding another animation runtime.

Gold-standard references, read-only for this assignment:
- editor/dashboard structural spring + directional motion blur
- accepted focus-camera motion + reduced-motion behavior

# Baseline findings

Current field already ships:
- motion 12.38
- semantic field.MOTION controls
- custom structural spring sampling
- directional horizontal/vertical motion-blur filters
- reduced-motion handling in some motion surfaces

Primary quality gap:
- newer semantic/structural motion coexists with older ad-hoc CSS width/height/translate transitions and pointermove -> React/Jotai state loops
- some surfaces therefore have correct easing but still expose layout/reflow or main-thread judder
- optical blur should be a finishing layer, never a substitute for frame pacing or geometric continuity

# Batch 0 — motion observatory

Create a deterministic chrome-motion scenario registry and diagnostics vocabulary for:
- left pane open/close
- docked/floating/compact workspace changes
- inspector appear/detach/reposition
- toolbar panel open/peek/drag/resize
- settings/large overlays (inventory only in this assignment unless ownership expands)
- dashboard/editor + focus-camera as reference scenarios

Classify failures:
- perceptual judder
- main-thread jank
- paint/filter cost
- geometric discontinuity
- reduced-motion mismatch

No production visual change required in this batch.

# Batch 1 — consolidate field.MOTION policy

Extend the existing semantic motion layer; do not create a competing system.

Required concepts:
- structural / morph / optical roles alongside existing response/glyph/toggle/etc
- one reduced-motion policy consumable by Motion, WAAPI, and CSS-backed chrome
- normal-mode timings already accepted elsewhere stay unchanged
- no blanket transition-all / will-change / blur

# Batch 2 — structural chrome morphs

Targets:
- ChromeIslands
- FloatingLeftPanelHost

Goals:
- geometry changes read as one physical object transforming, not layout snapping under a translate
- prefer transform/layout projection semantics for automated morphs
- keep text sharp; position-only/crossfade content rather than scaling glyphs
- preserve interruptibility
- no pointer-attached blur

# Batch 3 — direct manipulation frame pacing

Targets:
- FloatingLeftPanelHost resize
- ToolbarPanelHost drag/resize

Goals:
- coalesce pointer movement to requestAnimationFrame
- mutate transient visual geometry imperatively/CSS variables during drag
- commit durable React/Jotai state at pointer-up
- avoid per-pointermove React/Jotai renders when feasible
- direct manipulation stays pixel-attached with no blur

# Batch 4 — optical motion polish

Generalize the existing directional blur language into field.MOTION optical helpers.

Rules:
- velocity/phase-aware, not always-on blur
- blur resolves before visual rest
- text is sharp by default
- blur may affect wrapper/snapshot/surface, not live text when avoidable
- normal mode only
- reduced motion disables blur

# Batch 5 — secondary chrome pilot

Target ToolbarPanelHost automated open/peek/restore states.
Do not expand into every menu/popover in one PR.

Goals:
- frequent utility chrome stays fast
- meaningful morphs gain continuity
- background/backdrop effects do not become a paint bottleneck
- no new design language

# Batch 6 — certification

Validate exact branch head:
- npm run build:all
- focused unit tests if executable
- branch Preview
- normal motion visual QA
- 60/120Hz subjective QA checklist
- reduced-motion QA
- no merge without explicit user acceptance

# Out of scope

- retuning dashboard/editor entrance choreography
- retuning accepted focus-camera motion
- View Transitions as the primary editor chrome engine
- new animation dependency
- GSAP/react-spring migration
- global text-morph effects
- blanket blur on moving text
- unrelated chrome redesign
