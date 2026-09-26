# field chat bootstrap

This is the canonical operational reset point for any chat doing field work.

## First choose the execution lane

### Codex lane

Use the existing PJM / Master / Codex Worker contracts.

Do not apply Contract Worker rules to Codex work unless the Codex contract explicitly adopts them.

### Contract Worker / Night Shift lane

A Contract Worker is an ordinary ChatGPT execution chat operating under one bounded assignment.

Night Shift is the informal collective term for one or more Contract Workers.

The Night Shift Manager coordinates Contract Workers but is not a PJM.

The Composio Executor is transport infrastructure only.

## Mandatory Contract Worker rehydration

Before planning or implementing:

1. Use Composio exclusively for GitHub access.
2. Start with `COMPOSIO_SEARCH_TOOLS`.
3. Verify the GitHub connection is ACTIVE for `lrnolivia/field`.
4. Read current `main` and the current handoff kit from `main`.
5. Read `field/control`.
6. Read your canonical assignment:
   `.field/assignments/assignment-<assignment-id>.md`
7. Read your mailbox:
   `.field/mail/<assignment-id>.md`
8. Read your QA record:
   `.field/qa/<assignment-id>.md`
9. Read any dependency mailboxes named by the assignment.
10. During migration, read active legacy `tracker.md` `Owned:` reservations.
11. Inspect your implementation branch / Draft PR if the assignment has one.

The built-in ChatGPT GitHub connector is prohibited for this lane, including read-only inspection.

If Composio GitHub is unavailable, stop with:

```text
CONTRACT WORKER GITHUB UNAVAILABLE
```

Do not substitute another GitHub plugin, web search, or remembered repository state.

## Fix artificial blockers before escalating

Contract Workers are expected to repair fixable process or harness friction they can safely resolve within assignment authority. Do not stop for an artificial blocker.

Stop only for genuine ownership, authorization, protected-scope, unresolved user-decision, or external failures without a safe workaround. If the fix needs new ownership, reserve it first; if it is genuinely separate work, create a successor assignment.

## Existing chat / process reset

When the current repo-hosted kit conflicts with remembered or copied process rules:

- current repo-hosted kit wins for process
- explicit current user decisions still win for product direction
- current repository/deployed infrastructure wins for implementation state

Keep valid product decisions and verified assignment-specific findings. Discard stale process mechanics.

## Truth precedence

### Product direction

1. explicit current user decision
2. `FIELD_PRODUCT_ARCHITECTURE.md`
3. `LOEWFI_NAMING_SYSTEM.md`
4. current PJM / Master contracts
5. current handoffs / recent decisions
6. historical baselines

### Implementation state

1. current repository / deployed infrastructure
2. newest verified worker report or handoff
3. older implementation docs
4. historical assumptions

Do not confuse product intent with implementation state.

## Contract Worker live coordination truth

Git-backed control state is the live cross-chat communication bus.

When asked what another Contract Worker is doing, who owns a path, what is blocked, or what is ready:

- refresh `field/control`
- read active assignments
- read relevant mailboxes
- read relevant QA records
- inspect live PR/check state
- compare active legacy tracker ownership while migration remains

Do not answer from conversation memory when live control state can answer.


## Blocker behavior

Contract Workers are expected to repair artificial blockers they discover.

If stale coordination, metadata, instructions, Composio usage, or QA harness behavior is preventing the assignment and the repair is safe and within current authority, fix the blocker, validate it, record it, and continue.

Do not stop merely to ask the user to repair our own process.

Do not cross another assignment's ownership boundary. When a blocker requires another owned surface, register/request a bounded repair dependency and continue independent work.

## Core field principle

The website is the real artifact. Source remains first-class. Preview is runtime truth. Design, source, Preview, and production should remain aligned.

For visible/runtime changes, production or assignment-preview QA is part of completion when required by the assignment.
