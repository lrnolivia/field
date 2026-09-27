# field-glyph-semantic-states mailbox

Assignment: `field-glyph-semantic-states`

## Activation

- Successor to deployed `field-glyph-system` / PR #30.
- Base: `b7864e88ee5553dafe118ad0e4ede7ca5fa5ebe0`.
- Branch: `field/field-glyph-semantic-states`.
- Scope is intentionally narrow: Interactions, Layout, Cursor, plus `src/editor/glyph/**` only.
- Broad hover/press density is already solved in main. This tranche upgrades semantic state changes to true glyph transformations.

## Performance direction

User explicitly requires 100% glyph-animation coverage without weighing field down.

Performance is now a merge gate:
- CSS/transform fallback for generic response.
- Morphicons only for true semantic state transitions.
- no per-icon hover React state/listeners/rAF loops.
- no layout-property animation or layout reads in the interaction path.
- no persistent `will-change` across large icon populations.
- dense-icon stress QA required before merge.
