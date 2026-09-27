# field-branch-preview-live-qa mailbox

to: Night Shift Manager / successor Contract Worker
type: ready-for-review

PR #15 now has a real, isolated Worker Preview for the exact assignment head.

## Current implementation

- branch: `field/field-branch-preview-live-qa`
- PR: #15
- tested head: `9863bd5412096b0893d794ce083169bedcce0cb2`
- tested main: `afe03bed68ad2bc346c7c9b1b239ef93dcf983c3`
- implementation diff at tested head: `wrangler.jsonc`
- Cloudflare build ID: `c9b29684-0b1c-401b-871d-a0b93ef05a4a`
- Preview URL: `https://field-field-branch-preview-live-qa-field.lrnoliv.workers.dev`

## What changed

`wrangler.jsonc` now defines a Worker `previews` block with:

- Preview Access verifier vars
- `FIELD_PROJECTS` bound to non-production `field-projects-preview`
- `FIELD_PROJECT_EVENTS` repeated under `previews.durable_objects.bindings`
- production `field-projects`, top-level Durable Object binding, and migrations left intact

## What was tested

- Cloudflare Workers Build succeeded for exact head `9863bd5412096b0893d794ce083169bedcce0cb2`.
- `npm run build` succeeded in Cloudflare.
- `npx wrangler preview` succeeded.
- Cloudflare posted the Preview URL automatically to PR #15.
- Direct Cloudflare account inspection confirms both `field-projects` and `field-projects-preview` exist as distinct R2 buckets.
- Cloudflare documentation confirms Worker Previews receive isolated Durable Object namespaces/storage; the env binding is correctly repeated under `previews.durable_objects`.
- Read-only Composio Browser Tool QA loaded `/builder/noauth` on the exact Preview with no auth gate and a rendered field builder UI.

## Capability note

Composio Firecrawl is not currently connected. Do not treat that as a product or harness blocker when another permitted capability proves the same acceptance criterion. Browser Tool supplied the independent runtime evidence in this run. If a future acceptance criterion specifically requires Firecrawl output, authorize that toolkit and rerun only that evidence packet.

## Remaining unverified

- authenticated Preview routes
- a deliberate Preview data mutation/write test (not required to prove the configured isolation and avoided to keep QA non-destructive)

## Merge readiness

No known Preview infrastructure blocker remains on the tested SHA.

Before merge, apply the normal exact-SHA gate:
- if branch head changes, the build/runtime QA above is stale
- if relevant main infrastructure changes, reconcile and rerun affected QA
- keep production deployment as a separate post-merge truth check

The assignment record still contains older activation metadata; Night Shift Manager should reconcile manager-owned assignment metadata to PR #15 when it next refreshes the control plane.
