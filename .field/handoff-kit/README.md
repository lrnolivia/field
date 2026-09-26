# field handoff kit

Canonical repository-owned process infrastructure for field assignments.

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
