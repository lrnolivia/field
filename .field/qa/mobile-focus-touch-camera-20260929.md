---
assignment: mobile-focus-touch-camera-20260929
branch: field/mobile-focus-touch-camera-20260929
pr: 123
tested_head_sha: 213646f5273908bad9658aa3794a3c75440c2056
tested_main_sha: 64fa810a66fc54d73c2f46ed2e352a8c3a3e568d
environment: exact-head CI plus branch Preview /work/noauth comparison
build: PASS — Workers Builds: field
tests: PASS — Media tests + editor build
runtime_qa: BLOCKED — shared branch Preview renders blank; reproduced on unrelated green PR #124
tested_at: 2026-09-29T22:47:00Z
evidence:
  - https://github.com/lrnolivia/field/pull/123
  - https://field-mobile-focus-touch-camera-20260929.canvas-preview.loew.fi/work/noauth
  - https://field-left-panel-inspector-parity-20260929.canvas-preview.loew.fi/work/noauth
  - https://field.loew.fi/work/noauth
---

# QA — mobile Focus editor

Status: EXACT-HEAD BUILD/CI PASS / BRANCH-PREVIEW RUNTIME QA BLOCKED

Implemented interaction coverage awaiting physical/mobile runtime verification:
- two-finger pan + pinch
- one-finger select / object drag / empty-space pan
- second-finger cancellation and camera takeover
- portrait active-tool launcher
- double-tap keyboard primer
- empty-canvas long-press marquee
- object long-press context menu

## Preview-host finding

The mobile branch and unrelated green PR #124 both load Preview shell/assets
but leave the application content root empty. Production main /work/noauth
renders the editor normally. This is evidence of a shared branch-Preview
environment/routing/boot problem, not evidence that the mobile feature itself
causes the blank state.

Do not claim physical-phone PASS until a runnable exact-head environment exists.
