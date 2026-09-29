# assignment-project-switch-isolation.md

---
field_assignment: 1
id: project-switch-isolation
status: active
branch: field/project-switch-isolation
pr: null
base: 348c25d54a5acf60e96c6093bfefdcfd6e2d747b
type: p0-correctness-repair
execution_class: contract-worker
owner: night-shift
owned:
  - src/ProjectLoader.tsx
  - src/code/project/project-fs.ts
  - src/code/project/project-session.ts
  - src/code/mutation/mutation-queue.ts
  - src/code/project/project-switch-isolation.test.ts
  - src/project-loader-readiness.test.ts
approved_shared: []
protected:
  - src/FieldShell.tsx
  - src/Dashboard.tsx
  - src/backend/**
  - src/editor/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/preview-sandbox/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
qa:
  browser_preview: true
  authenticated: preferred
---

## Goal

Fix same-document project isolation so selecting project B cannot retain project A's files, branches, derived nodes/layers, queued code, selection/edit state, or deferred writes.

## Acceptance

- Project B's envelope replaces project A's main + branch state atomically.
- Same-path app/page.client.tsx swaps invalidate active code and node derivations.
- Mutation queue/deferred fan-outs are reseeded to B and stale A callbacks cannot write into B.
- Stale async ProjectLoader results cannot rewrite the newly active project's global identity state.
- Regression coverage proves A -> B isolation with different content at the same file path.
- Exact-head build/checks pass before merge.
- Browser QA verifies A -> Dashboard -> B when the authenticated harness is available; harness absence is recorded, not confused with product failure.
