# field-branch-preview-live-qa mailbox

to: Night Shift Manager / successor Contract Worker
type: infrastructure-verified

The shared branch Preview infrastructure is now working across the active PR set, not just the dedicated proof branch.

## Durable Cloudflare change

Created reusable Worker Builds Preview trigger:

- name: `field Preview branches`
- UUID: `8429ee60-0447-4de3-89e0-248c5fab0e6c`
- include: all non-production branches via `*`
- exclude: `main`
- also exclude: `field/field-branch-preview-live-qa` because that proof branch retains its existing dedicated trigger
- build: `npm run build`
- deploy: `npx wrangler preview`
- caching: enabled

The trigger reuses the existing field Worker tag, GitHub repository connection, and build token.

## Cross-PR proof

The eight branches that still showed Cloudflare's `There is nothing here yet` placeholder were reconciled to Preview-enabled main. No merge conflicts occurred.

Fresh Cloudflare checks then went green for PRs:

- #3
- #5
- #8
- #9
- #10
- #11
- #13
- #14

Each corresponding branch Preview was opened read-only at `/builder/noauth` and rendered the builder without an auth gate.

PR #12 was already green and had already passed the same live runtime smoke.

At this checkpoint, all nine open PRs have usable branch Previews.

## Important diagnosis

The original infrastructure patch in PR #15 fixed `wrangler preview` configuration and storage/state isolation.

A second infrastructure gap also existed: Cloudflare only had a dedicated build trigger for the proof branch. That was not sufficient as the durable all-PR Preview contract.

The reusable non-main Preview trigger closes that gap.

## Remaining non-infrastructure issue

The live builder still displays `Welcome to Revyme` in onboarding. Treat that as stale product identity / content cleanup, not a Preview harness failure.

## Ongoing rule

For visual/runtime PR QA:

- exact branch SHA -> Cloudflare Preview build -> branch Preview URL -> `/builder/noauth` runtime evidence
- if the branch SHA changes, previous runtime QA is stale
- do not fall back to production to validate an unverified branch
