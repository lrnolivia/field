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

Remove stale Revyme-era product and coordination framing from the repository's root agent/contribution instructions while preserving implementation invariants and legal/upstream compatibility facts that remain true.

## Current verified state

- `main` is `fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`.
- handoff kit `2026-09-26.2` is live on `main`.
- `README.md` already presents field as the product and Revyme as technical origin.
- `CLAUDE.md` still opens as `Revyme - Architecture & Contribution Guide`.
- `CONTRIBUTING.md` still opens as `Contributing to Revyme`.
- no current Contract Worker assignment owns `CLAUDE.md` or `CONTRIBUTING.md`.

## Decisions already made

- field is the product; Revyme is the technical origin.
- source remains first-class and Preview is runtime truth.
- Contract Worker / Night Shift GitHub transport is Composio-exclusive.
- `field/control` is the cross-chat coordination plane.
- `tracker.md` is migration compatibility only for still-active pre-v2 `Owned:` reservations.
- Codex/local work remains a separate execution lane.
- upstream Revyme identifiers remain where they are real compatibility/runtime names.
- LICENSE and NOTICE remain authoritative for licensing and attribution.

## Implementation intent

Rewrite only `CLAUDE.md` and `CONTRIBUTING.md` so they are field-native, route process to handoff-kit v2, preserve useful source/canvas/mutation/runtime invariants, preserve current setup/test/build/e2e guidance, and stop teaching stale Revyme product identity or old coordination mechanics.

## Acceptance criteria

- [ ] both root docs are field-native
- [ ] both point execution chats to `.field/handoff-kit/CHAT_BOOTSTRAP.md` and `.field/handoff-kit/CONTRACT.md`
- [ ] Contract Worker Composio-only rule is explicit and scoped correctly
- [ ] Codex/local lane remains distinct
- [ ] useful architecture invariants remain
- [ ] setup/test/build/e2e commands match current `package.json`
- [ ] no product source/config changes
- [ ] docs-only diff is reviewed and merged
