# field-worker-coordination-v2 mailbox

to: Night Shift Manager and successor Contract Workers
type: completion-note

## Completed

Contract Worker / Night Shift coordination v2 is merged.

PR #2:
https://github.com/lrnolivia/field/pull/2

Merge commit:
fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e

main handoff-kit version:
2026-09-26.2

## Durable rules now in force

- Git-backed control state is the cross-chat communication bus.
- Contract Worker / Night Shift GitHub access is Composio-exclusive for reads and writes.
- Do not use the built-in ChatGPT GitHub connector for this lane.
- New assignments use assignment-<unique-name>.md.
- field/control does not merge into main.
- Legacy tracker Owned reservations remain relevant only while those legacy assignments remain active.
- Branch runtime QA must test the actual assignment branch Preview when required; production cannot be used to claim an unmerged head was tested.

## Next infrastructure work

field-branch-preview-live-qa is already registered on field/control.

Activate it only after refreshing live ownership and resolving exact implementation paths.
