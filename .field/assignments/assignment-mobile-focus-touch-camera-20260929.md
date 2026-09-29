---
field_assignment: 1
id: mobile-focus-touch-camera-20260929
status: active
branch: field/mobile-focus-touch-camera-20260929
pr: null
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
- Existing InputHandler has an empty touch-state scaffold.
- useCanvasTransform currently attaches wheel and middle-mouse camera listeners, but no native mobile touch camera listener.
- user-observed current behavior: single-finger drag becomes marquee; resize/select already work; two-finger camera pan is absent.
- active legacy ownership check found no active Owned reservation on these four paths. native-scale-tool-20260926 protects drag and owns scale-specific paths; this batch does not cross them.
- open toolbar/media PRs exist; this batch does not touch BottomToolbar or editor media/chrome surfaces.

## implementation intent

Implement two-finger touch camera pan + pinch zoom on the canvas through InputHandler and useCanvasTransform.

Gesture contract for this batch:
- one touch: not claimed by camera; existing selection/marquee behavior remains untouched for now
- second touch: camera acquires the gesture
- two-finger midpoint movement pans
- two-finger distance change zooms around the current midpoint
- browser page pinch/scroll must be prevented only while the canvas owns the two-touch gesture
- pointer/mouse/trackpad behavior remains unchanged
- touch teardown/cancel must fully reset state

Do not implement object move semantics, long-press marquee, text-keyboard entry, toolbar collapse, or sheets in this assignment. Those are successor batches.

## acceptance

1. Two fingers on the canvas can pan without browser-page scrolling.
2. Pinch changes canvas scale around the gesture midpoint.
3. Combined two-finger pan+pinch works in one gesture.
4. Releasing/canceling either touch does not leave camera interaction stuck.
5. A one-finger gesture is not stolen by the new camera listener.
6. Existing wheel/trackpad/middle-mouse tests remain green.
7. New focused touch tests cover midpoint pan, multiplicative pinch, transition into two-touch camera ownership, and reset.
8. TypeScript/build checks pass.
9. Runtime QA is performed against the exact PR head Preview before completion.

## non-goals

No toolbar, inspector, panel, drag, selection, source-model, backend, deployment, or dependency changes.
