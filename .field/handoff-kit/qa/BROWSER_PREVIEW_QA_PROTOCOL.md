# Browser Preview QA protocol

Use the real field branch Preview as the canonical runtime for web-visible Contract Worker QA.

## Canonical runtime target

The tested URL must correspond to the exact PR head SHA recorded in the QA record.

For Contract Worker branch work:

1. identify the exact PR head SHA
2. wait for the Cloudflare branch Preview build for that SHA
3. resolve the branch-specific Preview URL
4. open the Preview with a browser-capable QA tool
5. use `/builder/noauth` by default when authentication is not itself under test

Do not use production to claim that an unmerged branch head was runtime-tested.

A successful CI/build check is not runtime QA.

If the required branch Preview is unavailable or the browser capability cannot exercise the acceptance criteria, classify runtime QA as `BLOCKED/UNVERIFIED — HARNESS` unless the assignment defines another valid harness.


## Canvas-dependent Preview preflight

When the acceptance surface depends on Canvas, the editor shell loading is not sufficient runtime evidence.

Before attributing a Canvas failure to the feature branch:

1. identify the branch-specific Canvas hostname used by that exact Preview
2. verify the Canvas host resolves the Canvas sandbox (/sandbox or /sandbox/index.html), not the editor root
3. verify Canvas reaches first paint
4. verify the Canvas response carries the production Canvas isolation headers:
   - Cross-Origin-Resource-Policy: cross-origin
   - Cross-Origin-Opener-Policy: same-origin
   - Cross-Origin-Embedder-Policy: credentialless
   - Origin-Agent-Cluster: ?1
5. only then exercise the feature's Canvas-dependent acceptance criteria

If the branch Preview editor loads but its Canvas host is misrouted or cannot reach first paint, classify the feature's Canvas-dependent runtime QA as shared Preview infrastructure failure unless separate evidence proves a feature regression. Do not mutate unrelated feature code to hide a Preview routing failure.

Record the exact Canvas hostname and first-paint result with the normal exact-SHA Preview evidence.

## Browser-driven QA

The browser may perform real user-facing actions required by the acceptance criteria, including:

- navigation
- opening menus/dialogs
- clicking controls
- typing into inputs
- keyboard interaction
- observing focus and visible state
- reloading and checking persistence when the Preview environment safely supports it
- capturing screenshots and runtime observations

Prefer the smallest interaction sequence that proves the behavior.

Do not replace a product interaction with direct state mutation when the acceptance criterion is about user behavior.

## Evidence

Record evidence against the exact tested branch SHA:

- PR and branch
- tested head SHA
- tested main SHA/baseline
- Preview URL
- Cloudflare build/check identifier when available
- runtime path
- browser actions performed
- expected result
- actual result
- screenshots or other supporting evidence when useful
- PASS / FAIL / BLOCKED classification

When the branch head changes, previous runtime QA becomes stale.

## Isolation and write tests

Preview runtime may be used for write-oriented QA only when the assignment's Preview storage/state is isolated from production.

Never perform destructive branch QA against production.

Keep fixtures minimal and disposable. Do not broaden QA writes beyond what is necessary to prove the acceptance criteria.

## Auth boundary

`/builder/noauth` does not prove authenticated persistence, account metadata, Access behavior, authenticated APIs, multi-session behavior, or other auth-specific requirements.

Use `AUTHENTICATED_QA.md` when those behaviors are part of the acceptance criteria.

## Classification

Use:

```text
PASS
FAIL — FIELD
BLOCKED/UNVERIFIED — HARNESS
BLOCKED — ENVIRONMENT
NOT RUN
```

A harness limitation is not a field product failure.
