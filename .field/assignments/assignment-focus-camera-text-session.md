---
field_assignment: 1
id: focus-camera-text-session
status: active
branch: field/focus-camera-text-session
pr: 60
base: edc43eb951f5077e5e0ea58904f7ab95122e81df
kit: 2026-09-26.4
type: plan-to-action
execution_class: contract-worker
owned:
  - src/canvas/transform/CameraCommands.ts
  - src/canvas/transform/CameraCommands.test.ts
  - src/canvas/text-edit/text-focus-camera.ts
  - src/canvas/text-edit/text-focus-camera.test.ts
  - src/canvas/text-edit/CanvasTextEditController.ts
  - src/canvas/shortcuts.ts
  - src/canvas/Canvas.tsx
  - src/editor/LayersPanel.tsx
approved_shared: []
protected:
  - src/canvas/scale/**
  - src/code/gallery/**
  - src/canvas/gallery/**
  - src/editor/gallery/**
  - src/editor/tools/SelectionTool.tsx
  - src/dashboard/**
  - cloudflare/**
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

# Mandatory rehydration

Use Composio exclusively for GitHub reads and writes. Read current main, field/control, this assignment, mailbox, QA record, active ownership, and exact branch/PR state before each material batch.

# Goal

Turn field's existing camera commands and newer focus UI into one coherent focus-camera system, then extend the text-edit session so the camera gracefully keeps growing text and the active caret in view.

# Why this exists

field already has established camera commands including Shift+1 Zoom to fit, Shift+2 Zoom to selection, Shift+3 Zoom to 100%, zoom in/out, and center-focused-object. Newer double-click, target/locate, Inspector, and text-edit interactions should reuse those mechanics instead of maintaining parallel focus math.

# Current verified state

- main baseline: edc43eb951f5077e5e0ea58904f7ab95122e81df
- Shift+1/2/3 are registered in src/canvas/shortcuts.ts and route through src/canvas/transform/CameraCommands.ts.
- CameraCommands already centralizes fit/pan behavior.
- CameraAnimator is the shared animation chokepoint and provides the current smooth D3 focus motion + transient iframe blur.
- TextFocusCamera separately owns edit-session snapshot/restore and currently duplicates some node focus/scale math before calling the shared animator.
- active control-plane ownership does not currently claim the owned paths above.

# Decisions already made

- Preserve the existing Shift+ camera family. Do not special-case only Shift+2.
- Keep distinct interaction semantics even when mechanics are shared.
- Preserve the current focus animation and blur treatment unless implementation evidence proves consolidation requires a tiny compatibility adjustment.
- Text editing is a focus session, not merely another shortcut.
- Automatic text follow may zoom out while typing, but must never zoom in automatically.
- Manual user pan/zoom wins over automation.
- User will perform visual QA after each batch.

# Implementation intent

## Batch 1 — canonical focus camera

Trace all relevant focus entry points and route their shared camera mechanics through one canonical focus primitive. Cover the existing Shift+ family and newer double-click/target/Inspector/text focus paths without flattening their semantics. Remove duplicated text-focus fit math where practical while retaining TextFocusCamera's session snapshot/restore responsibility.

## Batch 2 — adaptive text focus

Observe live edited-text bounds against a padded safe viewport envelope. When growth crosses the envelope, gently pull back only as much as needed. Add hysteresis/dead-zone, respect text sizing/layout semantics where the runtime exposes them, and suspend/cancel automatic correction after deliberate manual camera movement.

## Batch 3 — caret + session polish

When the text object becomes too large for useful whole-object fitting, keep the active line/caret comfortably visible instead of zooming out forever. Polish direct transitions between nearby text targets, restoration/cancel rules, surrounding layout context, and text-editing chrome.

# Acceptance criteria

## Batch 1

- [ ] Shift+1, Shift+2, Shift+3 behavior remains intact.
- [ ] Existing zoom in/out and center-focus behavior remains intact.
- [ ] Newer UI focus entry points use canonical shared camera mechanics rather than independent fit math where practical.
- [ ] TextFocusCamera retains pre-edit camera snapshot/restore and manual-interruption semantics.
- [ ] Existing D3 focus motion and blur remain visually unchanged.
- [ ] Focused camera tests cover the canonical path and text-session delegation.

## Batch 2

- [ ] Growing text remains inside a comfortable viewport envelope.
- [ ] Auto behavior only pulls back; it never zooms in while typing.
- [ ] Small line-count changes do not cause camera pulsing/jitter.
- [ ] Fixed-size text avoids unnecessary camera movement.
- [ ] Fixed-width/auto-height growth primarily accommodates vertically where geometry permits.
- [ ] Manual pan/zoom prevents the automatic camera from fighting the user.

## Batch 3

- [ ] Oversized text follows the active caret/line instead of endlessly zooming out.
- [ ] Nearby text-to-text focus transitions are spatially continuous.
- [ ] Deliberate exit restores the expected pre-session camera when not manually interrupted.
- [ ] Manual camera changes remain authoritative.
- [ ] The finished system behaves as one camera system rather than stacked independent zoom features.

# Intended ownership

Owned paths are limited to the camera/text-focus implementation and the known Layers/Canvas wiring surfaces above. If an Inspector or target-icon entry point lives in a path owned by another active assignment, do not trespass: prove the existing shared event/command is sufficient or request explicit shared ownership.

# Investigation permitted during implementation

- Search current main for TextFocusCamera, panToNode, zoomToFitSelection, focus/locate events, layer double-click handlers, Inspector double-click focus, and target/crosshair handlers.
- Read additional files needed to trace those call paths.
- Add narrowly-scoped tests adjacent to owned implementation files.

# Out of scope

- parent/component focus escalation
- minimaps/context ghosts
- text metrics/count overlays
- new branded focus UI
- general Canvas refactors
- Scale, Gallery, Dashboard, deployment, routing, dependency upgrades, or unrelated cleanup

# Known traps / prior findings

- Camera movement has viewport/variant prefix handling; preserve it.
- Camera fit already accounts for floating/docked workspace insets.
- Text focus currently retries for a rect after new text insertion.
- Canvas wheel during text editing currently marks the focus session interrupted; chrome wheel does not.
- Do not replace the current focus animation with a new animation system.

# Validation

After each batch:
- focused Vitest coverage for changed camera/text-focus behavior
- inspect exact changed paths
- inspect CI/check state on the exact PR head
- exact-sha branch Preview runtime QA is required for final closeout; user visual QA is the primary acceptance for camera feel

# Runtime QA

Primary evidence:
- exact PR head SHA
- branch Preview at /builder/noauth
- user visual QA exercising Shift+1/2/3, double-click/target/Inspector/text entry and the batch-specific behaviors

Human QA:
- required after each batch before treating visual feel as accepted

# Handoff source

User conversation on 2026-09-28/29: text zoom QOL planning, inherited Shift+ camera family discovery, and approved three-batch implementation plan.

# Completion contract

- implementation remains on field/focus-camera-text-session
- do not push implementation directly to main
- update this assignment, its mailbox, and QA record with exact branch/PR/SHA evidence
- final merge only after exact-sha validation and the user's visual QA

## Batch 1 implementation checkpoint — 2026-09-29

Implementation branch head under visual QA: `63f514b464c2e83f19f3c966c18ea08252b12dd3`.
Draft PR: #60.

Changed implementation paths:
- `src/canvas/transform/CameraCommands.ts`
- `src/canvas/transform/CameraCommands.test.ts`
- `src/canvas/text-edit/text-focus-camera.ts`
- `src/canvas/text-edit/text-focus-camera.test.ts`

Batch 1 result:
- added canonical `focusScreenRect(..., profile)` camera framing in `CameraCommands`
- existing layer/canvas double-click callers remain routed through `panToNode(..., true)`
- Inspector Zoom remains a UI surface over the established Shift+ camera commands
- `TextFocusCamera` now delegates initial framing to the canonical camera primitive while retaining snapshot/restore, retry, and interruption semantics
- `CameraAnimator` was not changed; the established D3 focus animation and transient iframe blur chokepoint remain intact
- Shift+1/2/3 and zoom in/out callers were not rewritten
- source trace corrected one earlier assumption: the Selection Colors crosshair/target action is locate-only; its contract intentionally does not move selection or camera, so it remains outside this camera assignment

Exact-head Cloudflare evidence:
- Workers Build: `ef426e06-80a8-437f-988a-f5f4ecfd56e4`
- commit: `63f514b464c2e83f19f3c966c18ea08252b12dd3`
- branch: `field/focus-camera-text-session`
- source: push_event
- build command: `npm run build:all`
- deploy command: `npx wrangler preview`
- outcome: success
- branch Preview: `https://field-focus-camera-text-session.canvas-preview.loew.fi/builder/noauth`

Focused Vitest files were added/updated, but no repository test executor is exposed in this Contract Worker chat and GitHub has no check runs for this repository. Do not mark those tests as executed. User visual QA is pending and is the Batch 1 stop gate.

## Batch 1 visual QA — PASS

User accepted Batch 1 visual QA on 2026-09-29: "works great!". Batch 1 is visually accepted and Batch 2 is authorized to start.
