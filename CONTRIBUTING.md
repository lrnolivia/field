# Contributing to field

field is a visual web design environment by loew.fi where the design is the real website.

Revyme is the technical origin; field is the product.

Before contributing, read:

- `README.md`
- `.field/handoff-kit/CHAT_BOOTSTRAP.md`
- `.field/handoff-kit/CONTRACT.md`

If you are working under a Contract Worker assignment, also read the canonical assignment, mailbox, and QA record from `field/control`.

## Core expectations

Keep these aligned:

- Design
- source
- Preview
- production behavior

Source remains first-class. Preview is runtime truth. Fix parity at the first point of divergence rather than masking it cosmetically.

Preserve existing semantic concepts and compatibility contracts unless the assignment explicitly changes them.

## Setup

Requires Node 22+.

`npm ci`

Run all local surfaces:

`npm run dev`

The default local surfaces are:

- editor — 3333
- Canvas — 5174
- Preview — 5175

## Validation

Use the smallest relevant validation set, then expand as required by the assignment.

Common commands:

`npm run test:run`
`npm run lint`
`npm run build:all`
`npm run e2e`

Other supported test/build commands live in `package.json`.

Do not report tests, runtime QA, or authenticated QA as passed unless they actually ran.

## Contract Worker contribution flow

Contract Workers use:

`field/control` for coordination
`field/<assignment-id>` for implementation
one Draft PR per activated assignment

Composio is the exclusive GitHub transport for Contract Worker / Night Shift reads and writes. Do not use the built-in ChatGPT GitHub connector for that lane.

Respect the union of active Contract Worker ownership and still-active legacy tracker ownership during migration.

Do not push Contract Worker implementation directly to `main`.

## Artificial blockers

A defect in our own process should normally become work, not a reason to stop.

When stale instructions, branch/PR bookkeeping, coordination metadata, deterministic tooling, or a QA harness defect blocks progress, repair it when the fix is bounded and within current ownership/authority. Validate and record the repair, then continue.

If the repair needs another assignment's owned path, new authorization, or a product decision, register/request the smallest dependency instead of trespassing.

## Pull request quality

A merge-ready change should make clear:

- what changed
- what was tested
- runtime QA status where applicable
- exact unresolved items
- any architecture/process drift
- follow-up work that belongs in a separate assignment

Reconcile against current `main` before merge and keep QA tied to the exact tested SHAs.

## Upstream compatibility

Do not mechanically rename Revyme-prefixed runtime/dependency identifiers that still represent real compatibility boundaries.

`LICENSE` and `NOTICE` remain authoritative and required attribution must stay intact.
