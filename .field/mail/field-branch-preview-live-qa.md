# field-branch-preview-live-qa mailbox

to: successor Contract Worker
type: ready-for-activation

Contract Worker coordination v2 is merged and canonical on `main` at:

`fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`

Before implementation, refresh current ownership and resolve exact implementation paths. Then create the assignment branch and Draft PR.

First investigation: inspect the current Cloudflare/GitHub deployment path and explain exactly why PR #2 branch builds failed before changing configuration.

Core requirement: Contract Worker browser QA must run against the actual assignment branch Preview, not `main`.
