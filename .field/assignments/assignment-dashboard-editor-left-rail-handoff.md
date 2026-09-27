# assignment-dashboard-editor-left-rail-handoff.md

---
field_assignment: 1
id: dashboard-editor-left-rail-handoff
status: active
branch: field/dashboard-editor-left-rail-handoff
pr: null
base: 3a8f45a7f05250688a54c1fccc2634ebf1a59880
type: bounded-motion-repair
execution_class: contract-worker
owned:
  - src/editor/editor-entrance.ts
  - src/editor/EditorEntranceCoordinator.tsx
  - src/editor/editor-entrance.test.ts
approved_shared: []
protected:
  - src/FieldShell.tsx
  - src/field-shell-motion.ts
  - src/field-shell-motion.test.ts
  - src/Dashboard.tsx
  - src/dashboard/**
  - src/editor/BottomToolbar.tsx
  - src/canvas/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: false
---

## Goal

Repair only Dashboard → editor left-side choreography from live human QA.

Preserve the accepted Canvas → Dashboard motion.

Required visual order:
1. Dashboard left sidebar exits fully enough to read as the same surface dipping offscreen.
2. Editor left backing island + Layers/content surface spring in together.
3. Narrow editor tool rail follows as a later overlay beat on top of that surface.

Right and bottom editor chrome keep their existing overlap timing. Direct load/refresh behavior stays unchanged. Canvas never moves.
