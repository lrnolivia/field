# assignment-dashboard-interaction-polish.md

---
field_assignment: 1
id: dashboard-interaction-polish
status: active
branch: field/dashboard-interaction-polish
pr: 5
base: 5ca48d5e99fbc90e07a1bc8707486defa05430ae
kit: 2026-09-26.2
type: repair
execution_class: contract-worker
owned:
  - src/Dashboard.tsx
  - src/dashboard/ProjectCardMenu.tsx
  - src/dashboard/ProjectCardMenu.test.tsx
  - src/dashboard/DeleteProjectDialog.tsx
  - src/dashboard/DeleteProjectDialog.test.tsx
  - src/styles/dashboard.css
approved_shared: []
protected:
  - src/FieldShell.tsx
  - src/field-shell-motion.ts
  - src/ProjectLoader.tsx
  - src/editor/header/**
  - src/backend/**
  - src/canvas/**
  - src/canvas-sandbox/**
  - src/preview-sandbox/**
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: false
  authenticated: true
---

## Mandatory rehydration

Use Composio exclusively for all GitHub reads and writes.

Read the current repo-hosted handoff kit from `main`, then read this canonical assignment, its mailbox and QA record from `field/control`, current `main`, the assignment branch/PR, and active legacy tracker ownership while migration remains.

Current repo process rules supersede stale process instructions from the source chat.

## Goal

Make the Dashboard project-card interaction layer behave like a professional design tool rather than browser-default UI: action menus dismiss predictably, keyboard dismissal restores focus correctly, and permanent deletion uses field-native destructive confirmation.

## Why this exists

The user designated the current chat as the Dashboard Worker and asked it to start work. The initial pre-contract audit found two bounded interaction defects that can be repaired without crossing into editor handoff, thumbnail capture, persistence, canvas, Preview, or Cloudflare ownership.

Contract Worker coordination v2 landed on `main` after the initial implementation branch and Draft PR had already been created. This assignment migrates that work into the canonical control/branch/PR model rather than carrying the obsolete process forward.

## Current verified state

- Current activation base is `5ca48d5e99fbc90e07a1bc8707486defa05430ae`.
- Contract Worker kit is `2026-09-26.2`.
- Active legacy `Owned:` paths were refreshed before activation; none overlap the six intended owned paths in this assignment.
- Active Contract Worker `owned` paths were refreshed before activation; none overlap the six intended owned paths in this assignment.
- Pre-contract branch `dashboard-worker/menu-dismiss-20260926` contains the candidate repair at head `b24c5abb8388f25f8d85a8efe98ba235ee283268`.
- Pre-contract Draft PR #4 targets `main`; it is migration input only and is not the canonical PR for this assignment.
- Canonical branch `field/dashboard-interaction-polish` exists at `932af6d67c84fc0b9eccab46d6f78ad5aade49cf`, created from the activation base without carrying the obsolete branch ancestry.
- Canonical Draft PR #5 targets `main`.
- No focused tests, TypeScript validation, build, or runtime QA have yet been recorded as passing for the canonical assignment.

## Decisions already made

- Project action menus close on outside pointer interaction.
- Escape closes an open project menu and returns focus to its trigger.
- Pointer interaction inside the menu or on its trigger must not be treated as an outside dismissal.
- Permanent deletion must not use `window.confirm()`.
- The destructive confirmation defaults focus to Cancel.
- The destructive confirmation cannot be dismissed while deletion is in flight.
- The repair remains Dashboard-local. Do not modify shell handoff, thumbnail capture, persistence, Cloudflare, canvas, or Preview architecture.

Do not reopen these without a concrete repository conflict or explicit user change.

## Implementation intent

Reapply the reviewed six-file candidate diff onto current `main` as one canonical Contract Worker implementation branch, preserving unrelated current-main work. Repair any compile/test/style regressions exposed by the current base. Retire the obsolete pre-contract branch/PR only after the canonical replacement exists.

## Acceptance criteria

- [ ] Project card action menu dismisses on pointer interaction outside the menu/card trigger.
- [ ] Project card action menu remains open for pointer interaction inside the menu.
- [ ] Project card action menu does not mis-handle its own trigger as an outside press.
- [ ] Escape dismisses the open project menu and restores focus to the project menu trigger.
- [ ] Permanent deletion no longer calls `window.confirm()`.
- [ ] Permanent deletion uses a field-native modal with explicit destructive copy and action.
- [ ] Cancel receives default focus when the delete dialog opens.
- [ ] Escape and backdrop dismissal work while idle.
- [ ] Escape/backdrop cannot dismiss the dialog while deletion is in flight.
- [ ] Existing secondary modal button styling does not override the destructive button treatment.
- [ ] Focused tests pass.
- [ ] TypeScript validation passes.
- [ ] Production build validation passes where the repository harness permits it.
- [ ] Exact changed paths remain within assignment ownership.
- [ ] Moving-main reconciliation is complete before merge.
- [ ] Authenticated visual QA is recorded, or explicitly classified as blocked/unverified with the exact harness limitation.

## Intended ownership

Owned:
- `src/Dashboard.tsx`
- `src/dashboard/ProjectCardMenu.tsx`
- `src/dashboard/ProjectCardMenu.test.tsx`
- `src/dashboard/DeleteProjectDialog.tsx`
- `src/dashboard/DeleteProjectDialog.test.tsx`
- `src/styles/dashboard.css`

Approved Shared:
- none

Protected:
- shell/editor handoff paths
- thumbnail capture/runtime paths
- backend/persistence paths
- canvas/Preview paths
- Cloudflare/deployment configuration
- package manifests and environment files

## Investigation permitted during implementation

- Current-main drift in the six owned paths.
- TypeScript, React, Testing Library, or CSS issues caused directly by this repair.
- Existing Dashboard component contracts needed to preserve menu-trigger focus and destructive-dialog semantics.
- Validation harness behavior needed to run the required focused tests/build without changing protected infrastructure.

## Out of scope

- Dashboard/editor transition choreography.
- Thumbnail generation, freshness, or R2 persistence.
- Project metadata API behavior.
- New Project wizard redesign.
- Project-card layout redesign unrelated to the interaction defects above.
- Canvas, Preview, inspector, or design-system architecture.
- Cloudflare/auth/deployment changes.
- General Dashboard feature expansion; separate findings require a successor assignment.

## Known traps / prior findings

- The shared secondary modal button selector originally also matched the new destructive button; the candidate repair excludes `.field-dashboard-modal-danger` from that selector.
- Browser-default confirmation UI is not acceptable as finished field UI.
- `protected` paths in another assignment are not global ownership; only active `owned` paths reserve modification authority.
- The pre-contract branch name and PR do not satisfy Contract Worker v2 identity rules and must not be treated as canonical.

## Validation

- focused Vitest suites for ProjectCardMenu and DeleteProjectDialog
- TypeScript validation
- application build validation
- exact changed-path audit
- moving-main reconciliation
- re-read committed source from Git

## Runtime QA

Primary evidence:
- authenticated Dashboard visual/interaction QA against the assignment branch Preview when available

Secondary evidence:
- focused component tests and build evidence tied to the exact branch SHA

Human/authenticated QA:
- required for final visual confirmation because the Dashboard project browser is an authenticated product surface; if no assignment Preview can expose it, classify runtime QA precisely rather than substituting production `main`.

## Handoff source

- Current field Project chat, user direction: this chat is the new Dashboard Worker; start work; fix anything in the way.
- Pre-contract branch `dashboard-worker/menu-dismiss-20260926`, commits `a2cff34b804c8a9c094e2fa5cd495882133109a2`, `dc293e783bdd7e611dd19174085a27fc2e925d0d`, and `b24c5abb8388f25f8d85a8efe98ba235ee283268`.
- Pre-contract Draft PR #4.

## Completion contract

- implementation remains on `field/dashboard-interaction-polish`
- do not push implementation directly to `main`
- update this worker's mailbox and QA record
- record QA against exact tested branch/main SHAs
- merge only after the current merge gate passes
- retire obsolete pre-contract branch/PR after canonical replacement exists
- separate follow-up work gets a new `assignment-<new-unique-name>.md`
