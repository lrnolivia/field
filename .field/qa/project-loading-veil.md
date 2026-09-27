# project-loading-veil QA

Status: build/deploy-pass / human-live-feel-pending

PR: #34
Implementation head: `e334b2fac13a8e81cb2a52fe1e4e21ff22217960`
Merge commit: `b7b32070e98f29c0a14cd3048047ef1d13400b68`

## Build / deploy evidence

- exact-head Preview build `05b8008a-89f3-439f-a38b-2743840b851f`: PASS
- `npm run build:all`: PASS
- Preview deploy: PASS
- immutable editor Preview: `https://c516d09b.field-preview.loew.fi`
- immutable Canvas Preview: `https://c516d09b.canvas-preview.loew.fi`
- production build `e59eca7d-5fb8-4c1b-83c0-cf2338988897`: PASS
- production deploy: PASS
- production Worker: `https://field.lrnoliv.workers.dev`

## Acceptance implemented

- editor-shaped skeleton removed from ProjectLoader
- native WebGL2 mesh shader + CSS fallback
- deep blur + dark wash + grain
- active builder theme drives shader accent
- centered frame mark uses `--field-app-icon-trans`
- accent-backed frame mark has slow sleep-light pulse
- routine loading remains visually wordless while aria-live status remains present
- delayed/error states retain restrained status + Retry/Back actions
- reduced motion freezes shader and pulse
- Canvas-ready fade/removal semantics preserved
- no package changes

## Pending

- human live visual QA of shader feel, darkness, grain, blur, pulse rhythm, mark scale, and reveal.
