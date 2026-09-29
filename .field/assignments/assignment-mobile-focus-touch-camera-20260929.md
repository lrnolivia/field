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
approved_shared: []
protected:
  - src/canvas/drag/**
  - src/canvas/mouse/**
  - src/canvas/selection/**
  - src/canvas/Canvas.tsx
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

# mobile Focus touch camera — hourly batch 1

## goal

Add a deterministic first-class mobile camera gesture seam to the existing Focus canvas without changing desktop mouse/trackpad behavior or redesigning the mobile shell.

## verified current state

- Focus is already usable in phone portrait/landscape and is the mobile workspace direction.
- Existing InputHandler had an empty touch-state scaffold.
- useCanvasTransform attached wheel and middle-mouse camera listeners, but no native mobile touch camera listener.
- user-observed current behavior: single-finger drag becomes marquee; resize/select already work; two-finger camera pan was absent.
- active legacy ownership check found no active Owned reservation on these four paths.
- active toolbar/media work remains isolated; this batch does not touch BottomToolbar or editor media/chrome surfaces.

## implemented

- two-finger camera ownership begins only when a second finger is present
- midpoint movement pans the camera
- finger-distance ratio applies multiplicative pinch zoom around the live midpoint
- one-finger gestures remain unclaimed by the camera
- 3→2 touch transitions rebase to prevent jumps
- touchend/touchcancel reset camera ownership
- native listeners are non-passive only for the owned two-finger camera gesture
- focused touch geometry and attachment tests were added

Implementation head: 2fe58a9748cc769034e09ac93604d4a2581433d8

## acceptance status

1. Two-finger pan implementation: CODED / RUNTIME QA PENDING
2. Pinch around midpoint: CODED / RUNTIME QA PENDING
3. Combined pan+pinch: CODED / RUNTIME QA PENDING
4. End/cancel reset: CODED / focused test added
5. One finger not stolen: CODED / focused test added
6. Existing desktop input paths: unchanged in implementation; exact-head build PASS
7. New touch tests: ADDED, not executed in Contract Worker environment
8. exact-head Cloudflare build: PASS
9. physical mobile Preview verification: PENDING

## non-goals

No object move semantics, long-press marquee, text-keyboard entry, toolbar collapse, sheets, Inspector, source model, backend, deployment, or dependency changes.
