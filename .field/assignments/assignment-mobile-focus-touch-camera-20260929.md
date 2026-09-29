---
field_assignment: 1
id: mobile-focus-touch-camera-20260929
status: active
branch: field/mobile-focus-touch-camera-20260929
pr: 123
base: 64888da072282562aefe7e1d2d8e38e77eb42861
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
  - src/editor/BottomToolbar.tsx
  - src/editor/mobile-toolbar.test.ts
  - src/App.tsx
  - src/editor/FloatingLeftPanelHost.tsx
  - src/editor/ToolbarPanelHost.tsx
  - src/editor/mobile-workspace-presentation.ts
  - src/editor/mobile-workspace-presentation.test.ts
  - src/editor/left-toolbar/LeftMenu.tsx
  - src/editor/left-toolbar/LeftPanel.tsx
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

# mobile Focus editor — 24-hour implementation track

## product contract

Focus is the mobile workspace. Do not create a mobile editor fork.

The phone editor shares field's document graph, selection model, commands, undo history, source, Preview, and existing editor panels. Mobile changes presentation and touch interaction only.

Portrait uses compact floating chrome. Landscape preserves the accepted traditional Focus layout unless geometry proves otherwise.

## batch 1 — two-finger camera

Implemented:
- two fingers own canvas camera pan + pinch
- midpoint movement pans
- finger-distance ratio zooms around the live midpoint
- one finger remains available to direct manipulation
- touch end/cancel resets ownership
- 3→2 touch transition rebases to avoid a camera jump

## batch 2 — one-finger direct manipulation

Implemented:
- tap routes through canonical canvas selection
- one-finger hit-object drag reuses existing DragCoordinator behavior
- one-finger empty-canvas drag pans after a small threshold
- empty-canvas tap still deselects
- touch no longer begins desktop marquee
- second finger cancels/reverts pending or active one-finger drag before camera takeover
- resize/transform child targets remain independently touchable
- mouse/trackpad/marquee semantics remain unchanged

Coordination:
- do not edit src/canvas/drag/** or native Scale internals
- field-motion-quality protects src/canvas/** but does not own these exact touch paths; this narrow user-authorized continuation must not alter chrome-motion behavior

## batch 3 — narrow portrait toolbar

Implemented:
- <=600 CSS px collapses BottomToolbar to one floating active-tool launcher
- launcher expands the existing toolbar command surface
- safe-area-aware bottom offset
- active tool glyph remains visible while collapsed
- direct tool selection closes the compact palette
- wider/landscape Focus keeps the accepted traditional toolbar
- width/geometry drives presentation; no phone-model detection
- command semantics and recent Media/Library behavior remain shared

## batch 4 — software keyboard bridge

Implemented:
- canonical double-tap text-edit path remains unchanged
- touch layer detects when the second tap synchronously enters text edit
- a temporary tiny parent-frame textarea receives focus during that trusted touch event
- sandbox TipTap autofocus then takes over the already-open software keyboard
- no persistent mobile keyboard or duplicate text editor is introduced

## current checkpoint

Current branch head after latest-main sync:
c7daa52ead88abe698f640746640b2046bd68ac6

Exact-head validation:
- Workers Builds: field — PASS
- Media tests + editor build — PASS

Runtime mobile QA:
PENDING. Do not claim physical-phone success until verified.

Branch Preview:
https://field-mobile-focus-touch-camera-20260929.canvas-preview.loew.fi/builder/noauth

## blocked / next

Mobile sheet presentation is architecturally ready to reuse existing compact/floating hosts, but the exact panel-host files are currently owned by active field-motion-quality work:
- src/App.tsx
- src/editor/FloatingLeftPanelHost.tsx
- src/editor/ToolbarPanelHost.tsx
- src/editor/PropertiesPanel.tsx
- src/editor/ChromeIslands.tsx

Do not edit through that ownership. Recheck each hourly batch. When released:
- narrow compact left panel -> bottom sheet
- narrow toolbar-origin panels -> bottom sheet
- narrow Inspector -> bottom sheet
- landscape/wide Focus -> floating edge overlays

## batches 5–6 + ownership transfer — 2026-09-29

- batch 5: empty-canvas long press enters canonical SelectionBox marquee; normal empty drag remains pan.
- batch 6: stationary object long press opens the canonical context menu; movement preserves direct drag.
- exact head 213646f5273908bad9658aa3794a3c75440c2056: Workers build PASS; Media tests + editor build PASS.
- branch Preview runtime QA is blocked by a shared branch-preview blank-state also reproduced on unrelated green PR #124; production main renders.
- user designated this worker as sole continuing worker. src/App.tsx, src/editor/FloatingLeftPanelHost.tsx, and src/editor/ToolbarPanelHost.tsx are transferred here for the adaptive panel batch.

Next:
- portrait left/Insert/Library/Inspector surfaces -> bottom sheets
- landscape phone -> edge-anchored floating overlays
- regular/wide workspace -> preserve existing presentation
- reuse existing panel content; no mobile fork

## ownership extension — mobile Focus profile

The sole-worker directive also transfers src/editor/left-toolbar/LeftMenu.tsx
and assigns src/editor/left-toolbar/LeftPanel.tsx so phone geometry can present
Focus behavior without rewriting the user's persisted desktop workspace mode.
The implementation must derive an effective mobile presentation only; desktop
workspace preferences remain untouched.
