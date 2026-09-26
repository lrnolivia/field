# Firecrawl QA — small-packet protocol

Use small isolated Firecrawl QA packets instead of one long browser session attempting the full acceptance surface.

## Correct runtime target

The tested URL must correspond to the code whose SHA will be recorded in the QA record.

For Contract Worker branch work, use a branch Preview that corresponds to the assignment branch / PR head when one exists.

Do not use production https://field.loew.fi/builder/noauth to claim that an unmerged branch head was runtime-tested.

Use production /builder/noauth only for explicit post-merge/production QA, or when the recorded tested SHA is the deployed production commit.

If branch Preview is required but unavailable, classify branch runtime QA as BLOCKED/UNVERIFIED — HARNESS unless the assignment explicitly permits post-merge production QA instead.

A successful CI build is not a substitute for runtime QA.

## Packet sequence

One packet should test one behavior family or roughly 1–3 related assertions.

1. Open the exact runtime target.
2. Wait for the app to settle.
3. Dismiss the legacy Welcome to Revyme onboarding with Don't show again when it appears.
4. Build the smallest fixture that proves the behavior.
5. Capture pre-operation state.
6. Perform one real user interaction.
7. Capture post-operation state.
8. Calculate explicit assertions/deltas.
9. Exercise undo/redo/history when relevant.
10. Classify the packet.
11. Stop the session before unrelated QA.

Reuse the same scrape/session identifier only for immediate same-fixture follow-ups.

## Evidence hierarchy

Prefer semantic/numerical evidence over screenshot-only evidence: routes, DOM identity/parentage, data-id, data-field-group, authored/computed styles, bounding rectangles, transforms, order, and runtime errors when available.

Screenshots are supporting optical evidence, not the only proof of structural correctness.

For Group behavior validate painted union and expected hierarchy. For nested grouping verify ancestors and world-space preservation. For transformed objects compare world geometry plus transform semantics, not just local left/top.

For Design ↔ Preview parity compare relevant identities, semantics, authored/computed styles, and geometry.

## Clipboard workaround

When clipboard behavior must be tested:

1. perform real Ctrl/Cmd+C so field populates its internal clipboard
2. grant browser clipboard permission when the harness supports it
3. write a harmless marker such as revyme-node:qa
4. perform real Ctrl/Cmd+V

Do not replace the product interaction with direct state mutation.

## Auth boundary

/builder/noauth is disposable/in-memory QA. It does not prove authenticated persistence, R2 persistence, account metadata, ETag conflict behavior, multi-session auth behavior, or protected dashboard/API behavior.

Use AUTHENTICATED_QA.md for requirements noauth cannot prove.

Access bypasses must remain narrow. Do not widen a QA bypass to the entire site or /api/*.

## Classification

Use:
PASS
FAIL — FIELD
BLOCKED/UNVERIFIED — HARNESS
BLOCKED — ENVIRONMENT
NOT RUN

A harness limitation is not a field product failure.
