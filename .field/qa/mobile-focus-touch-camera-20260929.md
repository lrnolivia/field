---
assignment: mobile-focus-touch-camera-20260929
branch: field/mobile-focus-touch-camera-20260929
pr: 123
tested_head_sha: c7daa52ead88abe698f640746640b2046bd68ac6
tested_main_sha: 64888da072282562aefe7e1d2d8e38e77eb42861
environment: branch Preview /builder/noauth
build: PASS — Cloudflare Workers Build c5f7e00a-56a2-45ab-b211-69d490aa9857
tests: PASS — Media tests + editor build d4529286-e9c8-5334-b1bf-b380ef590f21
runtime_qa: PENDING — physical/mobile touch verification required
tested_at: 2026-09-29T21:55:00Z
evidence:
  - https://github.com/lrnolivia/field/pull/123
  - https://field-mobile-focus-touch-camera-20260929.canvas-preview.loew.fi/builder/noauth
  - cloudflare-build:c5f7e00a-56a2-45ab-b211-69d490aa9857
  - github-check:d4529286-e9c8-5334-b1bf-b380ef590f21
---

# QA — mobile Focus editor

Status: EXACT-HEAD BUILD/CI PASS / PHYSICAL MOBILE QA PENDING

## touch camera
- two-finger pan
- pinch zoom around live midpoint
- combined pan + pinch
- one-finger release after camera gesture
- no stuck camera state

## direct manipulation
- tap object selects
- one-finger object drag moves
- one-finger empty drag pans
- empty tap deselects
- second finger during drag cancels object motion before camera takeover
- resize/transform handles remain usable
- desktop marquee behavior unchanged

## portrait toolbar
- <=600px shows one active-tool launcher
- tapping launcher opens compact existing toolbar
- direct tool choice collapses it
- safe area is respected in Safari
- landscape/wide Focus keeps the traditional toolbar

## text keyboard
- double-tap text enters editing
- iOS software keyboard appears
- sandbox TipTap receives focus/caret
- keyboard dismissal leaves canvas interaction usable

No physical-phone PASS is claimed yet.
