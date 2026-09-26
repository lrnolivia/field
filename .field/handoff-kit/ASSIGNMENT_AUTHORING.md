# Contract Worker assignment authoring

## Core rule

> An assignment is not a transcript. It is the smallest complete executable representation of the next unit of work.

## When to create an assignment

Create a new Contract Worker assignment when:

- the user explicitly requests a handoff
- planning/research has converged into implementation
- a separate Contract Worker is appropriate
- a genuinely separate follow-up tranche is discovered
- ownership boundaries require a split
- a repair can be bounded independently
- QA closeout needs a dedicated bounded pass

Do not create an assignment for a vague aspiration.

## Assignment modes

### HANDOFF

Continue known work from an existing worker/chat.

### PLAN → ACTION

Planning/research has converged enough to implement.

### REPAIR

Fix a bounded defect with known acceptance criteria.

### FOLLOW-UP

Separate work discovered during another assignment.

### QA CLOSEOUT

Implementation is already landed or frozen and only evidence/verification remains.

## Naming

File:

```text
assignment-<unique-name>.md
```

ID:

```text
<unique-name>
```

Activated implementation branch:

```text
field/<unique-name>
```

Draft PR title:

```text
[field] <unique-name>
```

Use lowercase kebab-case.

Do not create a new file named plain `assignment.md`.

## Readiness

An assignment is ready when:

- the next worker can understand it without the source chat
- product direction is sufficiently decided
- success is recognizable
- ownership is bounded
- the work is not a duplicate of an active assignment
- unresolved questions are explicitly bounded as permitted investigation

## Artificial blockers discovered during execution

Assignments should let workers repair ordinary process friction. If a procedural, tooling, harness, branch/PR, documentation, or test-fixture obstacle is safe to fix inside owned scope, fix it and continue rather than escalating it as a blocker.

If the repair needs new ownership, reserve it first. Genuine ownership, authorization, protected-scope, product-decision, or unworkable external blockers still stop execution.

## Required body

Every assignment should include:

- Mandatory rehydration
- Goal
- Why this exists
- Current verified state
- Decisions already made
- Implementation intent
- Acceptance criteria
- Intended ownership
- Investigation permitted during implementation
- Out of scope
- Known traps / prior findings
- Validation
- Runtime QA
- Authenticated/human QA where needed
- Handoff source
- Completion contract

## Truth categories

Never blur these:

### Landed / verified

Commits on the relevant canonical branch, deployed behavior actually checked, and tests/QA that actually ran.

### In progress

Branch-only commits, local/uncommitted work, partial implementation, unresolved implementation defects.

### Decided but not implemented

Settled product/architecture decisions and accepted constraints.

### Unknown / unverified

Assumptions, incomplete QA, uninspected runtime behavior, or source state not yet checked.

## Ownership

Before activation, check:

- active legacy `tracker.md` `Owned:`
- active `field/control` Contract Worker `owned`

Parent/child overlap counts.

Shared overlap must be explicit.

If ownership is uncertain, say so and fail closed rather than guessing.

## Follow-up rule

If new work is genuinely separate, create a successor assignment.

Do not silently grow the current assignment merely because the same chat discovered the work.

## Current Worker migration

When importing an older worker's prepared handoff:

- preserve settled decisions
- preserve actual test/QA evidence
- refresh current Git truth
- remove stale process mechanics
- do not blindly apply a patch
- convert useful history into canonical assignment/mail/QA records


## Artificial blockers discovered during implementation

Do not automatically stop because the workflow itself is broken.

If the blocker is caused by stale instructions, coordination metadata, branch/PR bookkeeping, a deterministic tool invocation, or the QA harness, repair it when the repair is bounded and does not violate another assignment's ownership.

Record what was wrong and what changed, then continue the assignment.

If the repair needs someone else's owned path or a materially separate implementation tranche, create/request a bounded repair assignment instead of silently trespassing.

A real external dependency remains a blocker. A defect in our own process should normally become work.
