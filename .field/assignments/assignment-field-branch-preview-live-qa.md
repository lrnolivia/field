# assignment-field-branch-preview-live-qa.md

---
field_assignment: 1
id: field-branch-preview-live-qa
status: ready-for-activation
branch: null
pr: null
base: fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e
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

## Activation dependency

Coordination v2 is merged and verified. Before activation:

1. refresh current `main`
2. refresh active legacy `tracker.md` ownership
3. refresh active Contract Worker ownership on `field/control`
4. resolve exact implementation paths without collision
5. then create `field/field-branch-preview-live-qa` and its Draft PR from then-current `main`

## Implementation intent

Build the smallest deterministic Preview/QA infrastructure supporting automatic assignment-branch Preview deployment, reliable Preview URL discovery, `/builder/noauth`, isolated non-production QA state, Firecrawl small-packet QA, exact tested branch/main SHA recording, stale-QA detection, and clear harness-vs-product failure classification.

## Acceptance criteria

- [ ] Contract Worker branch deploys without touching production state
- [ ] Draft PR exposes or deterministically leads to the Preview URL
- [ ] `/builder/noauth` works on the Preview
- [ ] Firecrawl can execute a small independent QA packet against the branch Preview
- [ ] QA records exact `tested_head_sha` and `tested_main_sha`
- [ ] stale QA is detected when branch head or relevant `main` changes
- [ ] Preview/deployment failures are classified as harness/environment rather than silently as product bugs
- [ ] production deploy remains a separate post-merge truth check where required

## Out of scope

- unrelated field product UI/features
- weakening Cloudflare Access globally
- widening `/builder/noauth` into authenticated APIs
- replacing production QA with Preview QA

## Current status

Ready for activation. No implementation ownership is reserved yet.
