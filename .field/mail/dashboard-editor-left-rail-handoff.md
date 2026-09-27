# dashboard-editor-left-rail-handoff

Active bounded repair from live QA.

User feedback: Canvas → Dashboard is accepted. Dashboard → Canvas has stacked left-side motion because Dashboard sidebar recession overlaps the editor left rail entrance. Desired continuity is one surface dipping away and returning in editor form, with Layers/content first and the narrow tool rail following on top.

Base: `3a8f45a7f05250688a54c1fccc2634ebf1a59880`
Branch: `field/dashboard-editor-left-rail-handoff`


## Revised live-QA direction

User clarified that direct Canvas entry and Dashboard → Canvas should be separate choreographies.

Implementation head: `3c7b5cd9dbcd1f89c8fe208e92f66c1666930a6f`
PR: #32
Reconciled main: `024d594b07d6ad6e04c61383778de621f170471f`

Direct load / refresh:
- left surface at 0ms
- narrow left rail +72ms
- right inspector unchanged
- bottom toolbar unchanged

Dashboard → Canvas:
- left surface 220ms
- left rail 292ms
- inspector backing surface 238ms with ~8.5% under-damped overshoot
- bottom toolbar 292ms
- inspector content 330ms
- Canvas remains stationary
- Canvas → Dashboard remains unchanged
