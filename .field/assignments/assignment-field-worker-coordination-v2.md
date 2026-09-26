# field — Contract Worker Coordination v2

---
field_assignment: 1
id: field-worker-coordination-v2
status: active
branch: field/field-worker-coordination-v2
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.1
target_kit: 2026-09-26.2
type: plan-to-action
execution_class: contract-worker
owned:
  - .field/handoff-kit/**
  - .field/assignments/**
  - .field/mail/**
  - .field/qa/**
approved_shared:
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

Assignment File: `assignment-field-worker-coordination-v2.md`

## Mandatory rehydration

Before doing work:

1. Read the current repo-hosted handoff kit from `main`.
2. Read the current assignment.
3. Read legacy active reservations in `tracker.md`.
4. Inspect current `main`, this implementation branch, and Draft PR #2.
5. Treat remembered/copied coordination, ownership, deployment, installer, and QA process as stale where this assignment explicitly supersedes it.

Keep valid product decisions and verified implementation findings.

This assignment changes coordination infrastructure only.

## Terminology

### Contract Worker

A **Contract Worker** is an ordinary ChatGPT execution chat operating under one bounded repository assignment.

A Contract Worker may use:

- Composio for GitHub writes
- repository reads
- CI/check results
- Firecrawl for appropriate web runtime QA
- future project-specific native QA transports

A Contract Worker is temporary outside execution labor. It receives a contract, executes the contract, proves the result, and exits.

It does not manage the product hierarchy.

### Night Shift

**Night Shift** is the informal collective term for one or more Contract Workers performing independent assignments asynchronously.

"Put it on the Night Shift" means:

> package appropriate work into independent Contract Worker assignments.

Night Shift is not an architectural agent class.

### Codex Worker

A **Codex Worker** belongs to the existing PJM / Master / Worker hierarchy.

This assignment does not modify PJM/Master/Codex Worker contracts.

### Composio Executor

Composio may internally launch an execution worker.

That process is a **Composio Executor**.

It is transport infrastructure only.

It is not:

- a Contract Worker
- a Codex Worker
- a Master
- a PJM
- an authority on product direction

The Contract Worker chat owns reasoning and prepares the exact bounded GitHub transaction.

## Goal

Establish a durable Contract Worker coordination system for field that allows ordinary ChatGPT chats to execute independent repository assignments through Composio without becoming part of the Codex hierarchy.

The system must support:

- independent assignments
- deterministic ownership
- one implementation branch per Contract Worker
- Draft PR identity
- durable Contract Worker communication
- durable QA evidence
- safe eventual merge
- coexistence with existing Codex work

## Two execution lanes

field has two distinct execution systems.

### Codex lane

```text
PJM
→ Master
→ Codex Worker
```

Existing PJM/Master contracts remain authoritative.

Local-repository and installer workflows may remain appropriate here.

### Contract Worker lane

```text
Contract Worker chat
→ bounded Composio GitHub transaction
→ assignment branch / Draft PR
→ project-appropriate QA
→ deterministic merge gate
```

Do not silently mix the two systems.

## Three coordination planes

### Control plane

Permanent branch:

```text
field/control
```

Contains coordination state only:

```text
.field/assignments/assignment-<assignment-id>.md
.field/mail/<assignment-id>.md
.field/qa/<assignment-id>.md
```

`field/control` must never merge into `main`.

### Implementation plane

Every Contract Worker assignment receives:

```text
field/<assignment-id>
```

and one Draft PR targeting `main`.

Implementation source belongs here.

### Runtime QA plane

The environment where the actual implementation is exercised.

For web field work this will eventually be the assignment branch Preview.

The QA plane must remain separate from both control and implementation state.

## Bootstrap note

The current file:

```text
.field/assignments/assignment-field-worker-coordination-v2.md
```

currently lives on:

```text
field/field-worker-coordination-v2
```

because it bootstrapped this migration before `field/control` existed.

That is a migration exception.

Future canonical assignment/control files belong on `field/control`.

## Assignment naming

Every new Contract Worker assignment must be named:

```text
assignment-<unique-name>.md
```

Never plain:

```text
assignment.md
```

Unique names use lowercase kebab-case.

## Assignment identity

Every Contract Worker assignment has a 1:1 relationship between:

```text
assignment ID
assignment file
implementation branch
Draft PR
Contract Worker chat
```

Example:

```text
assignment:
dashboard-canvas-shell

file:
assignment-dashboard-canvas-shell.md

branch:
field/dashboard-canvas-shell

PR:
[field] dashboard-canvas-shell
```

## Ownership

During migration, ownership checks must consider both systems.

### Legacy

Existing active `tracker.md` `Owned:` reservations remain authoritative until those assignments complete.

### Contract Worker v2

Active assignment files on `field/control` become the Contract Worker ownership database.

Semantics remain:

```text
owned
= primary modification authority

approved_shared
= explicit deliberate overlap

protected
= this assignment promises not to modify the path
```

`protected` does not reserve a path globally.

Parent/child path overlap counts as overlap.

A Contract Worker may not silently acquire another assignment's owned path.

## Contract Worker communication

Each Contract Worker owns exactly one mailbox:

```text
.field/mail/<assignment-id>.md
```

Only that Contract Worker writes its mailbox.

Every Contract Worker may read every mailbox.

Use mail for:

- dependency notes
- integration contract changes
- changed assumptions
- ownership reconciliation requests
- completion notes

Workers never edit another Contract Worker's mailbox.

## QA records

Each Contract Worker assignment receives:

```text
.field/qa/<assignment-id>.md
```

A QA record must identify the exact code that was tested.

Minimum fields:

```yaml
assignment:
branch:
pr:
tested_head_sha:
tested_main_sha:
environment:
build:
tests:
runtime_qa:
tested_at:
evidence:
```

Never claim a test or QA step passed unless it actually ran.

## Composio write broker

Composio is the canonical GitHub write broker for Contract Workers.

The Contract Worker:

- reasons
- scopes
- decides architecture
- prepares exact mutations
- evaluates results

The Composio Executor:

- performs exact GitHub operations
- returns evidence
- stops on missing capability

It must never:

- expand scope
- invent product architecture
- acquire ownership independently
- push implementation directly to main
- force-push
- silently substitute another GitHub integration

## Assignment authoring

Add:

```text
.field/handoff-kit/ASSIGNMENT_AUTHORING.md
```

It must teach Contract Workers how to convert:

```text
research → executable Contract Worker assignment
plan → executable Contract Worker assignment
current work → successor Contract Worker handoff
repair → bounded Contract Worker assignment
```

Core rule:

> An assignment is not a transcript. It is the smallest complete executable representation of the next unit of work.

Every new assignment file must be uniquely named.

## Handoff kit

Update the repo-hosted kit to `2026-09-26.2`.

It must clearly distinguish:

- Codex lane
- Contract Worker lane
- Night Shift terminology
- Composio Executor
- ownership model
- control plane
- implementation plane
- QA plane
- assignment authoring
- QA evidence
- merge discipline

## Compatibility

Do not delete `tracker.md`.

Do not rewrite active legacy assignment blocks.

Do not alter product source.

Do not modify PJM / Master / Codex Worker contracts.

## Validation

Required:

- handoff-kit self-test
- assignment filename/frontmatter validation
- ownership parser tests
- legacy tracker + Contract Worker ownership coexistence tests
- mailbox one-writer contract tests where practical
- QA record schema tests
- control-plane path tests
- Bash/Node/Python syntax where relevant
- `git diff --check`
- exact path allowlist

## Firecrawl

Not required for this coordination-only assignment.

No user-visible field runtime behavior is being changed.

## Successor assignment

This assignment must create a separate successor Contract Worker assignment for:

> automatic branch Preview + Contract Worker live QA infrastructure

That successor should cover:

- branch Preview deployment
- Preview URL discovery through the Draft PR
- `/builder/noauth` on the Preview
- Firecrawl small-packet QA
- exact-SHA QA recording
- merge gating

Do not silently absorb that implementation into this PR.

## Completion contract

When complete:

1. the handoff kit is `2026-09-26.2`
2. Contract Worker terminology is canonical
3. Codex terminology remains intact
4. `field/control` protocol is defined
5. assignment/mail/QA schemas are defined
6. Composio write-broker behavior is documented
7. legacy tracker ownership remains compatible
8. no product source was changed
9. a successor Preview/QA assignment exists
10. changes land through Draft PR #2