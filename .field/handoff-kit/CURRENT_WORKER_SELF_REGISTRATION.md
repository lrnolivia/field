# Current Worker self-registration

> Universal process authority: read `lrnolivia/loew-runner@main/LOEW_CHAT_BIBLE.md` and `contracts/manifest.json` first. This file is a field-specific overlay and must not fork the universal operating contract.

Use this when an existing field Worker/chat has already prepared a handoff/export and now has Composio access.

The old chat should register its own durable state so the user can start a replacement chat with only the assignment ID.

## Rules

- Use Composio exclusively for every GitHub read and write.
- Read the current handoff kit from main first.
- Read field/control, active assignments, relevant mail/QA, and still-active legacy tracker ownership.
- Do not continue unrelated implementation while performing the migration.
- Do not write implementation directly to main.
- Do not overwrite another Worker's control files.
- Do not blindly apply a local patch through Composio.

## Canonical output

Fold the prepared handoff into exactly these durable records on field/control:

    .field/assignments/assignment-<unique-name>.md
    .field/mail/<unique-name>.md
    .field/qa/<unique-name>.md

Do not create a permanent handoffs or migration-manifests directory unless the current canonical kit explicitly adds one.

The assignment must distinguish:

- landed / verified
- in progress
- decided but not implemented
- unknown / unverified
- exact next actions
- ownership
- blockers/dependencies
- validation and runtime QA

The mailbox carries the concise successor note. The QA record contains only evidence that actually ran.

## Implementation identity

If active implementation remains, create/adopt:

    field/<unique-name>

and one Draft PR:

    [field] <unique-name>

If implementation already landed and only follow-up remains, register the real successor work instead of manufacturing a fake branch for completed work.

Standing manager/research roles may have branch: null and pr: null.

## Artificial blockers

If self-registration is blocked by stale metadata, old process instructions, a missing canonical record, or a deterministic Composio/tooling mistake, fix the artificial blocker when safe and within authority, record the repair, and continue.

If the blocker is an ownership collision or requires changes outside current authority, stop that conflicting mutation and register/request the smallest repair/reconciliation needed.

## Web runtime QA

Re-read current Runner Bible section 11 before carrying old QA conclusions forward. Engine routing, bounded retries, classifications, fallbacks, danger-zone handoff, and promotion rules come from Runner, not the old worker.

For field web-visible work, test the exact live PR Preview and SHA. Use deterministic Inspector/GitHub Chromium for routine visual/runtime criteria where capable; use `/qa/work/<projectId>` for read-only real saved-project truth; treat `/builder/noauth` as smoke-only; reserve Browser Run for exploratory/session behavior; and use authenticated/project-native harnesses for protected state or persistence.

Record the Preview URL, harness, actions/evidence, classification, and exact tested SHA in the assignment QA record. A build alone is not runtime QA. Do not validate an unmerged branch against production. If the branch moves, rerun affected runtime QA.

## Finish

Re-read the three canonical control files and any branch/PR you created.

Then tell the user only what they need to start the replacement chat:

- assignment ID
- current status
- branch / PR if any
- any genuine unresolved blocker

A fresh replacement chat should be able to start with:

    You're taking over <unique-name> for field. Read the current handoff kit and your canonical state from field/control, then continue from live Git truth.
