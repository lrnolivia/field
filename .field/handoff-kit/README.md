# field handoff kit

> Universal process authority: read `lrnolivia/loew-runner@main/LOEW_CHAT_BIBLE.md` and `contracts/manifest.json` first. This file is a field-specific overlay and must not fork the universal operating contract.

Canonical repository-owned process infrastructure for field execution work.

Version: `2026-09-27.1`

## Canonical process source

The handoff kit is authoritative only at:

```text
main:.field/handoff-kit/**
```

Copies on `field/control` or implementation branches are compatibility mirrors only. They may lag and must never override the current `main` kit.

Before planning or implementation, resolve the kit from current `main`. If a branch-local `.field/handoff-kit/VERSION` differs from `main`, classify it as `STALE_HANDOFF_KIT`, use the `main` copy, and do not copy stale rules forward.

Cross-chat shared-repair continuity lives at `field/control:.field/shared-repairs.json`. Rehydration must read that ledger in addition to assignment/mail/QA records.

## Two execution lanes

field has two distinct execution lanes.

### Codex lane

```text
PJM
→ Master
→ Codex Worker
```

The existing PJM/Master/Codex Worker contracts remain authoritative. Local-repository and installer workflows may remain appropriate here.

### Contract Worker lane

```text
Night Shift Manager
→ Contract Worker chat
→ Composio-exclusive GitHub transport
→ field/<assignment-id> Draft PR
→ project-appropriate QA
→ deterministic merge gate
```

Do not silently mix the two lanes.

## Contract Worker control plane

Permanent branch:

```text
field/control
```

Canonical records:

```text
.field/assignments/assignment-<assignment-id>.md
.field/mail/<assignment-id>.md
.field/qa/<assignment-id>.md
```

`field/control` is coordination infrastructure. It must never merge into `main`.

Each Contract Worker owns exactly one mailbox. Only that worker writes its mailbox; every Contract Worker and the Night Shift Manager may read every mailbox.

## GitHub transport

For the Contract Worker / Night Shift lane, **Composio is the exclusive GitHub transport for reads and writes**.

The built-in ChatGPT GitHub connector is prohibited, including read-only inspection.

Start GitHub work with `COMPOSIO_SEARCH_TOOLS`, verify an ACTIVE connection to the exact repository, and use discovered tool slugs.

If Composio is unavailable, stop. Do not fall back.

## Entry points

Read, in order:

1. `CHAT_BOOTSTRAP.md`
2. `manifest.json`
3. `CONTRACT.md`
4. `ASSIGNMENT_AUTHORING.md`
5. `COMPOSIO_WRITE_BROKER.md`
6. the current assignment/control records for the lane you are using

For Contract Workers, read live state from `field/control`. During migration, also read active legacy `tracker.md` ownership.

## Assignment naming

Every new Contract Worker assignment is:

```text
assignment-<unique-name>.md
```

Never ship a new deliverable named plain `assignment.md`.

The legacy `templates/assignment.md` file remains only as a deprecation pointer.

## QA

QA evidence is assignment-specific and exact-SHA grounded.

A successful build is not automatically runtime QA.

For web-visible field work, use the exact PR-head Cloudflare Preview and browser-driven QA as the canonical runtime verification path. The browser should interact with the real rendered site when the acceptance criteria require it; screenshots, visible state, semantic/runtime observations, and interaction results are evidence. Use `/builder/noauth` when authentication is not under test.

Do not use production to validate an unmerged branch. A head-SHA change invalidates prior runtime evidence. For non-web work, use the environment-specific harness defined by the assignment.

## Updating this kit

When a durable coordination, installer, or QA lesson is learned:

1. preserve the assignment-specific history in its control records
2. extract the reusable rule into this kit
3. add/update a regression/self-test where practical
4. bump `VERSION` and `manifest.json`
5. do not silently rewrite active assignment history

A failure should make future field work permanently safer.


## Artificial blockers

Contract Workers are expected to fix bounded artificial blockers in field's own coordination/tooling/QA process instead of stopping and waiting for the user.

Repair safely within ownership, validate the repair, record it, and continue. Escalate only genuine external, authorization, product-direction, or ownership dependencies.

Existing chats migrating into this system should read `CURRENT_WORKER_SELF_REGISTRATION.md`.
