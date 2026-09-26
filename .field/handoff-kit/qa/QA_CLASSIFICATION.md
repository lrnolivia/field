# QA classification

Every live-browser packet ends in exactly one state.

## PASS

The tested acceptance criteria are supported by direct evidence.

## FAIL — FIELD

The harness successfully exercised the intended product path and the resulting state violates acceptance criteria. Include exact fixture, interaction, pre/post state, meaningful deltas, and history behavior when relevant.

## BLOCKED/UNVERIFIED — HARNESS

The harness could not reliably exercise or observe the product behavior. Do not file a field defect just because Firecrawl/Playwright could not drive or inspect something.

## Human / authenticated verification

When noauth cannot prove the requirement, name the missing verification explicitly instead of claiming completion.
