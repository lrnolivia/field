# QA classification

Use explicit evidence states. Do not convert missing evidence into a pass.

## PASS
The tested acceptance criteria are supported by direct evidence against the recorded tested code/runtime.

## FAIL — FIELD
The harness successfully exercised the intended behavior and direct evidence shows field violated the acceptance criterion.

## BLOCKED/UNVERIFIED — HARNESS
The product may be correct, but the QA harness cannot prove the requirement. Examples include a missing branch Preview or an unavailable browser capability.

## BLOCKED — ENVIRONMENT
The required external/runtime environment is unavailable or does not match the assignment.

## NOT RUN
The required check or packet has not been attempted. Never report NOT RUN as PASS.

When evidence is ambiguous, choose the less-certain classification and state what evidence is missing.
