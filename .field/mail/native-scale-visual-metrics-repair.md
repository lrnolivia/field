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
