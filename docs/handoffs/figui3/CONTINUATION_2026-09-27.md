# FigUI3 and Open Field Work — Continuation

**Updated:** 2026-09-27 16:42 UTC  
**Repository:** `lrnolivia/field`  
**Working branch:** `codex/figui3-main`  
**Starting base:** `9dd35b37034b2f4c2c76192cb1565f4e0b8cba8e` (`origin/main`)

## User direction and authority

The user explicitly directed: adopt the uncommitted FigUI3 changes in the local field checkout, finish them, and commit them to `main`; then pick up unfinished work regardless of prior owner. The user said there is nothing in this repository the current agent cannot touch. Do not stop at a read-only audit or wait for the original worker.

The separate user checkout `/Users/lrnolivia/Repos/field` must be preserved as the source snapshot. It was on local `main` at `7c9f450ad1ad8ef480ac135d9d1c3d36165c7121`, **2 commits ahead and 96 behind** the then-current remote main, with four modified tracked files and one untracked file. Do not rebase, reset, clean, stash, or write there. The five file contents were inspected read-only. Work from this clean up-to-date worktree and transplant changes deliberately.

The original local-only commits are `c973c79` and `7c9f450`. They are unique by Git patch identity relative to `origin/main`. Inspect their semantic overlap with the already merged Inspector provenance PR before deciding whether to preserve, port, or close out their work. Do not blindly cherry-pick either onto a stale base.

## Canonical operating instructions already read

- `AGENTS.md` in the current remote-main tree points to `lrnolivia/loew-runner@main/LOEW_CHAT_BIBLE.md` and `contracts/manifest.json`; both were read at version `2026-09-27.1`.
- `.field/handoff-kit/CONTRACT.md` and `manifest.json` were read from current main.
- The current work is in the Codex lane; the Contract Worker Composio-only and no-main-push rule does not govern this Codex work. Direct main publication is explicitly user-authorized for the transplanted dirty changes.
- Refresh `main`, `field/control`, tracker/assignments, PR head SHAs, and preview state before each major implementation or publication step.
- Browser Preview QA must correspond to the exact current implementation SHA; a build is not runtime QA.

## Initial state and changes to adopt

Original local checkout snapshot: `/Users/lrnolivia/Repos/field`, branch `main`, HEAD `7c9f450ad1ad8ef480ac135d9d1c3d36165c7121`.

Uncommitted paths:

- `src/editor/BottomToolbar.tsx`
- `src/editor/controls/ControlProvider.tsx`
- `src/editor/controls/unified/ControlProvider.tsx`
- `src/shared/loew-figma-icons.tsx`
- `src/editor/controls/responsive-style-values.ts` (untracked)

The intended behavior is to share responsive inline-`__mq` value resolution between both Inspector control-provider systems, apply literal CSS responsive overrides after those values, mark the active responsive branch, and finish the Resources toolbar icon/menu/order change. Latest main already parses `responsiveStyleValues`/`responsiveStyleBands`; classic and unified providers currently resolve these differently. Verify the range boundaries and precedence before preserving the implementation. Add focused tests for breakpoint floors, max-width choice, no-match behavior, merge precedence, and provider integration. Also verify toolbar order against the established FigUI3 order `Select/Hand · Frame · Shape · Sketch · Text · Resources · Layout` and accessible split-button names.

## Work order — highest effort first, with small wins bundled

