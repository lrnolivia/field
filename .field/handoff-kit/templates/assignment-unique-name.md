# assignment-<unique-name>.md

---
field_assignment: 1
id: <unique-name>
status: active
branch: field/<unique-name>
pr: null
base: <main-sha>
kit: 2026-09-26.2
type: handoff | plan-to-action | repair | follow-up | qa-closeout
execution_class: contract-worker
owned:
  - <path>
approved_shared:
  - <path>
protected:
  - <path>
qa:
  firecrawl: true | false
  authenticated: true | false
---

## Mandatory rehydration

Use Composio exclusively for all GitHub reads and writes.

Read the current repo-hosted handoff kit from `main`, then read the canonical assignment/mail/QA records from `field/control`, current `main`, the assignment branch/PR, and active legacy tracker ownership while migration remains.

Current repo process rules supersede stale process instructions from the source chat.

## Goal

<what becomes true>

## Why this exists

<context>

## Current verified state

- <verified fact>

## Decisions already made

- <settled decision>

Do not reopen these without a concrete repository conflict or explicit user change.

## Implementation intent

<what to build or repair>

## Acceptance criteria

- [ ] <criterion>

## Intended ownership

Owned:
- `<path>`

Approved Shared:
- `<path>`

Protected:
- `<path>`

## Investigation permitted during implementation

- <bounded unresolved implementation detail>

## Out of scope

- <non-goal>

## Known traps / prior findings

- <finding>

## Validation

- <focused tests>
- <static/type checks where applicable>
- <production/release build where applicable>
- exact changed-path audit
- moving-main reconciliation

## Runtime QA

Primary evidence:
- <environment-specific evidence>

Secondary evidence:
- <supporting evidence>

Human/authenticated QA:
- <requirements or none>

## Handoff source

- <source chat/plan/commit/control record>

## Completion contract

- implementation remains on `field/<unique-name>`
- do not push implementation directly to `main`
- update your own mailbox and QA record
- record QA against exact tested branch/main SHAs
- merge only after the current merge gate passes
- separate follow-up work gets a new `assignment-<new-unique-name>.md`
