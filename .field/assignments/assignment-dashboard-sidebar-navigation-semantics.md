# assignment-dashboard-sidebar-navigation-semantics.md

---
field_assignment: 1
id: dashboard-sidebar-navigation-semantics
status: active
branch: field/dashboard-sidebar-navigation-semantics
pr: null
base: d9f178361333a2a3bb17be90c0277e4b98708ae4
kit: 2026-09-26.3
type: follow-up
execution_class: contract-worker
owned:
  - src/dashboard/DashboardSidebar.tsx
  - src/dashboard/DashboardSidebar.test.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/ProjectCard.tsx
  - src/dashboard/ProjectGrid.tsx
  - src/dashboard/ProjectCardMenu.tsx
  - src/dashboard/DeleteProjectDialog.tsx
  - src/dashboard/RenameProjectDialog.tsx
  - src/dashboard/NewProjectWizard.tsx
  - src/styles/dashboard.css
  - src/backend/**
  - src/FieldShell.tsx
  - cloudflare/**
  - package.json
  - package-lock.json
qa:
  firecrawl: false
  authenticated: false
---

## Goal

Make Dashboard sidebar navigation/search semantics deterministic and keyboard-efficient without changing its visual treatment.

## Why this exists

The Dashboard Worker continues independent work while earlier tranches wait on merge/infrastructure gates. Current sidebar state is visually active through `data-active` only, and search clearing via Escape is browser-dependent rather than field-defined.

## Current verified state

- activation base: `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- active Contract Worker + legacy ownership audit found no owner for either intended path
- search already has an explicit accessible label
- nav uses real buttons but does not expose semantic current-view state

## Decisions already made

- active project view exposes `aria-current="page"`
- Escape clears a non-empty search deterministically
- Escape-to-clear keeps focus in the search control
- Escape on an already-empty search is a no-op
- no styling, Dashboard container, project data, or routing changes

## Acceptance criteria

- [ ] active nav row exposes `aria-current="page"`
- [ ] inactive nav rows do not expose `aria-current`
- [ ] nav click preserves existing `onViewChange` behavior
- [ ] Escape clears a non-empty search
- [ ] search retains focus after Escape clear
- [ ] Escape on empty search does not emit a redundant query change
- [ ] focused tests pass
- [ ] focused strict TypeScript passes
- [ ] exact changed paths remain within ownership

## Validation

- focused Vitest
- focused strict TypeScript
- exact changed-path audit
- committed-source re-read

## Runtime QA

Not required: semantic/keyboard-only repair with no visual treatment change.

## Handoff source

Current Dashboard Worker chat; explicit user direction to keep building through unrelated blockers.
