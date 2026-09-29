---
assignment: field-motion-quality
branch: field/field-motion-quality
pr: null
tested_head_sha: null
tested_main_sha: a445ee8e7acd484603fb97204ac96c5db186ed60
environment: branch Preview /builder/noauth
build: NOT RUN
tests: NOT RUN
runtime_qa: NOT RUN
tested_at: null
evidence: []
---

# field-motion-quality QA

## Baseline

Reference-quality interactions:
- dashboard/editor structural handoff
- focus-camera motion

Primary candidate issues:
- layout geometry changing outside the animation path
- pointermove state/render loops
- optical discontinuity during shell morphs
- partial reduced-motion coverage

## Gates

- Batch 2 visual QA: structural morph continuity
- Batch 4 visual QA: optical polish
- Batch 5 visual QA: secondary chrome
- Final exact-head build + reduced-motion pass before merge
