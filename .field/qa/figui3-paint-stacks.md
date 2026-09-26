# qa-figui3-paint-stacks.md

```yaml
assignment: figui3-paint-stacks
source_execution: migrated product follow-up
source_worker: field FigUI3 planning / implementation continuation chat
source_branch: null
source_pr: null
tested_head_sha: null
tested_main_sha: 7451b55f29c94e2d56e014590067e7111cd3915a
environment: GitHub source inspection + prior FigUI3 implementation evidence
build: not-run-for-this-followup
tests: not-run-for-this-followup
runtime_qa: not-run
tested_at: 2026-09-26
evidence: registration only; no paint-stack implementation exists yet
```

## Verified migration evidence

- Current `main` was read immediately before registration.
- Current `field/control` was read immediately before registration.
- Current main handoff-kit version was `2026-09-26.1`.
- No existing branch matching `figui3-paint-stacks` was found.
- No open PR matching `figui3-paint-stacks` was found.
- Active legacy ownership was reviewed.
- No active legacy assignment owned the inspected core paint paths at registration.
- The previous FigUI3 assignment was already complete before this follow-up was registered.
- Relevant current paint source was inspected:
  - `PaintRow.tsx`
  - `FillControl.tsx`
  - `background-layer-utils.ts`
  - `paint-opacity.ts`
  - text `StrokeControl.tsx`

## Prior lineage evidence — not paint-stack acceptance

The earlier FigUI3 implementation commit:

`dca7cd406f66fbfc391cec1c6ce3bb7e1c06b4ec`

had already passed its own focused regression suite and build before this follow-up existed.

That evidence proves the prior Inspector/toolbar postimage, **not** the new ordered-paint-stack requirement.

Do not inherit a PASS from it.

## Not run / not proven

For `figui3-paint-stacks`:

- no source changes exist;
- no implementation branch exists;
- no Draft PR exists;
- no focused paint-stack tests have run;
- TypeScript has not run for paint-stack changes;
- `build:all` has not run for paint-stack changes;
- no Firecrawl packet has run;
- no human visual QA has run;
- no Figma import/sync round trip has been proven;
- no persistent per-paint visibility model has been proven.

Current classification:

`NOT RUN — IMPLEMENTATION NOT STARTED`

## QA rule for successor

Never upgrade the prior FigUI3 test/build evidence into paint-stack acceptance.

Record exact implementation SHA, exact tested main SHA, environment, focused tests, build, runtime QA, and human visual QA only after they actually run.
