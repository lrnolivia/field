# assignment-dashboard-new-project-focus-flow.md

---
field_assignment: 1
id: dashboard-new-project-focus-flow
status: active
branch: field/dashboard-new-project-focus-flow
pr: null
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

## Mandatory rehydration

Use Composio exclusively for GitHub access. Refresh current main and active ownership before mutation.

## Goal

Make New Project keyboard focus deterministic across open and step transitions so the wizard behaves like a professional design tool rather than dropping focus when controls disappear.

## Why this exists

The Dashboard Worker is continuing independent work while earlier Dashboard PRs wait on infrastructure/merge gates.

Current New Project behavior has a bounded focus defect:
- opening calls `select()` without explicitly focusing the project-name input
- moving to “More options” removes the activated button but does not place focus on the new step
- returning Back likewise does not deliberately restore focus to the project-name control

## Current verified state

- activation base: `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- active ownership audit found no owner for either intended path
- Escape/backdrop already respect the saving state
- this tranche does not change project creation data/model behavior or visual styling

## Decisions already made

- initial open focuses and selects Project name
- entering Responsive canvases focuses the step heading
- Back restores focus/select to Project name
- keep existing Escape/backdrop saving locks intact
- no CSS, model, backend, Dashboard container, shell, or Preview changes

## Acceptance criteria

- [ ] opening the wizard focuses Project name
- [ ] opening selects the current Project name text
- [ ] More options moves focus into the Responsive canvases step
- [ ] Back restores focus/select to Project name
- [ ] Escape still closes while idle
- [ ] Escape/backdrop still do not close while creation is in flight
- [ ] focused tests pass
- [ ] focused strict TypeScript validation passes
- [ ] exact changed paths remain within ownership

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

- focused Vitest suite
- focused strict TypeScript validation
- exact changed-path audit
- committed-source re-read

## Runtime QA

Component-level focus/keyboard evidence is sufficient because no visual treatment changes.

## Handoff source

Current Dashboard Worker chat; explicit user direction to continue building when another tranche reaches blockers.

## Completion contract

- implementation remains on `field/dashboard-new-project-focus-flow`
- open one Draft PR targeting main
- update mailbox/QA
- do not modify other Dashboard assignment paths
