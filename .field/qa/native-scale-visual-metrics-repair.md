# qa-native-scale-visual-metrics-repair.md

```yaml
assignment: native-scale-visual-metrics-repair
source_assignment: native-scale-tool-qa-closeout
base_main_sha: 5ca48d5e99fbc90e07a1bc8707486defa05430ae
original_scale_sha: ec3b443b6ff61073afe0a4cf2f1f3bc28c9aa96a
status: not-run
runtime_qa: not-run
```

## Seed failure evidence

Original QA Packet 1 classification: **FAIL — PRODUCT**.

Observed:
- 100 × 50 / stroke 2 / radius 10
- factor 2, center anchor
- 200 × 100 / stroke 2 / radius 10
- center fixed at (1013, 595)
- undo restores original geometry
- redo restores scaled geometry

Required repair:
- postimage stroke 4
- postimage radius 20
- preserve existing geometry, anchor, and history behavior

No repair validation has run yet.
