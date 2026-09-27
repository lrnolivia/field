# qa-field-glyph-system.md

```yaml
assignment: field-glyph-system
branch: field/field-glyph-system
pr: 30
status: pass
tested_head_sha: af9775d47ae1f63fe8b8ecb8d99efd02c75ff3b1
tested_main_sha: d424f8126b0b11b98777c6fc0d18a73e7813f8ee
build: PASS
tests: PASS
runtime_qa: PASS
package_lock_audit: PASS
changed_path_audit: PASS
tested_at: 2026-09-27T09:22:43Z
```

## Build

- Cloudflare Preview exact-head build `4994136d-7561-4c33-a28a-9485892a43d0`: PASS.
- Build command: `npm run build:all`.
- Exact head: `af9775d47ae1f63fe8b8ecb8d99efd02c75ff3b1`.

## Focused tests

- Isolated Vitest fixture: PASS — 1 file / 2 tests.
- `field.GLYPH contracts > keeps every reactive behavior transform-only`: PASS.
- `field.GLYPH contracts > ships canonical state-morph pairs`: PASS.
- Runtime: Vitest 3.2.7; 2/2 in 1.04s.

## Package / encapsulation audit

- `morphicons` is the only intentional dependency addition: `^1.7.1`.
- Lock entry: Morphicons 1.7.1, MIT, optional peers, no unrelated dependency feature added.
- Direct Morphicons implementation is isolated inside `src/editor/glyph/**`.
- Generic fallback is scoped to editor chrome under `data-editor-interactive=true`; authored Canvas/runtime is excluded.
- Reduced-motion fallback is present.

## Changed paths

- PR #30 changes 23 paths.
- All 23 are inside the canonical `field-glyph-system` ownership after the explicit shared-control expansion.
- Expanded shared controls: `ToolInput.tsx`, `ToolSegmentedControl.tsx`, `InspectorIconButtonGroup.tsx`.
- No protected Gallery, Scale, Dashboard, Canvas, BottomToolbar, backend, codegen/parsing, or Cloudflare paths changed.

## Coverage

- Coverage floor exceeded: more than 8 distinct editor surfaces and more than 25 interactive glyph instances are covered through explicit migrations plus shared-control multipliers.
- Explicit/stateful coverage includes SidebarRow, Layers, Inspector object header/actions, Position alignment/pins, Styles actions, left rail, left header, ToolSection, ToolSegmentedControl, InspectorIconButtonGroup, ToolInput steppers, Add/Remove/ToolPlusMinus controls.
- Editor-only fallback animates untouched direct SVG buttons while excluding explicit `field.GLYPH` / `field.MOTION` controls.
- Runtime state morphs exercised include ToolSection chevron right/down, Layers disclosure, lock/unlock, eye/eye-off, Inspector ellipsis/close, Inspector title chevron, and Styles plus/close.

## Runtime QA

Holistic exact-head Browser Tool QA on predecessor `0c31f9b3fbe9b0a372dbb588584fb2feefc78bef` after the broad coverage sweep:
- editor + Canvas health: PASS
- ToolSection disclosure morph across Position/Layout/Appearance/Fill: PASS
- Layers/Inspector morph regression: PASS
- Styles plus/close: PASS
- numeric stepper direction response: PASS
- segmented/icon groups: PASS
- left rail/header response: PASS
- generic SVG fallback: PASS
- overall verdict: **editor feels broadly alive rather than sparse**

Post-current-main reconciliation Browser Tool QA on exact head `af9775d47ae1f63fe8b8ecb8d99efd02c75ff3b1`:
- editor + Canvas health: PASS
- ToolSection rapid reversal: PASS
- Styles plus/close: PASS
- numeric steppers: PASS
- generic fallback: PASS
- Inspector state morph: PASS
- no regressions observed after syncing main

## Accepted design note

- Left rail buttons measure 24x24 at runtime because `loew-theme.css` intentionally overrides the rail geometry to 24px.
- User explicitly accepted this as non-blocking. It is not treated as a field.GLYPH defect.

## Result

PASS — `field.GLYPH` satisfies the Tranche 2 coverage, build, test, package, ownership, and runtime acceptance gates.