1. **Responsive Inspector value parity (current delivery).** Port and finish the five adopted paths on latest main. Bundle the split-button accessibility labels and correct Resources icon/order where consistent with the current toolbar contract. Add focused regression tests. Run focused tests, TypeScript, and `npm run build:all`; inspect exact diff. Commit and push this delivery to `main` as explicitly directed. Record the exact SHA here.
2. **FIGUI3 paint stacks (largest remaining product architecture gap).** Registered control assignment `figui3-paint-stacks` is still `standing-continuation`/unactivated. Its acceptance is in `.field/assignments/assignment-figui3-paint-stacks.md`, mailbox, and QA file on `origin/field/control`. Fill and supported Stroke must expose ordered semantic paints with source/reparse/Preview parity, persistent visibility, reorder, opacity, and token identity; do not fake state. First trace the exact current source-to-render flattening point, then implement one end-to-end Fill slice and only carry Stroke where the model can represent it honestly. Bundle focused existing paint/background regressions and easy semantic fixes. Do not claim the full assignment from a partial Fill-only result.
3. **Native Scale visual metrics repair (#9).** Branch `field/native-scale-visual-metrics-repair`; reproduced 2× Scale defect is described in the PR. Run focused tests/build against a current base, resolve source changes, and use a branch Preview plus the exact authored SVG acceptance packet before marking complete.
4. **Dashboard project interactions (#5).** Branch `field/dashboard-interaction-polish`; project menu dismissal/focus and delete confirmation. This is the broadest remaining Dashboard UI interaction pass. Verify latest source/tests and perform focused browser QA; bundle remaining easy Dashboard semantics from #8/#10/#11/#13/#14 after checking whether they already landed.
5. **Control-plane dependency chain (#28 → #27).** #28 targets `field/control` and must stay there; #27 targets `main` and depends on #28. Finish validation/lineage before merging in dependency order. Never retarget #28 to main.
6. **Remaining Dashboard semantic PRs (#8/#10/#11/#13/#14).** Refresh each branch against main, rerun tests and strict TS together where safe, check exact changed paths, then record ready status. Avoid duplicating changes already present on main.
7. **Loading veil (#38).** Current PR head `bbee73a02f4032934190ab2e0d5aad53530cdd64`; focused tests 6/6, `npm run build:all`, Cloudflare build, and branch-preview startup frame were checked. The exact uploaded 48px logo plus soft circular white pulse are present. PR remains draft; no merge was performed. Revalidate its current checks before closeout.

This is ordered by expected implementation/QA intensity. Reorder only when fresh evidence shows a path already complete or blocked; record the reason.

## PR and branch snapshot at 2026-09-27 16:42 UTC

Open PRs observed:

- #38 loading veil, `field/project-loading-veil-native-mesh` (current preview/build passed; draft)
- #28 shared repair ledger, `field/shared-repair-ledger` → `field/control` (open; merge state unstable)
- #27 canonical handoff kit, `field/handoff-kit-canonical-source` → `main` (open; depends on #28)
- #14 empty-state semantics, `field/dashboard-empty-state-semantics` (draft)
- #13 collection semantics, `field/dashboard-collection-semantics` (draft)
- #11 sidebar navigation semantics, `field/dashboard-sidebar-navigation-semantics` (draft)
- #10 New Project focus flow, `field/dashboard-new-project-focus-flow` (draft)
- #9 native Scale visual metrics repair, `field/native-scale-visual-metrics-repair` (draft)
- #8 rename-dialog hardening, `field/dashboard-rename-dialog-hardening` (draft)
- #5 Dashboard interaction polish, `field/dashboard-interaction-polish` (draft)

Previously identified FigUI3 implementation PRs #17, #21, #26, and #36 are merged. Do not replay those changes. The wider Inspector and paint-stack handoffs are not complete merely because those PRs landed.

## Current exact next actions

1. Re-read this note and fresh `git status`, `git log`, `origin/main`, and `/Users/lrnolivia/Repos/field` status before resuming.
2. In `/Users/lrnolivia/Repos/field-figui3-main` on `codex/figui3-main`, implement item 1 only; keep the original checkout untouched.
3. First add focused tests for `responsiveStyleValuesAtWidth` and the provider merge/precedence contract, then run them before broader validation.
4. After the first delivery is published, update this file with commit SHA, validation, and the next active item before starting item 2.

## Recovery rules for another chat

- Do not assume this chat's prose or old PR bodies are current truth; refresh GitHub and worktree state first.
- The clean working checkout is `/Users/lrnolivia/Repos/field-figui3-main`. The old user checkout is deliberately preserved at `/Users/lrnolivia/Repos/field`.
- Do not copy the old checkout wholesale. Port only the listed paths and any minimal tests after comparing to current main.
- Never discard the two original local commits or dirty worktree snapshot; preserve their evidence until the intended code is integrated and verified.
- Do not edit Cloudflare/deployment, package manifests, or environment files for UI work unless a verified blocker requires it.
- Each delivery should include a small adjacent improvement (focused regression test, accessibility label, or stale assertion) without widening its primary behavior.
- Update this note at every completed delivery and leave one concrete next action.

## Progress log

- 2026-09-27 16:42 UTC — User authorized adoption of all five dirty FigUI3 paths and direct main commit. Fresh remote main is `9dd35b3`. Created clean worktree `/Users/lrnolivia/Repos/field-figui3-main` on `codex/figui3-main`. No adopted source edits have been made yet. Original checkout remains untouched.
