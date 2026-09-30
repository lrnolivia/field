# assignment-<unique-name>.md

---
field_assignment: 1
id: <unique-name>
status: active
branch: field/<unique-name>
pr: null
base: <main-sha>
kit: 2026-09-29.1
type: handoff | plan-to-action | repair | follow-up | qa-closeout
execution_class: contract-worker
owned:
  - <path>
approved_shared:
  - <path>
protected:
  - <path>
qa:
  browser_preview: true | false
  authenticated: true | false
---

## Mandatory rehydration

Use Composio exclusively for all GitHub reads and writes in the Contract Worker lane.

Before interpreting this assignment, re-read current `lrnolivia/loew-runner@main/contracts/manifest.json` and `LOEW_CHAT_BIBLE.md`, resolve field from Runner as `lrnolivia/field`, then read the current repo-hosted handoff kit from `main`. After that, read the canonical assignment/mail/QA records from `field/control`, current `main`, the assignment branch/PR, and active legacy tracker ownership while migration remains.

Current Runner law and repo process rules supersede stale process instructions from the source chat.

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

Apply current Runner Bible section 11 first.

Primary evidence:
- exact PR head SHA
- live branch Preview URL
- selected Runner-approved harness and resulting evidence
- `/qa/work/<projectId>` when real saved-project truth matters
- `/builder/noauth` only when a smoke/isolation harness is sufficient

Engine routing:
- HTTP/read-only for cheap infrastructure facts
- deterministic Inspector/GitHub Chromium for routine visual/runtime criteria when capable
- Browser Run only for exploratory/session behavior deterministic recipes cannot prove
- authenticated/project-native harnesses when protected state or persistence is part of the criterion

Secondary evidence:
- <supporting evidence>

Human/authenticated QA:
- <requirements or none>


## Artificial blocker rule

If this assignment is blocked by a defect in field's own coordination, metadata, tooling, instructions, or QA harness, repair that blocker when the repair is bounded and within current ownership/authority. Validate and record the repair, then continue.

Do not use this rule to cross another assignment's ownership or to change product direction. Create/request a separate repair assignment when that is required.

## Handoff source

- <source chat/plan/commit/control record>

## Completion contract

- implementation remains on `field/<unique-name>`
- do not push implementation directly to `main`
- update your own mailbox and QA record
- record QA against exact tested branch/main SHAs
- merge only after the current merge gate passes
- separate follow-up work gets a new `assignment-<new-unique-name>.md`
