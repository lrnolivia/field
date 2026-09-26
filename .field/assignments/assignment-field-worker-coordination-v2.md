# assignment-field-worker-coordination-v2.md

---
field_assignment: 1
id: field-worker-coordination-v2
status: qa-passed-ready-to-merge
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

## Current verified state

- PR #2 is the implementation PR for this assignment.
- The handoff kit on the PR branch is version `2026-09-26.2`.
- Contract Worker and Night Shift terminology are documented.
- `field/control` exists as the permanent coordination plane.
- Composio is documented as the exclusive GitHub transport for all Contract Worker/Night Shift reads and writes.
- The built-in ChatGPT GitHub connector is explicitly prohibited for this lane.
- Unique Contract Worker assignment naming is `assignment-<unique-name>.md`.
- The legacy plain `templates/assignment.md` is a deprecation pointer.
- Assignment authoring and Composio transport contracts are present.
- Contract Worker v2 regression tests and the handoff-kit self-test pass against the PR-branch kit.
- No field product source is modified by this assignment.

## Decisions already made

- Contract Worker is distinct from Codex Worker.
- Night Shift is the informal collective term for Contract Workers.
- Night Shift Manager is a standing coordination role and is not a PJM.
- Composio Executor is transport infrastructure only.
- Git-backed assignment/mail/QA records are the cross-chat communication bus.
- `field/control` never merges into `main`.
- Existing active legacy `tracker.md` `Owned:` reservations remain authoritative until those assignments finish.
- Contract Workers do not routinely push implementation directly to `main`.

## Acceptance criteria

- [x] handoff kit version is `2026-09-26.2`
- [x] Contract Worker / Night Shift terminology is canonical
- [x] Codex lane remains distinct and intact
- [x] `field/control` protocol is defined
- [x] assignment/mail/QA schemas are defined
- [x] Composio-exclusive GitHub transport is documented
- [x] built-in ChatGPT GitHub connector is prohibited for Night Shift
- [x] unique assignment authoring is documented
- [x] legacy tracker ownership compatibility is documented
- [x] control-plane ownership regression tests exist
- [x] no product source was changed
- [x] separate successor assignment exists for branch Preview + live QA infrastructure
- [ ] PR #2 merged to `main`
- [ ] post-merge main verifies handoff kit `2026-09-26.2`

## Validation

Final validated PR head: `06e984d84f3ebf68ca478ec1407ddb78f809ad63`

Verified before merge:

- `tests/contract_worker_v2_test.py`: PASS
- `tests/kit_self_test.py`: PASS
- Bash syntax via kit self-test: PASS
- Node syntax via kit self-test: PASS
- JSON manifest parse/version consistency: PASS
- product runtime QA: not required; coordination-only change

## Cloudflare check note

Cloudflare preview/build checks on this coordination-only PR may fail because branch Preview infrastructure is not yet established. That is not treated as product-runtime QA for this assignment. The separate successor assignment owns that infrastructure work.

## Completion contract

Merge PR #2 only after the final branch head is re-read, the handoff-kit self-test remains valid for the final kit content, ownership remains conflict-free, and current `main` has not introduced a coordination-path conflict.

After merge, verify `main:.field/handoff-kit/VERSION` is `2026-09-26.2`, then mark this control record complete.
