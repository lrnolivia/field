# assignment-dashboard-editor-left-rail-handoff.md

---
field_assignment: 1
id: dashboard-editor-left-rail-handoff
status: active
branch: field/dashboard-editor-left-rail-handoff
pr: 32
base: 3a8f45a7f05250688a54c1fccc2634ebf1a59880
current_head: 3c7b5cd9dbcd1f89c8fe208e92f66c1666930a6f
reconciled_main: 024d594b07d6ad6e04c61383778de621f170471f
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

Repair editor entrance choreography from live human QA using two explicit modes.

Direct Canvas load / refresh:
- left backing + Layers/content surface lead
- narrow left rail follows
- accepted inspector and bottom-toolbar entrance remains intact

Dashboard → Canvas:
- Dashboard sidebar vacates before left editor surface returns
- Dashboard main vacates right before inspector backing surface answers with restrained inertia
- inspector content follows the surface
- bottom toolbar joins near the inspector spring on its own readable beat
- Canvas never moves

Preserve the accepted Canvas → Dashboard motion.

Dashboard → Canvas visual order:
1. Dashboard left sidebar exits enough to read as one surface dipping away.
2. Editor left backing island + Layers/content surface return.
3. Narrow editor tool rail follows on top.
4. Dashboard main yields the right edge.
5. Inspector backing surface springs in from that same edge with restrained overshoot.
6. Bottom toolbar bounces in shortly after the inspector spring begins.
7. Inspector content follows once the backing surface is legible.

Cold boot / refresh uses the same left surface → rail ordering while preserving the previously accepted right-inspector and bottom-toolbar entrance.
