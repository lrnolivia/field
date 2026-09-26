# field assignment

Assignment: `<assignment-id>`
Handoff Kit Minimum Version: `2026-09-26.1`

Canonical repository:
`https://github.com/lrnolivia/field`

Canonical handoff kit:
`https://github.com/lrnolivia/field/tree/main/.field/handoff-kit`

Operational bootstrap:
`https://github.com/lrnolivia/field/blob/main/.field/handoff-kit/CHAT_BOOTSTRAP.md`

Live tracker:
`https://github.com/lrnolivia/field/blob/main/tracker.md`

Production QA:
`https://field.loew.fi/builder/noauth`

## Mandatory rehydration

Before planning or doing work, read the current repo-hosted handoff kit and live tracker.

If this is an existing chat, treat previously remembered/copied handoff, installer, tracker, ownership, validation, deployment, or Firecrawl process as stale and superseded by the current repository kit. Keep valid product decisions and assignment-specific findings unless current repo truth or an explicit current user decision supersedes them.

Do not ask the user to upload the handoff kit.

## Goal

<what should become true>

## Acceptance criteria

- <criterion>

## Intended ownership

Owned:
- `<path>`

Approved Shared:
- `tracker.md`

Protected:
- `<paths this assignment itself promises not to touch>`

The live tracker is authoritative. Reconcile active ownership before implementation.

## Product / architecture constraints

- the website is the real artifact
- source remains first-class
- Preview is runtime truth
- trace parity bugs to first divergence
- prefer deterministic architecture for explicitly modelable concepts
- preserve field/Figma semantics

Add assignment-specific constraints here.

## Validation

Required unless explicitly inapplicable:

- package/transform rehearsal
- focused tests
- TypeScript
- `npm run build:all`
- `git diff --check`
- exact changed-path allowlist
- moving-main reconciliation
- deployment verification

## QA packets

Use the current Firecrawl small-packet protocol for visible/runtime changes.

Packet 1:
- <fixture>
- <interaction>
- <assertions>

## Authenticated / human verification

<requirements `/builder/noauth` cannot prove, or `none`>

## Deliverable

If a local installer package is required, use the canonical ZIP/folder contract and place `install-build-commit-push.sh` at package root.
