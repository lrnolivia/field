# dashboard-editor-left-rail-handoff QA

Status: exact-head-preview-build-pass / human-live-feel-pending

Exact head: `3c7b5cd9dbcd1f89c8fe208e92f66c1666930a6f`
Reconciled main: `024d594b07d6ad6e04c61383778de621f170471f`
PR: #32
Cloudflare build: `f1ac56f3-4220-4810-929f-21bc0d7b19e9`
Build outcome: PASS
Build command: `npm run build:all`
Deploy command: `npx wrangler preview`
Immutable Preview:
- editor: `https://693617c7.field-preview.loew.fi`
- canvas: `https://693617c7.canvas-preview.loew.fi`

Acceptance encoded in source tests:
- direct load: left surface then narrow left rail; right inspector and bottom toolbar keep accepted timing
- Dashboard → Canvas: left surface 220ms, rail 292ms
- Dashboard → Canvas: inspector backing surface 238ms with under-damped inertia
- Dashboard → Canvas: bottom toolbar 292ms
- Dashboard → Canvas: inspector content 330ms
- Canvas is never a motion target
- Canvas → Dashboard is untouched

Final human feel QA is intentionally being performed live on production under explicit user authorization after merge.
