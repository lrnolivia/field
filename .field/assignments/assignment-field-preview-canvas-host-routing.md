# assignment-field-preview-canvas-host-routing.md

---
field_assignment: 1
id: field-preview-canvas-host-routing
status: complete
branch: field/field-preview-canvas-host-routing
pr: 19
base: 5888f65dd63a6e8ff6ba829c8ac2abf0ddeacfd1
kit: 2026-09-26.4
type: repair
execution_class: contract-worker
owned: []
approved_shared: []
protected:
  - src/canvas/**
  - src/editor/**
  - src/backend/**
  - src/dashboard/**
  - src/code/**
  - src/preview-sandbox/**
  - src/design-system/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  browser_preview: true
  authenticated: false
---

## Goal

Fix branch Preview Canvas routing for every field QA lane.

This is shared Preview/QA infrastructure. It is **not motion-specific**.

## Verified root cause

Current `cloudflare/worker.js` only classifies the exact production hosts:

- `canvas.field.loew.fi`
- `preview.field.loew.fi`

Branch Preview Canvas uses hostnames such as:

- `<branch>.canvas-preview.loew.fi`

Those branch Canvas hosts currently fall through the Worker host classifier. The Worker therefore serves the editor/root asset path instead of `/sandbox`, and the Canvas-specific COOP/COEP/CORP/OAC headers are not applied.

The observed Canvas error is therefore a shared routing defect.

## Global QA directive — effective immediately

For **any branch Preview QA**, regardless of feature area:

1. If the acceptance surface depends on Canvas, verify the branch-specific Canvas host actually reaches the Canvas sandbox before attributing a Canvas error to the feature branch.
2. Until this repair lands, a Canvas failure on `*.canvas-preview.loew.fi` must first be classified as this known shared routing defect unless separate evidence proves a product regression.
3. Do not mutate unrelated feature code to hide this infrastructure failure.
4. Keep exact tested branch/main SHA evidence and report blocked runtime QA truthfully.
5. After this repair lands, Canvas first paint becomes part of the normal branch Preview preflight whenever Canvas is part of the acceptance surface.

## Important state correction

Thumbnail work is complete. Do **not** treat historical thumbnail tracker text as a current implementation blocker or as ownership relevant to this repair.

## Implementation requirements

Make the smallest deterministic routing repair.

- Recognize production Canvas host and branch/immutable Canvas Preview hostnames.
- Route recognized Canvas hosts to `/sandbox` / `/sandbox/index.html` using the same semantics as production Canvas.
- Apply the same Canvas security headers to recognized branch/immutable Canvas Preview hosts.
- Preserve editor root and site Preview routing.
- Do not weaken origin/security behavior globally.
- Add regression coverage in `cloudflare/field-persistence.test.ts` for:
  - production Canvas host
  - representative branch Canvas Preview host
  - representative immutable Canvas Preview host if Cloudflare emits a distinct immutable pattern
  - production/site Preview behavior remaining unchanged
- Update `.field/handoff-kit/qa/BROWSER_PREVIEW_QA_PROTOCOL.md` so all future Contract Workers explicitly check Canvas first paint when their acceptance surface depends on Canvas.

## QA / acceptance

- targeted Cloudflare routing tests pass
- branch Preview build/deploy passes
- exact branch Preview `/builder/noauth` loads
- its branch-specific Canvas host resolves the Canvas sandbox rather than editor root
- Canvas first paint succeeds
- Canvas security headers match production Canvas semantics
- no regression to main editor or site Preview routing
- record exact tested head/main SHA and Preview URL


## 2026-09-27 activation

- Activated from exact main 0c71cab5cdab71e651e08e9c35a3a79202eeac35.
- Repair branch: field/field-preview-canvas-host-routing.
- Implementation is limited to the three owned paths.

## 2026-09-27 root-cause expansion

Live QA proved the Worker route alone was insufficient. The editor constructs Canvas from `SANDBOX_ORIGIN` in `src/canvas-sandbox/protocol.ts` as `canvas.${window.location.hostname}`, which turns a branch editor host into an unreachable two-level hostname such as `canvas.<branch>.field-preview.loew.fi`.

This assignment therefore also owns the minimal deterministic origin resolver and focused regression test. No active worker owns these paths.

## 2026-09-27 verified closeout

- Exact tested head: `4fb9352004f879d13f614c295dec71380d57a7f9`.
- Exact tested main: `5888f65dd63a6e8ff6ba829c8ac2abf0ddeacfd1`.
- Worker routing/security tests: PASS — 10/10.
- Canvas origin resolution: PASS — 6/6.
- Branch Preview build/deploy: PASS.
- Browser runtime QA: PASS — editor loads, iframe uses the single-level `*.canvas-preview.loew.fi` host, Canvas first paint is visible, direct Canvas host serves the sandbox shell, and no Canvas start/error state appears.
- PR #19 merged as `f394090180284f3a70bdf8dd6b280f692d96d0dc`.
- Main Cloudflare deployment: PASS — Version `7a908371-4d49-409a-997a-0f20c0e95d64`.
- Ownership released.

## 2026-09-27 closeout

- PR #19 merged to main as f394090180284f3a70bdf8dd6b280f692d96d0dc.
- Exact runtime-QA head: 4fb9352004f879d13f614c295dec71380d57a7f9.
- Branch Preview: https://field-field-preview-canvas-host-routing.field-preview.loew.fi/builder/noauth
- Resolved Canvas origin: https://field-field-preview-canvas-host-routing.canvas-preview.loew.fi/
- Canvas first paint: PASS.
- Canvas isolation headers: CORP cross-origin, COOP same-origin, COEP credentialless, OAC ?1; crossOriginIsolated true.
- No TLS/certificate error, Cloudflare placeholder, 404, or 5xx was observed on the Canvas Preview.
- Exact Preview build 825f96a3-4464-4ca5-ae34-f26c2e9c8a09 passed npm run build:all and npx wrangler preview.
- Post-merge production build e2b050b6-4a4f-403c-a1f7-8b778a6062f0 passed and published Worker version 7a908371-4d49-409a-997a-0f20c0e95d64.
- Regression coverage landed in src/canvas-sandbox/origin.test.ts and cloudflare/field-persistence.test.ts. Vitest was not independently rerun during this closeout.
