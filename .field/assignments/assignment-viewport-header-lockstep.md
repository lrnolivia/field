---
field_assignment: 1
id: viewport-header-lockstep
status: active
branch: field/viewport-header-lockstep
pr: null
base: 824a88e78f36d8c86b366a7841c9ad29def13e03
kit: 2026-09-26.4
type: repair
execution_class: contract-worker
owned:
  - src/canvas/ViewportHeaderManager.ts
  - src/canvas/ViewportHeaderManager.test.ts
  - src/canvas/hooks/useCanvasTransform.ts
  - src/canvas/hooks/useRendererSync.ts
  - src/canvas-sandbox/bridge-sandbox.ts
  - src/canvas-sandbox/bridge-sandbox-camera.test.ts
approved_shared: []
protected:
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - src/editor/**
  - src/dashboard/**
qa:
  browser_preview: true
  authenticated: false
---

# viewport header lockstep

## Mandatory rehydration
Read the current loew-runner Bible/manifest, field AGENTS.md, current handoff kit, this assignment, mailbox, QA record, current main/head state, and the exact owned source before modifying code.

## Goal
Fix the Design canvas viewport header so it is visually locked to the viewport/artboard during pan/zoom and does not appear before the viewport content is actually ready on a fresh load or file switch.

## Why this exists
Live user report and screenshot show the black `Desktop 1440` viewport header moving on a different visual clock from the iframe-rendered viewport, letting the viewport animate behind its own header. A second symptom is an orphan header appearing before the actual canvas content on fresh load.

## Current verified state
- main preflight SHA: `824a88e78f36d8c86b366a7841c9ad29def13e03`
- viewport headers are parent-frame chrome in `ViewportHeaderManager.ts`
- `useCanvasTransform.ts` currently registers the viewport-header overlay with the parent `TransformManager`
- camera transforms are also forwarded to the sandbox iframe
- sandbox camera messages are coalesced through an additional iframe `requestAnimationFrame`
- viewport header rendering has a config-position fallback when live bridge geometry is not yet available
- `iframeRenderTick` increments only after sandbox `renderComplete`
- current active `field-motion-quality` assignment explicitly protects `src/canvas/**`; completed legacy camera/Inspector reservations do not constitute active ownership

## Decisions already made
- Do not mask this with timing constants, arbitrary delay, or a cosmetic offset.
- Keep one authoritative camera transform: `TransformManager`.
- The viewport header and viewport must consume the same camera sample per frame.
- Header readiness belongs to the rendered viewport lifecycle; no header-only first paint.
- Preserve the cross-origin sandbox architecture and current camera fast path.

## Implementation intent
1. Remove the guaranteed extra frame of sandbox camera latency: parent camera updates are already RAF-batched, so the sandbox should apply the received latest camera sample directly rather than scheduling a second RAF.
2. Stop letting the viewport-header overlay race ahead of camera transport. In the parent transform subscriber, forward the exact camera sample to the sandbox first, then apply that same sample to the header overlay and update header geometry. Do not maintain a second camera state.
3. Remove viewport-config fallback header creation when bridge geometry is absent.
4. Gate/re-render headers from actual sandbox render readiness, including clearing old/orphan headers on file switch.
5. Add focused regressions for the changed timing/readiness contracts.

## Acceptance criteria
- Slow and rapid pan in every direction: header remains visually attached to the viewport top edge; viewport never slides behind a detached header.
- Zoom in/out: same attachment; label/button sizing remains correct.
- Fit/recenter and pane-induced camera changes do not create a one-frame header lead.
- Fresh load: no viewport header appears before the first real rendered viewport geometry.
- File/page switch: no old/config-only header flashes before the new viewport renders.
- No duplicate camera state is introduced.
- Existing viewport header drag/edit actions continue to work.
- Focused tests pass.
- `npx tsc --noEmit --pretty false` passes.
- `npm run build:all` passes.
- Exact PR head receives a successful Cloudflare branch Preview and browser-driven runtime QA at `/builder/noauth` exercising pan, zoom, and fresh-load behavior.

## Investigation permitted
A narrowly scoped source trace within the owned files and immediately adjacent camera/render lifecycle code is allowed when required to preserve behavior.

## Out of scope
- editor chrome motion redesign
- Cloudflare routing/Access changes
- Preview architecture changes
- unrelated canvas input behavior
- dependency upgrades
- broad refactors

## Known traps
- The parent bridge projects cached rects through its latest camera transform, so a parent header overlay can visually lead an iframe that has not painted that transform yet.
- The raw camera fast path was created to avoid Comlink backlog; preserve one-way transport.
- `renderComplete` follows the sandbox render/measurement path and is the appropriate readiness boundary; `sandboxReady` alone is not a rendered viewport.
- Do not reintroduce a second RAF under another name.

## Validation
Focused regression tests for camera application/readiness, TypeScript, `npm run build:all`, PR checks, then exact-SHA branch Preview browser QA.

## Completion contract
Complete only after implementation is on the assignment branch, Draft PR exists, deterministic validation passes, exact PR-head runtime QA passes, control records are updated, merge gate is refreshed against current main/head, and the PR is merged if all required gates remain satisfied.
