# field handoff kit

Compatibility mirror of field process infrastructure for coordination records.

**Process authority is always `main:.field/handoff-kit/**`.** The copy on `field/control` may lag and must never override current `main`. Do not interpret this branch's `VERSION` as the canonical kit version.

## Shared repair continuity

Machine-readable shared infrastructure repairs live at:

```text
field/control:.field/shared-repairs.json
```

Workers, Runner, and Preview QA should use that ledger to determine whether a branch is missing a mandatory canonical repair baseline.

## Entry point for chats

Read, in order:

1. `CHAT_BOOTSTRAP.md`
2. `manifest.json`
3. `CONTRACT.md`
4. live `tracker.md`
5. the current assignment

A new or existing chat should not require the user to upload this whole directory. The assignment points to the current repository kit.

## Canonical links

Repository: `https://github.com/lrnolivia/field`

Kit: `https://github.com/lrnolivia/field/tree/main/.field/handoff-kit`

QA harness: `https://field.loew.fi/builder/noauth`

## Updating the kit

When a durable installer/QA lesson is learned:

1. preserve detailed history in `tracker.md`
2. extract the reusable rule into this kit
3. add/update a kit regression/self-test where practical
4. bump `VERSION` and `manifest.json`
5. do not silently rewrite active assignment history

A failure should make future field work permanently safer.
