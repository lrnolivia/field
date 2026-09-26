# field assignment

---
field_assignment: 1
id: field-worker-coordination-v2
status: active
branch: field/field-worker-coordination-v2
base: <baseline-main-sha>
kit: 2026-09-26.1
type: plan-to-action
owned:
  - .field/handoff-kit/**
  - .field/assignments/**
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
Target Handoff Kit Version: `2026-09-26.2`

Canonical repository:
`https://github.com/lrnolivia/field`

Canonical handoff kit:
`https://github.com/lrnolivia/field/tree/main/.field/handoff-kit`

## Mandatory rehydration

Before planning or implementation:

1. Read the current repo-hosted handoff kit from `main`.
2. Read the live `tracker.md`.
3. Inspect current `origin/main`.
4. Inspect active unmerged `field/*` assignment branches / PRs where available.
5. Treat remembered/copied installer, ownership, deployment, and QA process as stale where this assignment replaces it.

Keep valid product decisions and verified implementation findings. This assignment changes coordination infrastructure only.

## Goal

Migrate field worker coordination from shared-main tracker reservations toward **branch-per-assignment coordination**, with Composio acting only as a bounded GitHub write broker.

Every new executable unit of work should have:

```text
assignment file:
.field/assignments/assignment-<unique-name>.md

branch:
field/<unique-name>

draft PR:
[field] <unique-name>
```

The assignment branch is the machine reservation. The draft PR is the human-visible coordination surface. Workers must not push implementation directly to `main`.

## Why this exists

ChatGPT worker chats have not been able to rely on the built-in GitHub connector for writes. Composio is the write path, although it may launch its own execution worker.

That Composio worker is infrastructure, not part of field's PJM / Master / Worker hierarchy.

The reasoning chat owns product decisions, scope, architecture, and the exact requested GitHub mutation. Composio receives a bounded transaction and returns evidence.

## Current verified state

At authoring time, the repo-hosted handoff kit on `main` is `2026-09-26.1`.

The current kit still treats `tracker.md` active `Owned:` blocks as the primary reservation model.

Existing active assignments already recorded in `tracker.md` must remain respected during migration. Do not invalidate or silently migrate them.

## Decisions already made

### Assignment naming

Plain `assignment.md` is no longer allowed for new work.

Canonical filename:

```text
assignment-<unique-name>.md
```

Rules:

- lowercase
- kebab-case
- descriptive
- unique within field
- do not use generic names such as `assignment.md`, `handoff.md`, or `task.md`

Examples:

```text
assignment-dashboard-canvas-shell.md
assignment-native-scale-tool.md
assignment-preview-component-parity.md
```

### Branch naming

Every new assignment receives:

```text
field/<unique-name>
```

The branch is created from verified current `main` before implementation.

### Pull request naming

Open a draft PR immediately after assignment registration:

```text
[field] <unique-name>
```

The draft PR is the visible assignment card and contains structured ownership metadata.

### Composio role

Composio is a GitHub transport / write broker only.

It may:

- inspect repo refs when instructed
- create assignment branches
- create/update assignment files
- open/update draft PRs
- push exact user/worker-approved files to the assignment branch when explicitly requested
- mark PR ready
- merge only when explicitly instructed after required validation/QA

It must not:

- invent product architecture
- expand assignment scope
- acquire additional ownership on its own
- create subordinate field agents
- push directly to `main`
- force-push
- merge without explicit instruction
- modify files outside the bounded transaction

### No direct implementation pushes to main

Assignment implementation lands on its `field/<unique-name>` branch.

`main` changes only through the assignment PR merge.

## Tracker transition

Do **not** delete `tracker.md`.

During transition:

1. Existing legacy active assignments in `tracker.md` remain authoritative until they complete.
2. New v2 assignments use branch + uniquely named assignment file + draft PR as their primary reservation.
3. Ownership checks must consider both legacy tracker `Owned:` paths and active unmerged `field/*` assignment branches.
4. A new assignment may not reserve a path already owned by either system.
5. `Protected:` retains its current meaning: it constrains the declaring assignment and does not globally reserve paths.
6. `tracker.md` may later become a generated/read-only overview, but that is not required to complete this migration.

## Machine-readable assignment contract

Every v2 assignment file begins with YAML frontmatter:

```yaml
---
field_assignment: 1
id: <unique-name>
status: active
branch: field/<unique-name>
base: <baseline-main-sha>
kit: <kit-version>
type: handoff | plan-to-action | repair | follow-up
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

The prose body remains authoritative for goal, decisions, acceptance criteria, validation, and handoff context.

If frontmatter and prose ownership disagree, fail closed and require repair.

## Active-branch ownership rule

The handoff kit must define deterministic local ownership inspection without requiring ChatGPT GitHub write access.

Preferred rule:

1. Fetch `origin/main` and remote `field/*` branches.
2. A `field/*` branch whose tip is already an ancestor of `origin/main` is not active.
3. An unmerged `field/*` branch with a valid `.field/assignments/assignment-<unique-name>.md` is an active v2 reservation.
4. Parse its machine-readable frontmatter.
5. Check its `owned` paths against the new assignment's intended writes.
6. Also check legacy tracker active `Owned:` reservations.
7. Stop on real ownership overlap.

Do not use branch-name existence alone as proof of active ownership when the branch has already merged.

## Assignment authoring

Add:

```text
.field/handoff-kit/ASSIGNMENT_AUTHORING.md
```

It must teach both new and existing chats how to create executable handoffs.

A worker may create a new assignment when:

- the user explicitly asks for a handoff
- implementation belongs in a separate worker/chat
- research/planning has converged into executable work
- current work discovers a genuinely separable follow-up tranche
- ownership boundaries require splitting work

Do not create assignments for vague ideas.

An assignment is ready only when:

- the next worker can understand it without the source chat
- product direction is sufficiently decided
- success can be recognized
- ownership is bounded enough to coordinate
- it does not duplicate existing active work

Core rule:

> An assignment is not a transcript. It is the smallest complete executable representation of the next unit of work.

The guide must distinguish `HANDOFF`, `PLAN → ACTION`, `REPAIR`, and `FOLLOW-UP`, plus decisions already made, investigation permitted, out of scope, verified state, proposed work, and remaining human/authenticated QA.

## Composio write broker documentation

Add:

```text
.field/handoff-kit/COMPOSIO_WRITE_BROKER.md
```

Document:

1. The current field chat owns reasoning.
2. Composio receives an exact bounded GitHub transaction.
3. The broker discovers GitHub tools rather than inventing tool slugs.
4. It verifies the connected account/repository before writes.
5. It returns evidence: branch, baseline, commit SHA, PR number/URL, paths changed, exact tool names/slugs invoked.
6. It stops rather than improvises if a requested capability is unavailable.
7. It never substitutes its own architecture or scope.
8. It never pushes implementation directly to `main`.

Include reusable prompt templates for reserve/register assignment, update assignment metadata, open/update draft PR, mark PR ready, merge after explicit approval, and abort/close without merge.

## New assignment template

Add:

```text
.field/handoff-kit/templates/assignment-unique-name.md
```

The old `templates/assignment.md` may remain temporarily only as a deprecated compatibility pointer.

The new template must include frontmatter, Mandatory rehydration, Goal, Why this exists, Current verified state, Decisions already made, Implementation intent, Acceptance criteria, Intended ownership, Investigation permitted, Out of scope, Known traps, Validation, Firecrawl QA packets, Authenticated/human QA, Handoff source, and Completion contract.

## Installer changes

Update the installer contract/templates so a v2 installer:

1. never pushes implementation directly to `main`
2. verifies the expected assignment branch exists
3. verifies assignment ID/file/branch agree
4. validates ownership against legacy tracker `Owned:` plus active unmerged v2 assignment branches
5. builds/tests in an isolated worktree using current `main` plus assignment branch state
6. reconciles moving `main` safely
7. commits/pushes only to `field/<unique-name>`
8. leaves merge as a separate explicit operation
9. records branch HEAD as the implementation candidate
10. after merge, verifies merge/deployed production commit before live QA

Preserve existing durable installer lessons.

## Acceptance criteria

- [ ] Handoff kit version bumped from `2026-09-26.1` to `2026-09-26.2`.
- [ ] `ASSIGNMENT_AUTHORING.md` exists and is linked from `CHAT_BOOTSTRAP.md`.
- [ ] `COMPOSIO_WRITE_BROKER.md` exists and defines bounded transport-only behavior.
- [ ] New assignments are named `assignment-<unique-name>.md`.
- [ ] New assignment template includes machine-readable frontmatter.
- [ ] Branch naming is standardized as `field/<unique-name>`.
- [ ] Draft PR naming is standardized as `[field] <unique-name>`.
- [ ] New worker lifecycle forbids implementation pushes directly to `main`.
- [ ] Legacy tracker assignments remain respected during migration.
- [ ] New ownership checks cover legacy tracker ownership and active unmerged assignment branches.
- [ ] `Protected:` semantics remain unchanged.
- [ ] Installer contract is branch-aware and merge is a separate explicit action.
- [ ] Firecrawl QA remains a post-deploy completion gate for applicable changes.
- [ ] Handoff-kit self-tests cover assignment filename/frontmatter/branch consistency.
- [ ] Handoff-kit self-tests cover legacy + v2 ownership coexistence.
- [ ] Handoff-kit self-tests reject plain `assignment.md` as a new assignment deliverable.
- [ ] Existing durable installer lessons are preserved.

## Intended ownership

Owned:

```text
.field/handoff-kit/**
.field/assignments/**
```

Approved Shared:

```text
tracker.md
```

`tracker.md` may receive only minimal migration documentation if genuinely necessary. Do not rewrite existing active assignment blocks.

Protected:

```text
src/**
cloudflare/**
wrangler.jsonc
package.json
package-lock.json
.env*
```

This is coordination infrastructure only. Do not modify field product behavior.

## Validation

At minimum:

- handoff-kit self-test
- assignment frontmatter parser tests
- assignment filename/branch consistency tests
- legacy tracker + v2 branch ownership tests
- Bash syntax checks
- Node/Python syntax checks for modified kit helpers
- `git diff --check`
- exact changed-path allowlist

Run product TypeScript/build only if kit changes actually touch or execute product build tooling.

## Firecrawl QA

Not required for this coordination-only assignment unless implementation changes a user-visible field runtime surface.

## Authenticated / human QA

Confirm in GitHub after merge that a test `field/<unique-name>` branch can be created, a uniquely named assignment file can live on it, and a draft PR can represent the assignment without a direct-to-main implementation push.

## Completion contract

When complete:

1. record exact kit files changed
2. record validation
3. distinguish implemented behavior from future tracker-generation ideas
4. preserve all still-valid installer lessons
5. merge through the assignment PR
6. do not leave a second competing coordination contract