# mail-native-scale-visual-metrics-repair.md

to: successor
type: repair-handoff

## Defect

Runtime Scale Packet 1 failed on deployed field.

Preimage:
- width 100
- height 50
- X 963
- Y 570
- stroke 2
- radius 10

Factor 2 from center produced:
- width 200
- height 100
- X 913
- Y 545
- stroke 2
- radius 10

Center stayed fixed at (1013, 595). Undo/redo geometry worked.

Expected visual metrics were stroke 4 and radius 20.

## Start here

Rehydrate current `main` handoff kit v2 and this assignment from `field/control`.

Trace why authored visual metrics do not reach the Scale commit path even though `scale-policy.ts` declares border/stroke/radius dimensional.

Do not change product semantics. Do not create a second legacy tracker reservation. Resume the existing `native-scale-tool-20260926` ownership lineage.

If mutation outside `src/canvas/scale/**` or `src/editor/scale-tool.integration.test.ts` is actually required, stop and request ownership expansion.


## Repair implementation ready for runtime closeout — 2026-09-26

- branch: `field/native-scale-visual-metrics-repair`
- Draft PR: #9
- tested head: `2980b73c216349f7f42ecea31305bf77bacd99a6`

Implemented:
- native SVG leaf Scale commit now bakes `viewBox`, inner geometry, and stroke metrics into source space
- existing wrapper CSS visual metrics, including `borderRadius`, continue to scale through the normal Scale style policy
- all authored changes still flush as one Scale history step

Static/focused validation:
- Scale policy 11/11 PASS
- Scale integration 5/5 PASS
- strict focused TypeScript PASS
- RotateManager 58/58 PASS
- ResizeManager full suite could not run to assertions because the disposable validator was OOM-killed

Cloudflare note:
- Workers Builds is red on this repair, current `main`, and unrelated PR #8. Treat that as a repo-wide preview/build blocker, not repair-specific validation.

Handoff:
- original `native-scale-tool-qa-closeout` should resume at Packet 1 against an exact runtime descendant of `2980b73c216349f7f42ecea31305bf77bacd99a6`.
