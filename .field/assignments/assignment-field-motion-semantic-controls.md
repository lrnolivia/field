# assignment-field-motion-semantic-controls.md

---
field_assignment: 1
id: field-motion-semantic-controls
status: active
branch: field/field-motion-semantic-controls
pr: null
base: fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e
kit: 2026-09-26.2
type: plan-to-action
execution_class: contract-worker
owned:
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
approved_shared: []
protected:
  - src/FieldShell.tsx
  - src/field-shell-motion.ts
  - src/field-shell-motion.test.ts
  - src/editor/EditorEntranceCoordinator.tsx
  - src/editor/BottomToolbar.tsx
  - src/editor/PropertiesPanel.tsx
  - src/dashboard/**
  - src/styles/dashboard.css
  - src/styles/field-shell.css
  - src/editor/header/**
  - src/backend/**
  - src/canvas/scale/**
  - src/canvas/selection/ScaleHandles.tsx
  - src/editor/tools/ScaleTool.tsx
  - src/editor/scale-tool.integration.test.ts
  - src/code/stores/tool-store.scale.test.ts
  - src/code/parsing/**
  - src/code/generation/**
  - src/code/groups/**
  - src/code/mutation/**
  - cloudflare/**
  - package.json
  - package-lock.json
  - wrangler.jsonc
qa:
  firecrawl: true
  authenticated: false
---

## Mandatory rehydration

Use Composio exclusively for all GitHub reads and writes.

Read the current repo-hosted handoff kit from `main`, then read this assignment, its mailbox, QA record, current `main`, this assignment branch/PR, and active legacy tracker ownership while migration remains.

Current repo process rules supersede stale process instructions from the source chat.

## Goal

Establish the first canonical `field.MOTION` layer and apply it across shared professional editor controls so field remains visually restrained at rest but feels springy, tactile, inertial, and intentional when touched.

## Why this exists

The user has already established structural motion in field: loading shimmers, Dashboard↔Canvas reveals, panel slides, and toolbar bounce. The next step is to make routine controls share the same authored physical language without turning the editor into a showcase animation surface.

Core rules:

- Everything may respond. Very little should perform.
- Motion lives in the affordance, not the furniture.
- Routine controls animate local glyphs, swatches, thumbs, and disclosure geometry while hit targets and rows remain stable.
- Rare expressive canvas moments belong to later assignments.

## Current verified state

- Current `main` at activation: `fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`.
- Handoff kit: `2026-09-26.2`.
- `motion` is already present in `package.json` at `^12.38.0`.
- Current shared controls use mostly CSS color transitions and one-off hard-coded transform timings.
- `SidebarRow` currently hard-codes a 120ms disclosure rotation.
- `ToolSwitch` currently uses generic 200ms CSS movement.
- `SpacingControl` axis-pair affordances are text arrows (`↔` / `↕`).
- `ColorInput` already has a dedicated `ColorSwatch` child and performance-sensitive live picker behavior that must not regress.
- Active legacy Dashboard handoff ownership currently reserves `src/FieldShell.tsx`, `src/field-shell-motion.ts`, `src/field-shell-motion.test.ts`, and `src/editor/EditorEntranceCoordinator.tsx`; this assignment does not touch them.
- Active Contract Worker ownership does not currently overlap this assignment's owned paths.

## Decisions already made

- Product character: Material 3 Expressive emotion + Apple fluidity/interruptibility + Figma restraint.
- Motion should be bouncy, springy, inertial, spatial, and multi-layered only where warranted.
- Use semantic motion tokens instead of scattered magic durations.
- Prefer true springs for spatial response.
- Prefer CSS/native effects for trivial color/opacity where a Motion component adds no value.
- No package dependency changes.
- Reduced motion remains a first-class contract.
- Editor feedback motion must not serialize into the field design graph, generated source, Preview semantics, or production website.
- Do not alter the still-owned Dashboard↔Canvas handoff in this assignment.

## Implementation intent

Create `src/editor/motion/` as the canonical editor-motion vocabulary using the existing `motion/react` dependency.

Apply the vocabulary to:

1. `AddButton`: animate the plus glyph inside a fixed target.
2. `SidebarRow`: one continuous spring disclosure chevron.
3. `ToolSection`: interruptible user-triggered collapse/expand continuity; no initial-mount theatre.
4. `ToolSwitch`: spring thumb, fast track effect, accessible state.
5. `SpacingControl`: replace text arrows with thin semantic SVGs whose arrowheads move outward in the represented direction on hover and compress on press.
6. `ColorInput` / `ColorSwatch`: tactile local swatch lift/scale inside a stable row without affecting live-picker performance.
7. `RemoveButton`: animate the minus glyph only.
8. `ToolPlusMinus`: semantic plus/minus glyph response inside fixed segmented geometry.
9. `Button`, `ToolButton`, `ControlActionRow`: restrained press feedback where the surface itself is the affordance.

## Acceptance criteria

- [ ] A canonical `field.MOTION` module exists under `src/editor/motion/`.
- [ ] Spatial transitions use semantic spring definitions rather than duplicated arbitrary durations.
- [ ] AddButton keeps its target fixed and animates only its plus glyph.
- [ ] SidebarRow disclosure uses one continuous spring glyph and remains interruptible.
- [ ] ToolSection initial render does not perform; user-triggered collapse/expand has spatial continuity and survives rapid reversal.
- [ ] ToolSwitch thumb uses a real spring and exposes correct accessible pressed state.
- [ ] SpacingControl axis affordances use thin SVG geometry and directional microtravel without moving the containing input.
- [ ] ColorInput makes the swatch tactile without moving the row or regressing live picker behavior.
- [ ] RemoveButton and ToolPlusMinus animate local glyphs only.
- [ ] Base actionable buttons get restrained press response with no layout shift.
- [ ] No touched control loops continuously at rest.
- [ ] Reduced-motion mode removes unnecessary travel/bounce while preserving state feedback.
- [ ] No package manifest changes.
- [ ] No changes outside the owned allowlist.
- [ ] Existing keyboard, disabled, focus, context-menu, tracing, and click semantics remain intact.
- [ ] Relevant tests, TypeScript/static checks, production build, exact changed-path audit, and moving-main reconciliation pass before merge.
- [ ] Runtime QA confirms no clipping, target movement, dropped clicks, stale state, or animation residue after settling.

## Intended ownership

Owned paths are exactly those in frontmatter.

No overlap with the active legacy Dashboard motion assignment is permitted.

## Investigation permitted during implementation

- Tune spring stiffness/damping/mass during visual QA while preserving semantic categories.
- Add small motion-specific tests under `src/editor/motion/**`.
- Add local data attributes needed for QA/testing on already-owned components.
- Choose CSS vs Motion per interaction when semantics and performance remain equivalent.

## Out of scope

- Dashboard↔Canvas choreography.
- Existing dashboard skeleton shimmer.
- editor panel entrance system.
- BottomToolbar entrance/bounce.
- Gallery/component/media insertion hero choreography.
- canvas selection animation.
- origin-aware popover/shared-element transitions.
- authored website/prototype motion.
- package/dependency changes.

## Known traps / prior findings

- Do not move hit targets.
- Do not animate whole inspector rows merely because a child is interactive.
- Do not introduce per-frame React state for hover/press motion.
- Preserve `ColorInput` live-preview fast path.
- Preserve `ToolSection` context-menu behavior and `bare` mode.
- Preserve `SidebarRow` layout dimensions and menu geometry.
- Avoid generic `transition: all` and universal 300ms easing.
- Avoid decorative glow, looping bounce, and toy-like overshoot.

## Validation

- focused motion/control tests
- existing tests covering touched controls
- TypeScript/static checks
- `npm run build:all`
- exact changed-path audit
- moving-main reconciliation before merge
- PR/check inspection on exact head SHA

## Runtime QA

Primary evidence:
- assignment Preview/noauth builder interaction checks for hover, press, disclosure, toggle, spacing, swatch, plus/minus, and rapid reversal behavior.

Secondary evidence:
- source/DOM inspection verifying fixed hit-target geometry and reduced-motion paths.

Human/authenticated QA:
- subjective feel check for “bouncy/springy/inertial but professional” after automated/runtime correctness passes.

## Handoff source

- Current field companion chat, 2026-09-26.
- User direction: refine existing intentional structural motion, then work in big motion patches; fix blockers in the way.
- Earlier motion research/specification in the same chat.

## Completion contract

- implementation remains on `field/field-motion-semantic-controls`
- do not push implementation directly to `main`
- update this assignment's mailbox and QA record
- record QA against exact tested branch/main SHAs
- merge only after the current merge gate passes
- separate structural/canvas/popover follow-up work gets a new unique assignment
