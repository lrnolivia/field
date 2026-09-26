# assignment-dashboard-new-project-focus-flow.md

---
field_assignment: 1
id: dashboard-new-project-focus-flow
status: active
branch: field/dashboard-new-project-focus-flow
pr: 10
base: d9f178361333a2a3bb17be90c0277e4b98708ae4
kit: 2026-09-26.3
type: follow-up
execution_class: contract-worker
owned:
  - src/dashboard/NewProjectWizard.tsx
  - src/dashboard/NewProjectWizard.test.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/ProjectCardMenu.tsx
  - src/dashboard/DeleteProjectDialog.tsx
  - src/dashboard/RenameProjectDialog.tsx
  - src/styles/dashboard.css
  - src/backend/**
  - src/FieldShell.tsx
  - src/canvas/**
  - src/preview-sandbox/**
  - cloudflare/**
  - package.json
  - package-lock.json
qa:
  firecrawl: false
  authenticated: false
---

## Goal

Make New Project keyboard focus deterministic across open and step transitions so the wizard behaves like a professional design tool rather than dropping focus when controls disappear.

## Current verified state

- activation base: `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- implementation head: `fa46e7e675812423b6826a0d79bc3957283c22ad`
- Draft PR #10 targets `main`
- exact diff contains only the two owned paths
- focused Vitest: 4/4 PASS
- focused strict TypeScript: PASS
- no visual treatment or project-creation model behavior changed

## Decisions already made

- initial open focuses and selects Project name
- entering Responsive canvases focuses the step heading
- Back restores focus/select to Project name
- existing Escape/backdrop saving locks stay intact
- no CSS, model, backend, Dashboard container, shell, or Preview changes

## Acceptance criteria

- [x] opening the wizard focuses Project name
- [x] opening selects the current Project name text
- [x] More options moves focus into the Responsive canvases step
- [x] Back restores focus/select to Project name
- [x] Escape still closes while idle
- [x] Escape/backdrop still do not close while creation is in flight
- [x] focused tests pass
- [x] focused strict TypeScript validation passes
- [x] exact changed paths remain within ownership

## Intended ownership

Owned:
- `src/dashboard/NewProjectWizard.tsx`
- `src/dashboard/NewProjectWizard.test.tsx`

Approved Shared:
- none

## Out of scope

- New Project visual redesign
- templates
- creation model/data changes
- responsive preset changes
- generic focus-trap infrastructure
- Dashboard container/CSS changes
- Preview/build harness repair

## Validation

- focused Vitest: PASS, 4/4
- focused strict TypeScript: PASS
- exact changed-path audit: PASS
- committed branch source re-read before validation

## Runtime QA

Component-level focus/keyboard evidence is sufficient because no visual treatment changes.

## Handoff source

Current Dashboard Worker chat; explicit user direction to continue building when another tranche reaches blockers.

## Completion contract

- implementation remains on `field/dashboard-new-project-focus-flow`
- Draft PR #10 targets `main`
- mailbox/QA contain exact-head evidence
- do not modify other Dashboard assignment paths
- merge remains subject to current merge authority/gate
