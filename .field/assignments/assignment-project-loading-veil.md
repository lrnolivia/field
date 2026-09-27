# assignment-project-loading-veil.md

---
field_assignment: 1
id: project-loading-veil
status: active
branch: field/project-loading-veil
pr: 34
base: 12d1fb9c64165482d4bfcaa1553a1daaf9fd4049
implementation_head: e334b2fac13a8e81cb2a52fe1e4e21ff22217960
merge_commit: b7b32070e98f29c0a14cd3048047ef1d13400b68
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
