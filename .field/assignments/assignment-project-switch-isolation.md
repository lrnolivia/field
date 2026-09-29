# assignment-project-switch-isolation.md

---
field_assignment: 1
id: project-switch-isolation
status: complete
branch: field/project-switch-isolation
pr: 53
base: 348c25d54a5acf60e96c6093bfefdcfd6e2d747b
merge_commit: 790789c2c94d0ad2cb7742c1285b00c48ad3aa48
completed_at: 2026-09-29T02:14:00Z
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
  browser_preview: delegated-to-codex
  authenticated: delegated-to-codex
---

## Goal

Fix same-document project isolation so selecting project B cannot retain project A's files, branches, derived nodes/layers, queued code, selection/edit state, or deferred writes.

## Result

Merged in PR #53 as `790789c2c94d0ad2cb7742c1285b00c48ad3aa48`.

- Project B's envelope replaces project A's main + branch state atomically.
- Same-path `app/page.client.tsx` swaps invalidate active code and node derivations.
- Mutation queue/deferred fan-outs are reseeded to B and stale A callbacks are cancelled.
- Stale async ProjectLoader results are fenced from rewriting newly active project-global state.
- Focused regression coverage for A -> B same-path isolation passed.
- Production build passed on the tested product-code head.
- Temporary verification workflow was removed before merge.
- Runtime/browser QA was explicitly delegated to Codex by the user.
