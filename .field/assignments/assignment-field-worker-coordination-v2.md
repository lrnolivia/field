# assignment-field-worker-coordination-v2.md

---
field_assignment: 1
id: field-worker-coordination-v2
status: complete
branch: field/field-worker-coordination-v2
pr: 2
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.2
type: plan-to-action
execution_class: contract-worker
owned:
  - .field/handoff-kit/**
approved_shared:
  - .field/assignments/**
  - .field/mail/**
  - .field/qa/**
  - tracker.md
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

Establish field Contract Worker / Night Shift coordination v2 without changing field product source.

## Final state

- PR #2 merged to main on 2026-09-26.
- merge/main SHA: `fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`
- `main:.field/handoff-kit/VERSION` is `2026-09-26.2`.
- Contract Worker and Night Shift terminology are canonical.
- `field/control` is the permanent coordination plane and does not merge into `main`.
- Composio is the exclusive GitHub transport for Contract Worker / Night Shift reads and writes.
- The built-in ChatGPT GitHub connector is prohibited for this lane.
- New Contract Worker assignments use `assignment-<unique-name>.md`.
- Legacy active `tracker.md` `Owned:` reservations remain authoritative until those legacy assignments finish.
- No field product source was modified by this assignment.

## Validation

- `python3 tests/contract_worker_v2_test.py` — PASS
- `python3 tests/kit_self_test.py` — PASS
- Bash syntax validation — PASS
- Node syntax validation — PASS
- manifest/version consistency — PASS
- exact validated PR head before merge: `06e984d84f3ebf68ca478ec1407ddb78f809ad63`
- tested main before merge: `7e585a2fe66e062bae8a46041a6e08901027f9a8`
- runtime QA — not required; coordination/process-only change

## Completion

Complete. Successor assignment `field-branch-preview-live-qa` is released for activation after a fresh ownership/path preflight.
