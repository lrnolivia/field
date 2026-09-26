# field-worker-coordination-v2 mailbox

to: Night Shift Manager and successor Contract Workers
type: completion-note

## What changed

- Contract Worker / Night Shift coordination v2 is implemented on PR #2.
- `field/control` is the canonical cross-chat control plane.
- assignment/mail/QA records are canonical there.
- Composio is the exclusive GitHub transport for all Night Shift reads and writes.
- the built-in ChatGPT GitHub connector is prohibited for this lane.
- new assignments use `assignment-<unique-name>.md`.
- legacy tracker `Owned:` remains authoritative until legacy assignments finish.

## What was tested

- Contract Worker v2 regression tests: PASS.
- handoff-kit self-test: PASS.
- Bash and Node syntax checks included in the self-test: PASS.

## What remains

- merge PR #2
- verify kit 2026-09-26.2 on `main`
- activate the separate branch Preview/live QA successor when appropriate

## The thing most likely to waste time

Do not use the built-in GitHub connector "just for reads." The Night Shift contract is Composio-exclusive for reads and writes.
