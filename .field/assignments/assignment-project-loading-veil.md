# assignment-project-loading-veil.md

---
field_assignment: 1
id: project-loading-veil
status: active
branch: field/project-loading-veil-figma-match
pr: 37
base: 12d1fb9c64165482d4bfcaa1553a1daaf9fd4049
implementation_head: e334b2fac13a8e81cb2a52fe1e4e21ff22217960
merge_commit: b7b32070e98f29c0a14cd3048047ef1d13400b68
revision_head: 5cdab405114687c590ffa58092dee9b8c7b6280e
revision_base: b647b558a3a4078dcff3bb7134b24dbf6af367e5
type: loading-experience
execution_class: contract-worker
owned:
  - src/ProjectLoader.tsx
  - src/loading/ProjectLoadingVeil.tsx
  - src/loading/project-loading-veil.test.ts
approved_shared: []
protected:
  - src/FieldShell.tsx
  - src/Dashboard.tsx
  - src/dashboard/**
  - src/editor/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/preview-sandbox/**
  - src/styles/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

## Goal

Replace the editor-shaped loading skeleton with an atmospheric field loading veil that does not reveal final chrome geometry before the editor is ready.

Visual contract:
- full-screen dark mesh-gradient shader field with deep blur
- restrained grain/noise texture
- active field theme drives accent and centered frame-mark variant
- centered frame mark uses existing theme-resolved transparent app icon
- accent-backed mark breathes like an old Mac sleep light
- normal loading is visually wordless; accessibility status remains live
- delayed/error states may show restrained status and recovery controls
- reduced motion freezes shader and pulse
- no new package dependency
- real editor chrome remains hidden until the existing Canvas-ready handoff removes the veil


## Live-QA revision

The first atmospheric veil shipped in PR #34 passed build/deploy but failed human visual QA.

User-provided source of truth:
- Figma file `loading-mocks`, node `1:49`
- ReShaders `Mesh Flow · Mono`

Current visual contract:
- base field `#8a8a8a`
- actual ReShaders/Revyme Mesh Flow math, animated
- canonical Mono palette: `#2a2a2e / #c9c9cf / #f4f4f6 / #7a7a82 / #050505`
- canonical defaults: warp .5, softness .45, speed .4, vignette .25, grain .04
- Mesh Flow composited in `multiply`
- deep blur + grain
- theme-resolved field mark at mathematical viewport center (50% / 50%)
- circular white bloom is an independent layer behind the mark; it does not follow the squoval silhouette
- slow sleep-light-style luminance breathing
- ProjectLoader readiness/error semantics remain unchanged
