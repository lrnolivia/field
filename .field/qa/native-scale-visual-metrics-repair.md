# qa-native-scale-visual-metrics-repair.md

```yaml
assignment: native-scale-visual-metrics-repair
source_assignment: native-scale-tool-qa-closeout
branch: field/native-scale-visual-metrics-repair
pr: 9
base_main_sha: d9f178361333a2a3bb17be90c0277e4b98708ae4
tested_head_sha: 2980b73c216349f7f42ecea31305bf77bacd99a6
status: static-validation-pass-runtime-pending
runtime_qa: pending-exact-repair-lineage
```

## Seed failure

Original runtime Packet 1 was **FAIL — PRODUCT**:
- 100 × 50 / stroke 2 / radius 10
- factor 2 from center
- observed geometry 200 × 100 with center/history correct
- observed stroke/radius remained 2/10
- required postimage is stroke 4 / radius 20

## Repair

The repair keeps the existing wrapper-only live preview, then on commit bakes the same uniform Scale factor into native SVG source space:
- wrapper `viewBox`
- inner SVG geometry
- stroke width/dash metrics

CSS wrapper visual metrics such as `borderRadius` continue through the existing Scale style policy. Both channels commit before the single existing `flushNow()`, preserving one-step undo/redo.

## Exact-head validation

Against `2980b73c216349f7f42ecea31305bf77bacd99a6`:
- Scale policy: **11/11 PASS**
- Scale integration contract: **5/5 PASS**
- focused strict TypeScript: **PASS**
- RotateManager regression: **58/58 PASS**
- official ResizeManager regression: **INCONCLUSIVE / HARNESS LIMIT** — disposable Composio runner OOM-killed before assertions executed

Changed-path audit: **PASS** — four owned files only.

## Build / preview status

Cloudflare Workers Builds is failing on:
- repair head `2980b73c216349f7f42ecea31305bf77bacd99a6`
- current `main` `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- unrelated validated PR #8

Therefore the red Cloudflare check is currently a repo-wide build/preview harness blocker and is not sufficient evidence of a repair-specific failure.

## Runtime gate still required

Resume the original QA closeout at Packet 1 only after exact repair lineage can be verified in a runtime:
- preimage 100 × 50 / stroke 2 / radius 10
- factor 2, center anchor
- postimage 200 × 100 / stroke 4 / radius 20
- center unchanged
- one undo restores preimage
- one redo restores postimage

PR #9 remains Draft until that runtime packet passes.
