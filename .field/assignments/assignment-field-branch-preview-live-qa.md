# assignment-field-branch-preview-live-qa.md

---
field_assignment: 1
id: field-branch-preview-live-qa
status: active
branch: field/field-branch-preview-live-qa
pr: null
base: fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e
kit: 2026-09-26.2
type: follow-up
execution_class: contract-worker
owned:
  - .github/workflows/**
  - cloudflare/**
  - wrangler.jsonc
  - .field/handoff-kit/qa/**
  - .field/handoff-kit/tests/**
approved_shared: []
protected:
  - src/**
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: true
  authenticated: false
---

## Goal

Give Contract Workers a real assignment-branch Preview environment that can be discovered from the Draft PR and exercised with Firecrawl before merge.

## Activation state

Coordination v2 is merged and handoff kit `2026-09-26.2` is live on `main`.

Activation baseline:
`fea8f3c29dba1c88de79b5eaa996e4f0bb0d209e`

Implementation branch:
`field/field-branch-preview-live-qa`

## Implementation intent

Build the smallest deterministic Preview/QA infrastructure supporting automatic assignment-branch Preview deployment, reliable Preview URL discovery, `/builder/noauth`, isolated non-production QA state, Firecrawl small-packet QA, exact tested branch/main SHA recording, stale-QA detection, and clear harness-vs-product failure classification.

## Acceptance criteria

- [ ] a Contract Worker branch deploys without touching production state
- [ ] its Draft PR exposes or deterministically leads to the Preview URL
- [ ] `/builder/noauth` works on that Preview
- [ ] Firecrawl can run a small independent QA packet against the branch Preview
- [ ] QA records exact `tested_head_sha` and `tested_main_sha`
- [ ] stale QA is detected when branch head or relevant main changes
- [ ] Preview/deployment failures are classified as harness/environment failures rather than silently as field product bugs
- [ ] production deploy remains a separate post-merge truth check where required

## Out of scope

- unrelated field product UI/features
- weakening Cloudflare Access globally
- widening `/builder/noauth` into authenticated APIs
- replacing production QA with Preview QA
- changing active product-owned source paths merely to make Preview work

## QA strategy

Primary: real branch Preview plus Firecrawl small-packet QA.

Secondary: deployment/check evidence, exact URL/status evidence, and handoff-kit regression tests.
