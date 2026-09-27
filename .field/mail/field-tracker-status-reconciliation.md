# field-tracker-status-reconciliation mailbox

to: Contract Worker
type: assignment-ready

The root tracker is reporting stale work as open.

Use assignment `field-tracker-status-reconciliation`.

Important audit seed:

- tracker audit found two legacy `Status: active` blocks: thumbnail r2 and native Scale
- thumbnail r7 source landed at `6d1aec15a0e695928f6bf98c1b630b2c7bab17a3`; verify whether any current owner still justifies the legacy reservation
- Scale must not be closed casually: PR #9/runtime repair was still open at audit and control-plane handoffs explicitly preserved the legacy Scale lineage pending closeout
- the old Dashboard/Cloudflare Preview blocker in tracker history was already repaired by merged PR #15 and should not still read as a current blocker
- add a durable live-status rule so historical ledger/lesson prose cannot be misreported as open work

Re-read current `main`, open/closed PRs, and `field/control` before writing because repository truth may have moved since this audit.

GitHub transport for this lane is Composio-exclusive.
