---
assignment: focus-camera-text-session
branch: field/focus-camera-text-session
pr: 60
tested_head_sha: 9b49074a7565da822fdc898653128ad32ef8f010
tested_main_sha: 417e3aa43618d552ae12ef9cd3d2fc9a01424f4d
current_main_at_recording: 417e3aa43618d552ae12ef9cd3d2fc9a01424f4d
environment: branch Preview /builder/noauth
build: PASS — Cloudflare Workers Build c616d7a5-f47e-4509-a250-18a0906168ce ran npm run build:all
tests: NOT RUN — focused Vitest coverage was added/updated but no repository test executor/check runner is exposed in this Contract Worker environment
runtime_qa: BATCH 1 PASS / BATCH 2 PASS / BATCH 3 IN PROGRESS
tested_at: 2026-09-29T03:25:37Z
evidence:
  - https://github.com/lrnolivia/field/pull/60
  - https://field-focus-camera-text-session.canvas-preview.loew.fi/builder/noauth
  - cloudflare-build:ef426e06-80a8-437f-988a-f5f4ecfd56e4
  - cloudflare-build:c616d7a5-f47e-4509-a250-18a0906168ce
---

# focus-camera-text-session QA

## Batch 1 — canonical focus camera

Status: PASS — BUILD + USER VISUAL QA

Verified source/build facts:
- exact branch head is `63f514b464c2e83f19f3c966c18ea08252b12dd3`
- Cloudflare push-event build for that exact SHA completed successfully
- build command was `npm run build:all`
- deploy command was `npx wrangler preview`
- branch Preview hostname from the deploy log is `https://field-focus-camera-text-session.canvas-preview.loew.fi`
- changed source is limited to the four camera/text-focus files in PR #60
- `CameraAnimator` is unchanged
- Selection Colors crosshair/target is locate-only, not a camera focus entry point

Automated browser smoke:
- NOT VERIFIED — the generic web fetch harness cannot access the branch Preview hostname
- this is a harness limitation, not a product failure
- user visual QA is the authoritative Batch 1 runtime acceptance

Required visual checks:
1. Shift+1 — Fit canvas: same framing and animation as before
2. Shift+2 — Fit selection: same framing and animation as before
3. Shift+3 — 100%: same behavior as before
4. Inspector Zoom menu: Fit canvas / Fit selection / 100% / zoom in / zoom out still match their keyboard counterparts
5. Double-click a non-text layer in Layers: same quick-focus framing, motion, and blur as before
6. Double-click a non-text canvas object where applicable: same quick-focus behavior
7. Double-click text / enter text editing: text focus should look exactly as polished as before
8. Exit text editing without manually moving the camera: prior camera should restore
9. During text editing, manually wheel/pan the canvas: field must respect the manual interruption and not snap back on exit
10. Selection Colors crosshair: should continue to locate/glow matching objects without moving camera or changing selection

Stop gate: CLEARED — user accepted Batch 1 visual feel on 2026-09-29.

## Batch 2 — adaptive text focus

Status: PASS — BUILD + USER VISUAL QA

Exact-head evidence:
- head: `9b49074a7565da822fdc898653128ad32ef8f010`
- main included before Batch 2: `417e3aa43618d552ae12ef9cd3d2fc9a01424f4d`
- Cloudflare Workers Build: `c616d7a5-f47e-4509-a250-18a0906168ce`
- build: `npm run build:all` — PASS
- deploy: `npx wrangler preview` — PASS
- Preview: `https://field-focus-camera-text-session.canvas-preview.loew.fi/builder/noauth`
- focused Vitest coverage updated but NOT RUN in this environment

Required visual checks:
1. Start with a one-line text layer and type until it wraps/grows. Nothing should happen while it remains comfortably inside the viewport.
2. Continue growing it until it approaches the safe edge. The camera should ease outward once, leaving visible breathing room.
3. Keep typing after an adjustment. Small growth/one additional line should not immediately retrigger another move.
4. Delete several lines. The camera must NOT zoom back in automatically.
5. Paste a large paragraph. Expect one graceful pullback rather than per-line micro-adjustments.
6. Try fixed-width/auto-height text: growth should be accommodated mostly as vertical expansion from the actual runtime geometry.
7. Try a fixed-size text box: if the box itself does not grow/move, the camera should generally remain still.
8. Try text in layout that shifts position as it grows. If the edited rect approaches an edge, the camera may minimally pan/pull back to keep it in the comfort area.
9. During editing, manually use trackpad/wheel camera movement. Adaptive follow should suspend and field must not fight you.
10. During editing, middle-mouse pan the canvas. Adaptive follow should likewise suspend.
11. Confirm the initial text-focus animation + blur still looks exactly like accepted Batch 1; adaptive follow itself should be quieter and should NOT repeatedly blur.
12. Spot-check Shift+1/2/3 and Inspector Zoom for regressions.

Stop gate: CLEARED — user accepted Batch 2 visual feel on 2026-09-29.

## Batch 3 — caret + session polish

Status: IN PROGRESS
