---
field_assignment: 1
id: focus-camera-hardening
status: active
branch: field/focus-camera-hardening
pr: null
base: 837a1dccc3d50e80f881fdda51ed5d496300ad5d
kit: 2026-09-26.4
type: plan-to-action
execution_class: contract-worker
owned:
  - src/canvas/transform/CameraCommands.ts
  - src/canvas/transform/CameraCommands.test.ts
  - src/canvas/transform/CameraAnimator.ts
  - src/canvas/transform/CameraAnimator.test.ts
  - src/canvas/transform/camera-intent.ts
  - src/canvas/text-edit/text-focus-camera.ts
  - src/canvas/text-edit/text-focus-camera.test.ts
  - src/canvas/Canvas.tsx
  - src/canvas/shortcuts.ts
  - src/editor/controls/InspectorZoomControl.tsx
  - src/editor/BottomToolbar.tsx
approved_shared: []
protected:
  - src/canvas/scale/**
  - src/code/gallery/**
  - src/canvas/gallery/**
  - src/editor/gallery/**
  - src/dashboard/**
  - cloudflare/**
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

# Goal

Hardening pass for the merged field focus-camera/text-session system after final UX review. Preserve the user-approved camera feel while closing three specific edge cases.

# Current verified baseline

- main: `837a1dccc3d50e80f881fdda51ed5d496300ad5d`
- original focus-camera assignment: complete
- active ownership preflight: no active assignment owns the camera/text-focus paths claimed here
- focus camera was visually accepted across all three original batches before merge

# Batch 1 — explicit user camera authority

Make explicit user camera commands interrupt the active text-focus assist just like wheel/trackpad/middle-mouse already do.

Required coverage:
- Shift+1 / Shift+2 / Shift+3
- keyboard zoom in/out
- Inspector Zoom commands
- any other user-facing camera command encountered on the same shared command surface

Architecture:
- use an explicit camera-intent signal at the command/UI boundary
- do not infer intent from transform deltas
- do not classify automatic text follow/restore/system fit as user intent
- preserve current command output/motion exactly

Acceptance:
- while editing text, an explicit user camera command immediately makes that user-selected camera authoritative
- subsequent text growth/caret movement does not pull the camera again during that edit session
- exiting text edit does not restore over the user's explicit camera choice
- normal focus-session behavior remains unchanged without a user command

# Batch 2 — workspace geometry awareness

Re-evaluate the active text-focus safe envelope when usable canvas geometry changes even if text content did not.

Required coverage:
- Inspector/Layers pane open/close/resize where those change usable canvas geometry
- browser/window resize
- existing auto-hide/collapse transitions where observable from the canvas host
- no automatic zoom-in

Architecture:
- observe actual workspace/canvas geometry rather than duplicating pane state
- debounce/coalesce geometry updates through the existing focus-session follow scheduler
- preserve manual interruption authority

Acceptance:
- focused text remains comfortably visible after pane geometry changes
- one quiet correction at most after a geometry change
- if the session has been manually interrupted, workspace changes do not resume automation

# Batch 3 — reduced motion

Make camera motion respect `prefers-reduced-motion: reduce` centrally.

Required behavior:
- suppress transient focus blur
- sharply shorten or instant-set camera transitions while preserving the correct final transform
- do not disable focus/adaptive/caret positioning itself
- no per-caller accessibility forks

Acceptance:
- reduced-motion users still land on the same final camera transforms
- focus blur does not run
- ordinary users retain the currently accepted motion exactly

# Out of scope

- retuning accepted normal-motion timing/easing
- new UI/preferences/branding
- Esc behavior changes
- selection-endpoint follow
- IME/composition changes
- nested scroll-container architecture
- parent/component focus escalation

# Validation

After implementation:
- update focused unit tests where seams exist
- exact diff review
- exact-head Cloudflare branch Preview `npm run build:all`
- one final user visual QA pass
- do not merge without explicit user acceptance

## Ownership extension — 2026-09-29

Source trace found the bottom-toolbar Smart Zoom button as an additional explicit user camera-command surface. `src/editor/BottomToolbar.tsx` is added to this assignment; no active assignment owns that path.
