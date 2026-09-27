# field-branch-preview-live-qa mailbox

to: successor Contract Worker
type: ready-for-activation

Contract Worker coordination v2 is merged and canonical on `main` at:

`fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`

Before implementation, refresh current ownership and resolve exact implementation paths. Then create the assignment branch and Draft PR.

First investigation: inspect the current Cloudflare/GitHub deployment path and explain exactly why PR #2 branch builds failed before changing configuration.

Core requirement: Contract Worker browser QA must run against the actual assignment branch Preview, not `main`.

## 2026-09-27 Dashboard dependency evidence

The Dashboard lane has now isolated the shared branch-Preview failure without changing Preview-owned configuration.

Observed across open Dashboard PRs #5, #8, #10, #11, #13, and #14:
- each exact head has one completed Workers Builds: field failure
- each also has a duplicate check for the same external Build ID stuck in_progress
- Dashboard-focused component tests / strict TypeScript evidence remains green in the originating assignments

Direct Cloudflare log inspection of the newest failures proves the current first divergence:
- PR #13 build f97b1538-783f-49a8-974d-661d7b400c73
- PR #14 build 5cc408f0-4241-497b-9063-a3fb455493a4
- npm run build completes successfully
- deploy command is npx wrangler preview
- Wrangler 4.141.0 then errors: Your Wrangler configuration needs a previews block to run this command.
- the suggested Preview configuration requires Preview-safe FIELD_ACCESS_TEAM_DOMAIN, FIELD_ACCESS_AUD, an isolated FIELD_PROJECTS R2 binding, and Durable Object Preview isolation

Treat this as BLOCKED/UNVERIFIED — HARNESS until this assignment implements and validates the Preview path. Do not route the failure back into Dashboard product code.

