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

## Completed state

PR #2 established:

- handoff kit version 2026-09-26.2
- explicit Codex lane vs Contract Worker lane separation
- field/control as the permanent cross-chat coordination plane
- canonical assignment / one-writer mailbox / QA records
- unique assignment naming: assignment-<unique-name>.md
- assignment authoring rules
- Composio-exclusive GitHub transport for all Night Shift reads and writes
- prohibition on the built-in ChatGPT GitHub connector for this lane
- legacy tracker ownership coexistence during migration
- exact-SHA QA / merge discipline
- separation of branch Preview/live QA into a successor assignment
- cleanup of stale v1 tracker/installer/Firecrawl instructions inside the handoff kit

## Validation

Final tested PR head:

06e984d84f3ebf68ca478ec1407ddb78f809ad63

Final tested main before merge:

7e585a2fe66e062bae8a46041a6e08901027f9a8

Validated:

- Contract Worker v2 regression tests: PASS
- handoff-kit self-test: PASS
- Bash syntax: PASS
- Node syntax: PASS
- manifest/version consistency: PASS
- changed-path allowlist: PASS; PR changed only .field/handoff-kit/**
- product runtime QA: not required; coordination/process-only change

The Cloudflare Workers branch build failed, but it was not a required branch-protection gate and was not treated as product-runtime acceptance evidence. Branch Preview/live-QA infrastructure is separately owned by successor assignment field-branch-preview-live-qa.

## Post-merge closeout

PR #2 merged at 2026-09-26T10:20:20Z.

Merge commit:

fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e

Post-merge main verification:

- main:.field/handoff-kit/VERSION = 2026-09-26.2
- canonical coordination remains on field/control
- successor assignment field-branch-preview-live-qa is registered
- no field product source was changed by this migration

This assignment is complete.
