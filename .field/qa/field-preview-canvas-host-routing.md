# qa-field-preview-canvas-host-routing.md

status: verified
assignment: field-preview-canvas-host-routing
pr: 19
tested_head_sha: 4fb9352004f879d13f614c295dec71380d57a7f9
tested_main_sha: 5888f65dd63a6e8ff6ba829c8ac2abf0ddeacfd1
merged_main_sha: f394090180284f3a70bdf8dd6b280f692d96d0dc
environment: https://field-field-preview-canvas-host-routing.field-preview.loew.fi/builder/noauth
canvas_environment: https://field-field-preview-canvas-host-routing.canvas-preview.loew.fi/
preview_build: 825f96a3-4464-4ca5-ae34-f26c2e9c8a09
build: pass
tests: regression-coverage-landed; not-independently-rerun-in-closeout
runtime_qa: pass
production_build: e2b050b6-4a4f-403c-a1f7-8b778a6062f0
production_worker_version: 7a908371-4d49-409a-997a-0f20c0e95d64
production_deploy: pass

## Runtime evidence

The branch editor rendered and resolved its Canvas iframe to the sibling canvas-preview.loew.fi hostname. Canvas reached visible first paint with no observed TLS/certificate error, Cloudflare placeholder, 404, or 5xx. Headers were CORP cross-origin, COOP same-origin, COEP credentialless, and OAC ?1; window.crossOriginIsolated was true.

## Test accounting

Regression coverage landed in src/canvas-sandbox/origin.test.ts and cloudflare/field-persistence.test.ts. Cloudflare npm run build:all passed on the exact tested head. Vitest was not independently rerun during this closeout.
