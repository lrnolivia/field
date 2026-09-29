---
field_assignment: 1
id: focus-camera-hardening
status: complete
branch: field/focus-camera-hardening
pr: 66
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

## Implementation checkpoint — 2026-09-29

All three hardening batches are implemented and synced onto current main.

Batch commits:
- Batch 1 — explicit user camera authority: `c51ca8a3c18a3b39f1638a1bd6baf4f88693cbc2`
- Batch 2 — workspace geometry awareness: `1d14e8add9ae0111ede9af4f5159fe7282c798f6`
- Batch 3 — reduced motion: `29ee203e48b8cea6676f0f254c0e2197a17ba8a3`
- current-main sync merge: `820f88a5b3737b20e88f913d4c43d5db146888b8`

Draft PR: #66.

Exact PR diff is limited to nine intended files:
- `src/canvas/Canvas.tsx`
- `src/canvas/shortcuts.ts`
- `src/canvas/text-edit/text-focus-camera.test.ts`
- `src/canvas/text-edit/text-focus-camera.ts`
- `src/canvas/transform/CameraAnimator.test.ts`
- `src/canvas/transform/CameraAnimator.ts`
- `src/canvas/transform/camera-intent.ts`
- `src/editor/BottomToolbar.tsx`
- `src/editor/controls/InspectorZoomControl.tsx`


Implementation result:
- explicit keyboard/Inspector/Smart Zoom commands emit semantic user camera intent; active text-focus sessions yield permanently for that edit session
- transform deltas are not used to infer user intent; automatic focus/follow/restore remain silent
- workspace geometry changes are observed from the actual canvas/pane DOM surfaces and coalesced through the existing focus-session scheduler
- window resize, pane resize, pane mount/unmount, and pane transition completion can trigger one delayed safe-envelope re-evaluation
- manually interrupted sessions do not resume automation on later workspace changes
- reduced motion is handled centrally in `CameraAnimator`; all camera paths preserve exact target transforms while skipping tween/blur under `prefers-reduced-motion: reduce`
- normal-motion timing/easing and accepted focus blur remain unchanged

Exact-head Cloudflare evidence:
- tested head: `820f88a5b3737b20e88f913d4c43d5db146888b8`
- tested main included: `8c42d6b5d291a9cef995b02cb8e955bc77b52199`
- Workers Build: `a4b69b80-942d-49d0-b762-fdc832ed8d88`
- build command: `npm run build:all`
- deploy command: `npx wrangler preview`
- build outcome: success
- build log error scan: no compile/type failures found
- branch Preview: `https://field-focus-camera-hardening.canvas-preview.loew.fi/builder/noauth`

Focused Vitest coverage was added/updated but was NOT RUN in this Contract Worker environment. Final user visual QA is required before merge.

## Completion — 2026-09-29

User visually accepted the hardening pass and explicitly approved merge.

- PR #66: merged
- approved head: 820f88a5b3737b20e88f913d4c43d5db146888b8
- merge commit / resulting main: 6dd598b19edbd87bc2031a6824539c6f6919655c
- merge method: merge commit, preserving the three hardening batch commits
- Cloudflare exact-head build before merge: PASS
- user visual QA: PASS
- assignment status: complete
