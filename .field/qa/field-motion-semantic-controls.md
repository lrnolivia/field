# field-motion-semantic-controls QA

assignment: field-motion-semantic-controls
branch: field/field-motion-semantic-controls
pr: null
tested_head_sha: null
tested_main_sha: null
environment: not-yet-run
build: NOT RUN
tests: NOT RUN
runtime_qa: NOT RUN
tested_at: null
evidence: []

## Required runtime checks

- AddButton plus glyph response with fixed target
- SidebarRow disclosure continuity and rapid reversal
- ToolSection open/close continuity without initial-mount performance
- ToolSwitch spring state and accessible state
- Spacing axis directional glyph motion
- Color swatch tactile response without picker regression
- RemoveButton and ToolPlusMinus local glyph response
- reduced-motion behavior
- no clipping, layout shift, dropped click, stale transform, or residual animation state

## 2026-09-27 audit additions

- Accessibility: keyboard/focus/ARIA state and reduced-motion alternatives must remain correct.
- Performance: prefer transform/opacity, avoid layout thrash, per-frame React state, persistent will-change, and expensive decorative effects.
- Theming: motion feedback must remain token-driven and coherent in light/dark themes.
- Responsive: preserve existing compact desktop geometry; do not introduce overflow or target drift.
- Implementation integrity: semantic field.MOTION primitives must replace one-off timing without becoming a generic animation layer or leaking into authored site behavior.
