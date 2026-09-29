---
assignment: focus-camera-hardening
branch: field/focus-camera-hardening
pr: 66
tested_head_sha: 820f88a5b3737b20e88f913d4c43d5db146888b8
tested_main_sha: 8c42d6b5d291a9cef995b02cb8e955bc77b52199
environment: branch Preview /builder/noauth
build: PASS — Cloudflare Workers Build a4b69b80-942d-49d0-b762-fdc832ed8d88 ran npm run build:all
tests: NOT RUN — focused Vitest coverage added/updated; no repo unit-test executor exposed in this Contract Worker environment
runtime_qa: PASS — user visually accepted the hardening Preview
tested_at: 2026-09-29T04:33:23Z
evidence:
  - https://github.com/lrnolivia/field/pull/66
  - https://field-focus-camera-hardening.canvas-preview.loew.fi/builder/noauth
  - cloudflare-build:a4b69b80-942d-49d0-b762-fdc832ed8d88
---

# focus-camera-hardening QA

## Batch 1 — explicit user camera authority
Status: BUILD PASS / USER VISUAL QA PENDING

Visual checks:
- While editing text, use Shift+1 / Shift+2 / Shift+3. The chosen camera view must become authoritative: later typing/caret movement must not pull it again, and exiting text edit must not restore over it.
- While editing, use keyboard zoom in/out. Same authority rule.
- While editing, invoke Fit / 100% / +/- from Inspector Zoom. Same authority rule.
- Use bottom-toolbar Smart Zoom while editing if convenient. Same authority rule.
- Start a normal text edit and do none of those things: accepted adaptive follow + normal restore should behave exactly as before.

## Batch 2 — workspace geometry awareness
Status: BUILD PASS / USER VISUAL QA PENDING

Visual checks:
- Focus/edit text near an edge, then open/close Inspector or Layers. After the pane settles, field may make one quiet correction to keep text comfortable.
- Resize the window while editing; same behavior.
- There must be no automatic zoom-in.
- Manually pan/zoom first, then change pane geometry. The session must remain interrupted; field must not resume following.

## Batch 3 — reduced motion
Status: BUILD PASS / USER VISUAL QA PENDING

Visual checks:
- With OS/browser `prefers-reduced-motion: reduce` enabled, use Shift+2 and enter text focus. Camera should land directly on the same final framing with no focus blur/tween.
- Adaptive/caret positioning should still function; only motion flourish is removed.
- Disable reduced motion and confirm the previously accepted animation/blur feels unchanged.

Final gate:
- exact-head build: PASS
- user visual QA: PASS
- PR #66: MERGED
- merge commit / current main: 6dd598b19edbd87bc2031a6824539c6f6919655c

## Merge result — 2026-09-29

- user acceptance: PASS
- PR #66: merged
- approved PR head: 820f88a5b3737b20e88f913d4c43d5db146888b8
- merge commit: 6dd598b19edbd87bc2031a6824539c6f6919655c
- resulting main: 6dd598b19edbd87bc2031a6824539c6f6919655c
- merge method: merge commit; batch commits preserved
