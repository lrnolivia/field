# assignment-dashboard-empty-state-semantics.md

---
field_assignment: 1
id: dashboard-empty-state-semantics
status: active
branch: field/dashboard-empty-state-semantics
pr: null
base: 66a6f90ef9658e5a66409c0ebe48727715b3452b
kit: 2026-09-26.3
type: follow-up
execution_class: contract-worker
owned:
  - src/dashboard/EmptyState.tsx
  - src/dashboard/EmptyState.test.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/ProjectGrid.tsx
  - src/dashboard/ProjectCard.tsx
  - src/dashboard/DashboardHeader.tsx
  - src/dashboard/DashboardLoadingGrid.tsx
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

Expose Dashboard empty-result states as meaningful assistive-technology feedback while preserving the existing compact visual treatment exactly.

## Why this exists

UIAudit found that the dynamically inserted Dashboard empty state is currently generic markup:
- the visible title is a `strong`, not a semantic heading
- the empty-result state is not exposed as a status/live-region concept when search or view results become empty

CSS targets the existing `strong`, so semantic ARIA roles can repair this without changing layout or styling.

## Current verified state

- activation base: `66a6f90ef9658e5a66409c0ebe48727715b3452b`
- current `field/control`: `77fe7319ad53526fb8c5a9901d0280d4fdeb3c28`
- no active assignment owns `EmptyState.tsx`
- Dashboard inserts EmptyState dynamically from `getDashboardEmptyState(view, query)`
- existing CSS can remain untouched

## Decisions already made

- empty-state container exposes `role="status"`
- existing `strong` keeps its visual/CSS identity and gains `role="heading" aria-level={2}`
- no text, layout, CSS, routing, search, or Dashboard-container behavior changes

## Acceptance criteria

- [ ] empty state exposes status semantics
- [ ] empty-state title exposes level-2 heading semantics
- [ ] title/detail content remains unchanged
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
