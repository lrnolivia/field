# Composio GitHub transport contract

## Purpose

Composio is the exclusive GitHub transport for field Contract Workers and the Night Shift Manager.

This applies to **reads and writes**.

## Hard prohibition

Do not call the built-in ChatGPT GitHub connector.

Do not call another GitHub plugin/app as a fallback.

Do not use web search to infer private/current repository state.

Do not use remembered branch/PR state when live Git state can be read.

## Required startup

For each GitHub workflow:

1. call `COMPOSIO_SEARCH_TOOLS`
2. verify the GitHub connection is ACTIVE
3. verify the exact repository
4. discover exact tool slugs
5. fetch current state required by the operation
6. execute the smallest bounded transaction
7. re-read/verify the result
8. report exact branch, commit SHA, PR, paths, and tool slugs when relevant

Never invent a Composio tool slug.

## Responsibility split

### Contract Worker / Night Shift Manager

Owns:

- reasoning
- architecture
- scope
- ownership
- acceptance criteria
- exact transaction intent
- evaluation of returned evidence

### Composio Executor

Owns only transport:

- repository reads
- branch/ref operations
- file commits
- PR operations
- status/check reads
- explicitly authorized merges

The Composio Executor does not expand scope, redesign architecture, acquire ownership, or create field sub-agents.

## Mutation rules

- no force-push
- no routine implementation writes directly to `main`
- no extra branches/files/issues/PRs outside the bounded transaction
- stop on conflicting existing state
- preserve unrelated work
- merge only when explicitly authorized by the current assignment/manager and the merge gate passes


## Transport/tooling blockers

A deterministic Composio invocation failure, stale Git metadata assumption, or incorrect bounded transaction is an artificial blocker when the repository/connection itself is available.

The Contract Worker or Night Shift Manager should correct the request/tool usage and retry safely rather than stopping for user intervention.

Do not weaken repository safety rules, force-push, bypass ownership, or fall back to the prohibited native GitHub connector merely to clear a blocker.

## Failure rule

If Composio GitHub is unavailable:

```text
CONTRACT WORKER GITHUB UNAVAILABLE
```

Stop.

Do not fall back to the built-in GitHub connector.
