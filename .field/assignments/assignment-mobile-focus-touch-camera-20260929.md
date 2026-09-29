---
field_assignment: 1
id: mobile-focus-touch-camera-20260929
status: active
branch: field/mobile-focus-touch-camera-20260929
pr: 123
base: 710b02e769c904ff3ab852d095a812e8476e3e79
kit: 2026-09-26.4
type: plan-to-action
execution_class: contract-worker
owned:
  - src/canvas/transform/InputHandler.ts
  - src/canvas/transform/InputHandler.touch.test.ts
  - src/canvas/hooks/useCanvasTransform.ts
  - src/canvas/hooks/useCanvasTransform.touch.test.ts
  - src/canvas/hooks/useCanvasTouchInteraction.ts
  - src/canvas/hooks/useCanvasTouchInteraction.test.ts
  - src/canvas/selection/SelectionBox.tsx
  - src/canvas/mouse/CanvasMouseController.ts
  - src/canvas/Canvas.tsx
approved_shared: []
protected:
  - src/canvas/drag/**
  - src/editor/**
  - src/code/**
  - src/canvas-sandbox/**
  - src/preview/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

# mobile Focus touch editor

## batch 1 — two-finger camera

Implemented on PR #123:
- two fingers own camera pan + pinch
- midpoint movement pans
- finger-distance ratio zooms around the live midpoint
- one finger remains unclaimed by the camera
- touch end/cancel resets ownership
- exact-head build passed at 2fe58a9748cc769034e09ac93604d4a2581433d8
- physical touch runtime QA remains pending

## batch 2 — direct touch arbitration

User-authorized continuation on the same PR.

### goal

Make the existing Focus workspace behave naturally without a mouse:
- tap selects
- one-finger drag on a hit object moves it through existing DragCoordinator behavior
- one-finger drag on empty canvas pans
- empty-canvas tap still deselects
- touch pointer input does not start the desktop marquee
- second finger cancels/reverts one-finger interaction and yields to the two-finger camera gesture
- existing touch resize/transform handles remain independently touchable

### coordination

field-motion-quality protects src/canvas/** but does not own these exact paths. This narrowly scoped touch continuation is explicitly user-authorized and must not change chrome-motion behavior.

Native Scale remains isolated. Do not edit src/canvas/drag/**, src/canvas/scale/**, or ScaleHandles; consume only existing public DragCoordinator APIs.

CanvasMouseController receives only a small cancellation-reset seam so two-finger takeover cannot leave deferred mouse-selection state behind.

### acceptance

1. one tap selects a node
2. one-finger object drag moves it
3. one-finger empty drag pans instead of marquee-selecting
4. one-finger empty tap deselects
5. existing resize handles still receive touch
6. adding a second finger cancels any pending/active one-finger drag before two-finger camera motion begins
7. desktop mouse/trackpad/marquee behavior is unchanged
8. exact-head build passes
9. runtime mobile Preview QA is required before claiming completion
