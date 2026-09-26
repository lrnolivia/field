# field handoff kit contract

This contract governs field assignment packaging, coordination, validation, QA evidence, and closeout.

## 1. Assignment versus infrastructure

The assignment owns the job:

- goal
- verified current state
- settled decisions
- implementation intent
- acceptance criteria
- ownership
- bounded investigation
- non-goals
- validation
- runtime QA
- completion contract

The repo-hosted handoff kit owns the reusable process.

Assignments must not embed a stale copy of the handoff kit.

## 2. Execution lanes

### Codex lane

```text
PJM → Master → Codex Worker
```

Existing PJM/Master/Codex Worker contracts remain authoritative.

### Contract Worker lane

```text
Night Shift Manager
→ Contract Worker
→ Composio-exclusive GitHub transport
→ assignment branch / Draft PR
→ project-appropriate QA
→ merge gate
```

Do not silently mix the lanes.

## 3. Terminology

**Contract Worker**: ordinary ChatGPT execution chat operating under one bounded repository assignment.

**Night Shift**: informal collective term for one or more Contract Workers working asynchronously.

**Night Shift Manager**: standing coordination chat for the Contract Worker lane. It is not a PJM.

**Codex Worker**: Worker inside the PJM / Master / Worker hierarchy.

**Composio Executor**: Composio's internal execution worker. It is transport infrastructure only, not a field organizational agent.

## 4. Contract Worker GitHub transport

For the Contract Worker / Night Shift lane, **Composio is the exclusive GitHub transport for all repository access, including reads and writes**.

- The built-in ChatGPT GitHub connector is prohibited, including read-only inspection.
- Do not substitute another GitHub plugin/app.
- Do not use web search as a repository-state substitute.
- Do not use remembered repository state when live Git state is available.
- Start every GitHub workflow with `COMPOSIO_SEARCH_TOOLS`.
- Verify an ACTIVE GitHub connection to the exact repository.
- Discover exact tool slugs. Never invent them.
- The Contract Worker or Night Shift Manager owns reasoning, scope, architecture, ownership decisions, and the exact requested transaction.
- The Composio Executor performs bounded transport only.
- Never force-push.
- Never push Contract Worker implementation directly to `main`.

If Composio GitHub is unavailable:

```text
CONTRACT WORKER GITHUB UNAVAILABLE
```

Stop. Do not fall back to the built-in GitHub connector.

This exclusivity rule applies to the Contract Worker / Night Shift lane. It does not silently modify the separate Codex lane.

## 5. Three coordination planes

### Control plane

Permanent branch:

```text
field/control
```

Canonical files:

```text
.field/assignments/assignment-<assignment-id>.md
.field/mail/<assignment-id>.md
.field/qa/<assignment-id>.md
```

`field/control` must never merge into `main`.

### Implementation plane

Every activated implementation Contract Worker assignment gets:

```text
field/<assignment-id>
```

and one Draft PR targeting `main`.

Implementation source belongs on that branch.

Standing coordination roles and pre-activation/planned assignments may have `branch: null` and `pr: null`; do not manufacture empty implementation branches.

### Runtime QA plane

The actual environment where the implementation is exercised.

For web work this may be an assignment Preview. For native/system work use the assignment's environment-specific QA harness.

The QA plane is evidence, not source/control state.

## 6. Assignment identity and naming

Every new Contract Worker assignment file must be uniquely named:

```text
assignment-<unique-name>.md
```

Never create a new deliverable named plain `assignment.md`.

For an activated implementation assignment, keep a 1:1 identity:

```text
assignment ID
↔ assignment file
↔ field/<assignment-id>
↔ Draft PR
↔ Contract Worker chat
```

The canonical assignment file lives on `field/control`.

## 7. Assignment frontmatter

Minimum Contract Worker frontmatter:

```yaml
---
field_assignment: 1
id: <unique-name>
status: active
branch: field/<unique-name> | null
pr: <number-or-null>
base: <main-sha>
kit: <kit-version>
type: handoff | plan-to-action | repair | follow-up | qa-closeout
execution_class: contract-worker
owned:
  - <path-or-pattern>
approved_shared:
  - <path-or-pattern>
protected:
  - <path-or-pattern>
qa:
  firecrawl: true | false
  authenticated: true | false
---
```

If frontmatter and prose ownership disagree, fail closed.

If `branch` is non-null, it must be exactly `field/<id>`.

## 8. Ownership

### Legacy migration compatibility

