---
assignment: focus-camera-text-session
branch: field/focus-camera-text-session
pr: 60
tested_head_sha: 01531291174a1ea1a77bba5b740a30e8e66a7d24
tested_main_sha: 30f32648fe7c7f7607ffa5683422f51817b38e06
current_main_at_recording: 85add9062a67dca2600f333125286e948affb515
environment: branch Preview /builder/noauth
build: PASS — Cloudflare Workers Build 164e4f20-d527-4152-98f2-ebd2cdef6d66 ran npm run build:all
tests: NOT RUN — focused Vitest coverage was added/updated but no repository test executor/check runner is exposed in this Contract Worker environment
runtime_qa: BATCH 1 PASS / BATCH 2 PASS / BATCH 3 PASS
tested_at: 2026-09-29T03:25:37Z
evidence:
  - https://github.com/lrnolivia/field/pull/60
  - https://field-focus-camera-text-session.canvas-preview.loew.fi/builder/noauth
  - cloudflare-build:ef426e06-80a8-437f-988a-f5f4ecfd56e4
  - cloudflare-build:c616d7a5-f47e-4509-a250-18a0906168ce
  - cloudflare-build:164e4f20-d527-4152-98f2-ebd2cdef6d66
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

Status: PASS — BUILD + USER VISUAL QA

Exact-head evidence:
- head: `01531291174a1ea1a77bba5b740a30e8e66a7d24`
- Batch 3 implementation: `073bdf3edc06fcd704a7200fc70c2baed01d921e`
- main included before Batch 3: `30f32648fe7c7f7607ffa5683422f51817b38e06`
- Cloudflare Workers Build: `164e4f20-d527-4152-98f2-ebd2cdef6d66`
- `npm run build:all`: PASS
- editor build: PASS
- sandbox build: PASS
- Preview build: PASS
- deploy: PASS
- Preview: `https://field-focus-camera-text-session.canvas-preview.loew.fi/builder/noauth`
- focused Vitest coverage updated but NOT RUN in this environment

Required final visual checks:
1. Make a text layer extremely tall/large. Batch 2 whole-object follow should work normally until further pullback would go past the camera scale you had before entering text edit.
2. Continue typing after that point. Zoom should stop decreasing; field should quietly pan to keep the caret/current line comfortably visible.
3. In that oversized text, use arrow keys to move several lines up/down without typing. Camera may pan to follow the caret, but zoom must remain fixed.
4. Delete a large amount of text. Automatic behavior must still never zoom back in.
5. Switch directly from one nearby text layer to another. The camera should transition directly to the next target without a visible composition-view restore in between.
6. Exit text editing normally after a session with no manual camera input. The original pre-edit composition view should restore.
7. Enter text editing, manually pan/zoom, then exit. The manual view should remain authoritative; no restore snap.
8. Confirm the accepted Batch 2 headline→paragraph grow-to-fit behavior still feels unchanged before the oversized threshold.
9. Spot-check initial focus animation/blur, Shift+1/2/3, and Inspector Zoom for regression.
10. Selection Colors crosshair remains locate-only and must not move the camera.

Final gate:
- PR #60 remains draft and must not merge to main until the user accepts this final visual QA and separately authorizes merge.

## Final user acceptance

PASS on 2026-09-29.

User: "it's great! lets go and merge everything."

Accepted head: `01531291174a1ea1a77bba5b740a30e8e66a7d24`.
Merge authorized: YES.

## Merge verification

COMPLETE.

- PR: #60
- merge method: squash
- merged main SHA: `85add9062a67dca2600f333125286e948affb515`
- merged main tree: `283b4b62d8fae3c85aac9bc247f934c64b27c653`
- final accepted branch tree: `283b4b62d8fae3c85aac9bc247f934c64b27c653`
- tree parity: EXACT
- user final visual QA: PASS
- branch exact-head `npm run build:all`: PASS
- post-merge Cloudflare build for squash SHA: not observed during closeout
- conclusion: merged `main` contains exactly the source tree that passed the final branch build and user visual QA
