# field-preview-canvas-host-routing mailbox

Assignment: `field-preview-canvas-host-routing`

## 2026-09-27 global routing defect broadcast

**Applies to all branch Preview QA, not only motion.**

A user-visible Canvas error was reproduced on a successfully deployed branch Preview.

Verified cause: `cloudflare/worker.js` currently recognizes only production Canvas/Preview hostnames. Branch Canvas hostnames such as `<branch>.canvas-preview.loew.fi` fall through to editor-root routing and miss Canvas security headers.

### Required worker behavior now

- Do not fail a feature merely because branch Canvas shows this known routing error.
- Do not patch unrelated feature code to hide it.
- Record the QA as blocked by shared Preview routing unless another defect is independently proven.
- Once this repair lands, sync/rebuild the feature branch against repaired `main` and rerun its Canvas-dependent runtime QA.
- For future Canvas-dependent QA, verify Canvas first paint as part of Preview preflight.

### State correction

Thumbnail work is complete and is not a blocker for this repair.

### Repair requested

A Contract Worker should activate this assignment, fix the Worker hostname classifier + routing headers, add regression coverage, update the canonical browser Preview QA protocol, prove branch Canvas first paint on the exact repair head, and merge/close out normally.


## 2026-09-27 implementation started

- Repair branch activated from exact main 0c71cab5cdab71e651e08e9c35a3a79202eeac35.
- Deterministic fix: classify *.canvas-preview.loew.fi as Canvas while preserving production Canvas and site Preview behavior.
- Regression coverage includes the failing motion branch hostname and a hash-prefixed Canvas Preview hostname.

## 2026-09-27 closeout

Canvas Preview routing/origin repair is merged and deployed.

- PR: `#19`
- exact tested head: `4fb9352004f879d13f614c295dec71380d57a7f9`
- merged main commit: `f394090180284f3a70bdf8dd6b280f692d96d0dc`
- main Cloudflare version: `7a908371-4d49-409a-997a-0f20c0e95d64`
- routing/security tests: 10/10 PASS
- origin resolution cases: 6/6 PASS
- runtime Preview QA: PASS

Dependent branches must rebuild from repaired `main` before Canvas-dependent QA is current.
