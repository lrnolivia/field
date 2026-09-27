# assignment-dashboard-collection-semantics.md

---
field_assignment: 1
id: dashboard-collection-semantics
status: active
branch: field/dashboard-collection-semantics
pr: 13
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
- the project grid was visually a collection but exposed no list semantics
- project cards were not exposed as collection items
- the visible project count was an unlabeled bare number
- initial loading feedback was visual/busy-state based, but not exposed as a status region

## Current verified state

- activation base: `66a6f90ef9658e5a66409c0ebe48727715b3452b`
- active Contract Worker + legacy ownership audit found no owner for any intended path
- canonical implementation head: `007d20c42c01fdf716b668af6868086c9dbd12f9`
- Draft PR #13 targets `main`
- DashboardCollectionSemantics.test.tsx: 3/3 PASS
- focused strict TypeScript: PASS
- exact base diff contains only the five owned paths
- no CSS or visual treatment changed

## Decisions already made

- project grid exposes `role="list"`
- project cards expose `role="listitem"`
- visible project count exposes contextual accessible naming with singular/plural project wording
- initial loading grid exposes a named `role="status"` while preserving `aria-busy`
- no layout, styling, routing, project-data, menu/dialog, or backend behavior changes

## Acceptance criteria

- [x] project grid exposes list semantics
- [x] each rendered project card exposes list-item semantics
- [x] project count exposes contextual accessible text
- [x] initial loading grid exposes a named status region and remains busy
- [x] focused tests pass
- [x] focused strict TypeScript passes
- [x] exact changed paths remain within ownership

## Validation

- focused Vitest: 3/3 PASS
- focused strict TypeScript: PASS
- exact changed-path audit: five owned paths only
- committed-source re-read: PASS
- patch-generation escape defect was caught by committed-source re-read and corrected before validation
- disposable TypeScript harness initially included its Vitest config without Node types; harness include was repaired outside repository source and rerun PASS

## Runtime QA

Not required: semantic-only repair with no visual treatment change.

## Handoff source

Current Dashboard Worker chat; user explicitly requested continued UI work using UI UX Designer and UIAudit guidance.
