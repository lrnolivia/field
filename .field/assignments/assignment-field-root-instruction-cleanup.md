# assignment-field-root-instruction-cleanup.md

---
field_assignment: 1
id: field-root-instruction-cleanup
status: active
branch: field/field-root-instruction-cleanup
pr: null
base: fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e
kit: 2026-09-26.2
type: repair
execution_class: contract-worker
owned:
  - CLAUDE.md
  - CONTRIBUTING.md
  - .field/handoff-kit/CONTRACT.md
  - .field/handoff-kit/ASSIGNMENT_AUTHORING.md
  - .field/handoff-kit/CHAT_BOOTSTRAP.md
  - .field/handoff-kit/tests/contract_worker_v2_test.py
approved_shared: []
protected:
  - src/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: false
  authenticated: false
---

## Goal

Remove stale Revyme-era product and coordination framing from the repository's root agent/contribution instructions, and make the v2 worker contract explicitly require workers to repair artificial blockers they can safely resolve.

## Current verified state

- `main` is `fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`.
- handoff kit `2026-09-26.2` is live on `main`.
- `README.md` already presents field as the product and Revyme as technical origin.
- `CLAUDE.md` still opens as `Revyme - Architecture & Contribution Guide`.
- `CONTRIBUTING.md` still opens as `Contributing to Revyme`.
- no active Contract Worker assignment owns these root docs or the handoff-kit process files reserved here.

## Decisions already made

- field is the product; Revyme is the technical origin.
- source remains first-class and Preview is runtime truth.
- Contract Worker / Night Shift GitHub transport is Composio-exclusive.
- `field/control` is the cross-chat coordination plane.
- `tracker.md` is migration compatibility only for still-active pre-v2 `Owned:` reservations.
- Codex/local work remains a separate execution lane.
- upstream Revyme identifiers remain where they are real compatibility/runtime names.
- LICENSE and NOTICE remain authoritative for licensing and attribution.
- workers must fix artificial blockers they discover when the repair is safe and within their authority; only genuine blockers should stop execution.

## Artificial blocker rule

An artificial blocker is a procedural, tooling, harness, branch/PR, documentation, test-fixture, or local integration obstacle that the worker can safely repair without violating product direction, ownership, protected paths, or authorization boundaries.

Workers must repair these rather than stop merely because the workflow hit friction.

Examples:
- a Draft PR cannot be opened because the branch has no commit yet
- a stale helper or test contradicts the current contract
- a required QA fixture/harness file in owned scope is missing or stale
- a branch/control record needs a bounded update to continue the assignment
- a generated/template instruction creates a deterministic process dead-end

Real stop conditions still include:
- ownership conflicts
- required access/secrets/auth the worker does not possess
- destructive/privileged changes not authorized by the assignment
- protected or out-of-scope paths
- unresolved product decisions requiring the user
- external-service failure the worker cannot safely work around

If repairing the blocker requires new path ownership, reserve/update ownership first. If the repair is genuinely separate product/infrastructure work, create a successor assignment instead of silently expanding scope.

## Implementation intent

Rewrite only the owned instruction/process files so they are field-native, route process to handoff-kit v2, preserve useful source/canvas/mutation/runtime invariants, preserve current setup/test/build/e2e guidance, and encode the artificial-blocker rule.

## Acceptance criteria

- [ ] `CLAUDE.md` and `CONTRIBUTING.md` are field-native
- [ ] both point execution chats to `.field/handoff-kit/CHAT_BOOTSTRAP.md` and `.field/handoff-kit/CONTRACT.md`
- [ ] Contract Worker Composio-only rule is explicit and scoped correctly
- [ ] Codex/local lane remains distinct
- [ ] useful architecture invariants remain
- [ ] setup/test/build/e2e commands match current `package.json`
- [ ] contract/bootstrap/authoring docs explicitly require fixing artificial blockers
- [ ] regression test asserts the blocker rule exists
- [ ] no product source/config changes
- [ ] docs/process-only diff is reviewed and merged
