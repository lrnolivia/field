# qa-dashboard-interaction-polish.md

```yaml
assignment: dashboard-interaction-polish
branch: field/dashboard-interaction-polish
pr: 5
tested_head_sha: 932af6d67c84fc0b9eccab46d6f78ad5aade49cf
tested_main_sha: 0f329ba94475288100bb4aa48338d876a8a2f5f1
environment: isolated Composio sandbox, exact-head source snapshot, disposable Node 22 toolchain
build: BLOCKED/UNVERIFIED — HARNESS
tests: PASS
runtime_qa: BLOCKED/UNVERIFIED — HARNESS
tested_at: 2026-09-26T15:25:49Z
evidence:
  - ProjectCardMenu.test.tsx: 4 passed
  - DeleteProjectDialog.test.tsx: 4 passed
  - focused strict TypeScript validation for the two changed components/tests: PASS
  - current-main drift audit: 10 handoff-kit process files changed, 0 overlap with the six Dashboard-owned source paths
  - PR #5 Cloudflare Workers build 45a092f4-8331-451f-a8e1-692624abf981 failed and produced no Preview URL
  - clean npm ci is blocked by repository lockfile integrity; package-lock.json resolves @swc/helpers 0.5.15 while a locked dependency requires >=0.5.17
```

## Product evidence

Focused behavior validation passed against exact branch head `932af6d67c84fc0b9eccab46d6f78ad5aade49cf`:

- outside pointer dismissal
- inside-menu / trigger non-dismissal
- Escape dismissal with trigger focus restoration
- unrelated-key ignore behavior
- safe Cancel autofocus
- idle Escape/backdrop dismissal
- no dismissal while deletion is in flight
- explicit permanent-delete action

A focused strict TypeScript pass also completed successfully for the changed menu/dialog components and their tests.

## Harness classification

The Cloudflare failure is not product-failure evidence. The branch build failed before a Preview URL was produced, and the relevant Preview/deployment infrastructure is owned by the separate active `field-branch-preview-live-qa` assignment.

The repository clean-install path is also currently blocked independently of this Dashboard diff: Node >=22 is required, and the committed npm lockfile is internally inconsistent around `@swc/helpers`. This assignment protects package manifests, so no package-file mutation was made.

Application build and authenticated runtime/visual QA remain unverified until those harness dependencies are repaired or a valid assignment Preview becomes available.
