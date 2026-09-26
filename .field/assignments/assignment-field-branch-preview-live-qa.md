# assignment-field-branch-preview-live-qa.md

---
field_assignment: 1
id: field-branch-preview-live-qa
status: planned-awaiting-coordination-v2-merge
branch: null
pr: null
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.2
type: follow-up
execution_class: contract-worker
owned: []
approved_shared: []
protected:
  - src/**
qa:
  firecrawl: true
  authenticated: false
---

## Goal

Give Contract Workers a real assignment-branch Preview environment that can be discovered from the Draft PR and exercised with Firecrawl before merge.

## Why this exists

PR #2 establishes the Contract Worker coordination model, but branch Preview currently cannot be assumed to work. Cloudflare attempted builds for the coordination branch and reported failures. Runtime QA needs a deterministic branch-specific environment rather than testing `main` or relying on screenshots/claims.

## Activation dependency

Do not activate implementation ownership until:

1. PR #2 has merged.
2. `main` exposes handoff kit `2026-09-26.2`.
3. current legacy and Contract Worker ownership has been refreshed.
4. exact implementation paths have been resolved without collision.

At activation, set:

```text
branch: field/field-branch-preview-live-qa
pr: <draft-pr-number>
base: <then-current-main-sha>
status: active
```

## Implementation intent

Build the smallest deterministic Preview/QA infrastructure that supports:

- automatic branch Preview deployment for Contract Worker PRs
- reliable Preview URL discovery from GitHub/PR deployment state
- `/builder/noauth` on the branch Preview
- isolated/non-production QA state
- Firecrawl small-packet QA against the assignment Preview
- exact tested branch/main SHA recording
- merge gating based on the QA record
- clear classification of Preview/deployment harness failures versus field product failures

## Acceptance criteria

- [ ] a Contract Worker branch can deploy without touching production state
- [ ] its Draft PR exposes or deterministically leads to the Preview URL
- [ ] `/builder/noauth` works on that Preview
- [ ] Firecrawl can execute a small independent QA packet against the branch Preview
- [ ] QA evidence records exact `tested_head_sha` and `tested_main_sha`
- [ ] a stale QA record is detected when branch head or relevant main changes
- [ ] a Preview/deployment failure is classified as harness/environment rather than silently as a field product bug
- [ ] production deploy remains a separate post-merge truth check where required

## Intended ownership at activation

Resolve against live ownership before activation. Likely infrastructure surfaces may include:

- Cloudflare/deployment configuration
- branch-preview workflow/configuration
- handoff-kit QA documentation/tests needed to encode the Preview contract

Do not pre-reserve these paths while this assignment is only planned.

## Out of scope

- unrelated field product UI/features
- weakening Cloudflare Access globally
- widening `/builder/noauth` into authenticated APIs
- replacing production QA with Preview QA
- changing active legacy Worker product paths merely to make Preview work

## QA strategy

Primary:
- real branch Preview
- Firecrawl small-packet QA

Secondary:
- deployment/check evidence
- exact URL/route/status evidence
- browser DOM/geometry evidence where relevant

Authenticated persistence behavior remains separate when `/builder/noauth` cannot prove it.
