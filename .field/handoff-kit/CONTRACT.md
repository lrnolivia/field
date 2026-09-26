# field handoff kit contract

This contract governs field assignment packaging, installer behavior, validation, deployment verification, live QA, resume behavior, and closeout.

## Assignment versus infrastructure

`assignment.md` owns the job: goal, scope, acceptance criteria, intended ownership, special constraints, QA packets, and human verification.

The repo-hosted handoff kit owns the process: rehydration, tracker semantics, compatibility checks, installer safety, isolated validation, moving-main reconciliation, staging, commit/push, deployment verification, Firecrawl QA, and closeout/resume.

Assignments must not embed a stale copy of the handoff kit.

## Contract Worker GitHub transport

For the **Contract Worker / Night Shift lane**, Composio is the exclusive GitHub transport for **all repository access**, including both reads and writes.

- All GitHub repository reads and writes must go through Composio.
- The built-in ChatGPT GitHub connector is prohibited for Contract Worker and Night Shift operations, including read-only inspection.
- Do not substitute another GitHub plugin/app, web search, or remembered repository state.
- Start every GitHub workflow with `COMPOSIO_SEARCH_TOOLS`, verify an ACTIVE GitHub connection for the exact repository, and discover exact tool slugs rather than inventing them.
- The Contract Worker or Night Shift Manager owns reasoning, scope, architecture, ownership decisions, and the exact requested mutation.
- The Composio Executor is transport infrastructure only and must not reinterpret or expand the work.
- If Composio GitHub is unavailable, stop with:

```text
CONTRACT WORKER GITHUB UNAVAILABLE
```

Do not fall back to the built-in GitHub connector.

This exclusivity rule applies to the Contract Worker / Night Shift lane. It does not silently modify the separate PJM / Master / Codex Worker lane unless that lane's own contract explicitly adopts it.

## Standard package UX

Every delivered installer ZIP must unpack to one matching top-level directory:

```text
field-<assignment>-YYYYMMDD.zip
└── field-<assignment>-YYYYMMDD/
    ├── install-build-commit-push.sh
    ├── apply.mjs
    ├── README.md
    └── assignment-specific payload
```

The user-facing execution contract is:

```bash
cd ~/Downloads || exit 1
unzip -o field-<assignment>-YYYYMMDD.zip
cd field-<assignment>-YYYYMMDD || exit 1

chmod +x install-build-commit-push.sh
./install-build-commit-push.sh
```

The installer resolves its own absolute package directory before changing working directories.

## Preferred lifecycle

```text
current repo truth
→ target/ownership preflight
→ construct proposed postimage in isolated detached worktree
→ compatibility / transform rehearsal
→ focused tests
→ TypeScript
→ build:all
→ git diff --check
→ exact path/allowlist audit
→ re-fetch main
→ reconcile path-level drift
→ final ownership check / reservation
→ commit validated implementation
→ push
→ verify actual deployed HEAD
→ Firecrawl small-packet QA
→ authenticated/manual QA where needed
→ record evidence
→ release ownership
```

Prefer a disposable worktree for source application, validation, commit, and push. The user's real checkout may provide repository configuration and the exact dependency tree.

## Tracker semantics

- `Owned:` reserves paths against other active assignments.
- `Approved Shared:` permits deliberate overlap.
- `Protected:` constrains the assignment that declares it; it does **not** reserve paths globally.
- Cross-assignment conflict checks use active `Owned:` paths, with explicit shared exceptions.
- Every mutation target must be represented in `Owned:` or `Approved Shared:` before source publication.
- Resume an existing reservation rather than creating a duplicate.

## Git dirt and staging

- Do not require a globally clean checkout.
- Unrelated unstaged/untracked work may coexist if preserved and non-overlapping.
- Unrelated staged changes are fatal for any workflow that could commit from that checkout.
- Never stage outside the assignment allowlist.
- Never stash, `reset --hard`, force-push, or clean unrelated user/worker work.
- Parse Git porcelain without destroying leading status bytes. Prefer `git status --porcelain=v1 -z`.

## Compatibility and transforms

- Fail closed when source is not a known compatible preimage.
- Do not weaken a failed guard merely to make an installer pass.
- Exact preimages come from verified current/activation blobs.
- Required semantic anchors and optional cosmetic/comment cleanup are different classes.
- Repeated JSX/source occurrences must not assume identical indentation.
- Generated-code installers validate the generated postimage, not only installer syntax.
- Nested template strings/interpolations require real transform rehearsal.
- Node ESM package paths use `fileURLToPath(import.meta.url)`, never raw URL `.pathname`.
- Self-tests include a package path containing spaces.

## Validation

Before source publication:

1. transform/package self-test
2. focused relevant tests
3. TypeScript
4. `npm run build:all`
5. `git diff --check`
6. exact changed-path/staging allowlist audit

Isolated validation uses the repo's exact installed dependency tree and repo-local binaries. Do not allow `npx` to silently download a substitute toolchain.

When a product contract intentionally changes, audit existing regression tests for stale expectations.

## Moving main

Moving `main` is expected.

If `main` moves during validation:

- verify ancestry
- inspect whether assignment target/integration surfaces changed
- reconcile safe unrelated descendant progress
- stop on target-path overlap
- rerun relevant validation after reconciliation

Compare path sets semantically, not locale-dependent sorted strings.

## Resume and closeout

Installers recognize an existing reservation, exact known partial postimage, exact complete postimage, and landed implementation with incomplete tracker/deployment closeout.

Resume proven state instead of destructive reset/reapply.

A deployment/closeout interruption must have an idempotent coordination-only recovery path.

## Commit and deployment

- Commit only exact allowlisted implementation paths.
- Verify the implementation commit is contained in deployed production HEAD.
- Deployment verification follows the actual build-triggering HEAD.
- A later tracker-only commit must not leave the installer polling a superseded SHA.
- Coordination-state detection matches semantic records such as `Commit: <sha>`, not broad substrings.

## Live QA

For visible/runtime changes, read `qa/FIRECRAWL_QA_PROTOCOL.md`.

`/builder/noauth` is an in-memory QA harness. It can prove many editor/runtime acceptance criteria but does not prove authenticated persistence, R2 durability, account identity, or cross-session persistence semantics.

## Failure taxonomy

Classify failures as repo drift/ownership conflict, installer/harness defect, product/regression failure, deployment failure, or QA harness limitation.

Any installer defect that forces r2/r3/r4 records symptom, root cause, repo/source impact, repair, and reusable prevention rule. Durable lessons get promoted into the kit.
