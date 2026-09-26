# assignment-dashboard-rename-dialog-hardening.md

---
field_assignment: 1
id: dashboard-rename-dialog-hardening
status: active
branch: field/dashboard-rename-dialog-hardening
pr: 8
base: d9f178361333a2a3bb17be90c0277e4b98708ae4
kit: 2026-09-26.3
type: follow-up
execution_class: contract-worker
owned:
  - src/dashboard/RenameProjectDialog.tsx
  - src/dashboard/RenameProjectDialog.test.tsx
approved_shared: []
protected:
  - src/Dashboard.tsx
  - src/dashboard/ProjectCardMenu.tsx
  - src/dashboard/DeleteProjectDialog.tsx
  - src/styles/dashboard.css
  - src/FieldShell.tsx
  - src/backend/**
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

Use Composio exclusively for GitHub access. Read current `main`, this assignment, mailbox, QA record, active Contract Worker ownership, and active legacy `Owned:` reservations before mutation.

## Goal

Bring Rename Project interaction behavior up to the same professional standard as the hardened destructive dialog without touching the blocked Dashboard interaction PR.

## Why this exists

While PR #5 is code-green but blocked on Preview/build infrastructure, the user explicitly directed the Dashboard Worker to keep building instead of waiting at blockers.

## Current verified state

- activation base: `d9f178361333a2a3bb17be90c0277e4b98708ae4`
- canonical implementation head: `bc89cdcceb0958890d40ef1756738bf298d714fd`
- Draft PR #8 targets `main`
- focused Vitest: 6/6 passed
- focused strict TypeScript: passed
- exact branch diff contains only the two owned paths
- validation caught one real defect during implementation: selection did not guarantee focus; the component now explicitly focuses before selecting

## Decisions already made

- keep this follow-up independent of PR #5
- no Dashboard container, CSS, backend, persistence, shell, or Preview changes
- Escape closes only while idle
- backdrop closes only while idle
- Cancel is disabled while saving
- name input is disabled while saving
- existing select-on-open and trimmed-save behavior remain intact
- the project-name input receives an explicit accessible label

## Acceptance criteria

- [x] existing project name remains selected/focused on open
- [x] Escape closes while idle
- [x] Escape does not close while saving
- [x] backdrop closes while idle
- [x] backdrop does not close while saving
- [x] Cancel is disabled while saving
- [x] save submits a trimmed non-empty name only
- [x] project-name input has an explicit accessible name
- [x] focused tests pass
- [x] focused strict TypeScript validation passes
- [x] exact changed paths remain within assignment ownership

## Intended ownership

Owned:
- `src/dashboard/RenameProjectDialog.tsx`
- `src/dashboard/RenameProjectDialog.test.tsx`

Approved Shared:
- none

## Out of scope

- trigger-focus restoration requiring `Dashboard.tsx`
- modal CSS redesign
- generic modal abstraction
- focus-trap infrastructure
- project persistence/API behavior
- PR #5 files
- Preview/build harness repair

## Validation

- focused Vitest suite: PASS, 6/6
- focused strict TypeScript validation: PASS
- exact changed-path audit: PASS
- committed source re-read from Git before validation

## Runtime QA

Component-level behavior is sufficient for this bounded non-visual interaction repair. No new visual treatment is introduced.

## Handoff source

Current field Dashboard Worker chat. User direction: keep building when another tranche reaches infrastructure blockers.

## Completion contract

- implementation remains on `field/dashboard-rename-dialog-hardening`
- Draft PR #8 targets `main`
- do not modify PR #5-owned paths
- exact-head validation is complete
- merge remains subject to normal current merge authority/gate
