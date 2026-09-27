# qa-field-branch-preview-live-qa.md

```yaml
assignment: field-branch-preview-live-qa
branch: field/field-branch-preview-live-qa
pr: 15
tested_head_sha: 9863bd5412096b0893d794ce083169bedcce0cb2
tested_main_sha: afe03bed68ad2bc346c7c9b1b239ef93dcf983c3
environment: https://field-field-branch-preview-live-qa-field.lrnoliv.workers.dev
build: pass
tests: targeted-preview-infrastructure-evidence
runtime_qa: pass
tested_at: 2026-09-27T03:18:43Z
qa_current: true
```

## Exact-SHA evidence

- Cloudflare Workers Builds completed successfully for exact head `9863bd5412096b0893d794ce083169bedcce0cb2`.
- Cloudflare build ID: `c9b29684-0b1c-401b-871d-a0b93ef05a4a`.
- Build command: `npm run build`.
- Deploy command: `npx wrangler preview`.
- The Cloudflare GitHub App exposed the branch Preview URL on PR #15:
  `https://field-field-branch-preview-live-qa-field.lrnoliv.workers.dev`.
- Read-only browser QA loaded
  `https://field-field-branch-preview-live-qa-field.lrnoliv.workers.dev/builder/noauth`
  successfully with no login, CAPTCHA, or auth gate. The field builder rendered and displayed the existing onboarding UI.
- Cloudflare account inspection confirmed separate R2 buckets:
  - production: `field-projects`
  - Preview: `field-projects-preview`
- `wrangler.jsonc` binds production `FIELD_PROJECTS` to `field-projects` and Preview `FIELD_PROJECTS` to `field-projects-preview`.
- `wrangler.jsonc` repeats `FIELD_PROJECT_EVENTS` under `previews.durable_objects.bindings`. Cloudflare Worker Preview semantics provision a separate Durable Object namespace/storage for each Preview when the class is defined in the same Worker, so Preview state is isolated from production and other Previews.
- The production R2 binding and top-level Durable Object migration remain unchanged.

## QA classification

This assignment's original failure was `BLOCKED/UNVERIFIED — HARNESS / PREVIEW CONFIG`, not a field product failure.

The exact branch now builds, deploys, exposes a discoverable Preview URL, and passes a read-only `/builder/noauth` runtime smoke.

## Staleness rule

This evidence is current only while:

- branch head equals `9863bd5412096b0893d794ce083169bedcce0cb2`, and
- the relevant main baseline remains `afe03bed68ad2bc346c7c9b1b239ef93dcf983c3`.

If the branch head changes, mark runtime/build QA stale and rerun Preview deployment plus runtime QA. If relevant main infrastructure changes, reconcile first and rerun the affected evidence.

## Not run / not proven

- No authenticated Preview route QA was required by this assignment.
- No deliberate project write was performed in Preview solely to prove R2 separation; isolation is proven by the distinct Cloudflare bucket plus the explicit Preview binding.
- Firecrawl was not run because the Composio Firecrawl toolkit was not connected. This was not a blocker because the permitted Composio Browser Tool produced the required independent live-runtime evidence.