Existing active `tracker.md` `Owned:` reservations remain authoritative until those assignments finish.

### Contract Worker v2

Active control-plane assignment `owned` paths are the Contract Worker ownership database.

Semantics:

```text
owned
= primary modification authority

approved_shared
= explicit deliberate overlap

protected
= this assignment promises not to modify the path
```

`protected` is not global ownership.

Parent/child path overlap counts as overlap.

Before activation and before merge, check the union of:

1. active legacy tracker `Owned:` paths
2. active Contract Worker control-plane `owned` paths

Do not silently acquire another assignment's owned path.

## 9. Mailboxes

Each Contract Worker owns exactly one mailbox:

```text
.field/mail/<assignment-id>.md
```

Only that worker writes its mailbox. Every Contract Worker and the Night Shift Manager may read every mailbox.

Use mail for dependency notes, changed assumptions, integration contracts, ownership reconciliation requests, blockers, and completion notes.

Do not create one shared mutable notes file.

## 10. QA records

Each assignment receives:

```text
.field/qa/<assignment-id>.md
```

Minimum metadata:

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

Use classifications such as:

```text
PASS
FAIL — PRODUCT
BLOCKED/UNVERIFIED — HARNESS
BLOCKED — ENVIRONMENT
NOT RUN
```

A successful CI/build check is not automatically runtime QA.

## 11. Exact-SHA merge gate

Immediately before merge, refresh:

- current PR head SHA
- current `main` SHA
- current ownership state
- checks/statuses
- QA record

A Contract Worker implementation may merge only when the current contract's required checks and QA are satisfied and the tested SHAs still describe the code being merged.

If `main` moved after QA, reconcile and rerun the required validation/QA where the assignment could be affected.

## 12. Assignment authoring

Read `ASSIGNMENT_AUTHORING.md`.

Core rule:

> An assignment is not a transcript. It is the smallest complete executable representation of the next unit of work.

Separate follow-up work gets a new unique assignment rather than silently expanding current scope.

## 13. Installer boundary

Read `installer/INSTALLER_CONTRACT.md`.

The local installer system belongs primarily to the Codex/local-repository lane.

Do not use a legacy direct-main installer as a substitute for the Contract Worker branch/PR model.

## 14. Validation

Before publishing coordination-kit changes:

- run the handoff-kit self-test
- run Contract Worker v2 regression tests
- validate JSON
- validate Bash/Node/Python syntax where relevant
- run `git diff --check` when a checkout is available
- verify exact changed paths
- re-read the committed files from Git

For product/runtime work, add assignment-specific tests/build/QA.


## Artificial blocker repair doctrine

A Contract Worker must distinguish a **real blocker** from an **artificial blocker created by our own workflow, coordination, tooling, harness, metadata, or stale instructions**.

Examples of artificial blockers include:

- stale or contradictory handoff-kit instructions
- missing or stale control-plane records
- incorrect branch / PR metadata
- an obsolete baseline or assignment status
- a missing mailbox / QA record that the current contract requires
- a deterministic Composio/tooling mistake that can be corrected safely
- a QA harness defect that prevents otherwise-valid acceptance evidence
- a process rule that conflicts with the current canonical contract

When a Contract Worker discovers an artificial blocker, the default behavior is:

1. verify that it is actually artificial using current Git/runtime truth
2. fix it immediately when the repair is bounded, safe, and within the Worker's ownership/authority
3. validate the repair
4. record the repair in the Worker's mailbox/QA or assignment history as appropriate
5. continue the original assignment without waiting for user confirmation

Do **not** turn a repairable workflow defect into a reason to stop work.

If the repair requires a path owned by another active assignment, changes product direction, requires credentials/authorization the worker does not have, or would violate a safety/merge boundary:

- do not trespass on ownership
- register or request a bounded repair assignment / ownership reconciliation
- continue any independent work that remains possible
- report the genuine dependency precisely

A Contract Worker may expand effort to repair the road it is currently traveling; it may not use this doctrine as permission to redesign unrelated systems.

The Night Shift Manager is responsible for noticing repeated artificial blockers and promoting durable fixes into the handoff kit so later workers do not hit the same failure again.

## 15. Closeout and continuity

A completion report distinguishes:

- what changed
- what was proposed
- what was tested
- what remains unverified
- architecture/process drift
- follow-up work

Durable coordination belongs in Git-backed assignment/mail/QA records so a replacement chat can rehydrate without depending on private conversation memory.
