---
field_mailbox: 1
id: mobile-focus-touch-camera-20260929
assignment: mobile-focus-touch-camera-20260929
---

# mobile Focus editor mailbox

## 2026-09-29 — activation

User authorized a 24-hour mobile Focus implementation track in hourly batches using Composio.

## batch 1

Draft PR #123 opened. Two-finger native camera pan/pinch implemented and exact-head Workers build passed.

## batch 2

One-finger direct manipulation implemented:
tap select, object drag, empty-canvas pan, touch marquee suppression, and deterministic second-finger cancellation/yield to camera.

## batch 3

PR107 toolbar/media work had merged and released BottomToolbar. Narrow portrait presentation implemented as one floating active-tool launcher that expands the existing toolbar; landscape/wide behavior preserved.

## batch 4

Mobile text double-tap now primes the iOS software keyboard during trusted touchstart before sandbox TipTap autofocus takes over.

## latest checkpoint

PR #123 remains draft.

Current branch head:
c7daa52ead88abe698f640746640b2046bd68ac6

Current base/main:
64888da072282562aefe7e1d2d8e38e77eb42861

Exact-head checks:
- Workers Builds: field — PASS
- Media tests + editor build — PASS

Physical phone runtime QA remains pending.

Sheets are deferred only because field-motion-quality currently owns the required panel-host files. The hourly continuation must recheck ownership and proceed as soon as those paths are released.

## batches 5–6

Batch 5 landed at b64ec64a806fe1ac33398c563202d174759268b2:
deliberate long-press empty-canvas marquee through the canonical SelectionBox.

Batch 6 landed at 213646f5273908bad9658aa3794a3c75440c2056:
stationary object long press opens the canonical context menu while movement
continues to direct-manipulation drag.

Both exact heads passed Workers Builds and Media tests + editor build.

## Preview QA classification

The mobile branch Preview is blank at /work/noauth, but this is not currently
classified as a mobile regression: unrelated green PR #124 reproduces the same
empty application-root behavior, while production https://field.loew.fi/work/noauth
renders normally. Branch Preview runtime QA is therefore blocked by shared
Preview-host behavior.

## sole-worker ownership transfer

Per the user's explicit directive that this is the sole continuing worker,
src/App.tsx, src/editor/FloatingLeftPanelHost.tsx, and
src/editor/ToolbarPanelHost.tsx transfer from field-motion-quality to this
assignment for portrait sheets / landscape edge overlays. Preserve existing
motion semantics; change presentation only.
