# qa-field-preview-canvas-host-routing.md

```yaml
assignment: field-preview-canvas-host-routing
branch: field/field-preview-canvas-host-routing
pr: 19
status: pass
tested_head_sha: 4fb9352004f879d13f614c295dec71380d57a7f9
tested_main_sha: 5888f65dd63a6e8ff6ba829c8ac2abf0ddeacfd1
environment: branch Preview + deployed main
build: PASS
tests: PASS
runtime_qa: PASS
tested_at: 2026-09-27T05:54:42Z
evidence: exact-head tests + Cloudflare build + Browser Tool runtime QA
```

## Deterministic validation

- Worker routing/security test: PASS — 10/10 on Node 22.
- Canvas origin resolver: PASS — 6/6 representative cases.
- Branch Preview build/deploy on exact head: PASS.
- Main deployment for merge commit `f394090180284f3a70bdf8dd6b280f692d96d0dc`: PASS.
- Main Cloudflare Version ID: `7a908371-4d49-409a-997a-0f20c0e95d64`.

## Runtime QA

- editor `/builder/noauth`: PASS
- iframe origin: `https://field-field-preview-canvas-host-routing.canvas-preview.loew.fi`
- Canvas first paint: PASS
- direct Canvas host: PASS — `#sandbox-root` shell, no 403/project-list failure
- no `Canvas is taking longer to start`: PASS
- no `Canvas error`: PASS

## Result

PASS — shared branch Canvas Preview routing/origin repair is merged and deployed.
