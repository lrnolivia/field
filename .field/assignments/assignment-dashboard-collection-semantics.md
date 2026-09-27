# assignment-dashboard-collection-semantics.md

---
field_assignment: 1
id: dashboard-collection-semantics
status: active
branch: field/dashboard-collection-semantics
pr: null
base: 66a6f90ef9658e5a66409c0ebe48727715b3452b
kit: 2026-09-26.3
type: follow-up
execution_class: contract-worker
owned:
  - src/dashboard/ProjectGrid.tsx
  - src/dashboard/ProjectCard.tsx
  - src/dashboard/DashboardHeader.tsx
  - src/dashboard/DashboardLoadingGrid.tsx
  - src/dashboard/DashboardCollectionSemantics.test.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/DashboardSidebar.tsx
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

Make the Dashboard project collection and loading/count feedback semantically complete for assistive technology without changing visual treatment or interaction behavior.

## Why this exists

UIAudit found a bounded accessibility gap in otherwise solid Dashboard UI:
- the project grid is visually a collection but exposes no list semantics
- project cards are not exposed as collection items
- the visible project count is an unlabeled bare number
- initial loading feedback is visual and busy-state based, but not exposed as a status region

## Current verified state

- activation base: `66a6f90ef9658e5a66409c0ebe48727715b3452b`
- active Contract Worker + legacy ownership audit found no owner for any intended path
- no CSS or visual treatment change is required
- existing controls remain real buttons with existing labels/states

## Decisions already made

- project grid exposes `role="list"`
- project cards expose `role="listitem"`
- visible project count exposes a contextual accessible name with singular/plural project wording
- initial loading grid exposes a polite status region while preserving `aria-busy`
- no layout, styling, routing, project-data, or menu/dialog behavior changes

## Acceptance criteria

- [ ] project grid exposes list semantics
- [ ] each rendered project card exposes list-item semantics
- [ ] project count exposes contextual accessible text
- [ ] initial loading grid exposes a named status region and remains busy
- [ ] focused tests pass
- [ ] focused strict TypeScript passes
- [ ] exact changed paths remain within ownership

## Validation

- focused Vitest
- focused strict TypeScript
- exact changed-path audit
- committed-source re-read

## Runtime QA

Not required: semantic-only repair with no visual treatment change.

## Handoff source

Current Dashboard Worker chat; user explicitly requested continued UI work using UI UX Designer and UIAudit guidance.
