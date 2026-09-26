# qa-field-worker-coordination-v2.md

```yaml
assignment: field-worker-coordination-v2
branch: field/field-worker-coordination-v2
pr: 2
tested_head_sha: 06e984d84f3ebf68ca478ec1407ddb78f809ad63
tested_main_sha: 7e585a2fe66e062bae8a46041a6e08901027f9a8
environment: Composio-fetched reconciled PR head materialized in Composio sandbox
build: not-required
tests: pass
runtime_qa: not-required
tested_at: 2026-09-26
```

## Moving-main reconciliation

The previously tested main `7451b55f29c94e2d56e014590067e7111cd3915a` advanced to `7e585a2fe66e062bae8a46041a6e08901027f9a8`.

The intervening main commit changed only `tracker.md`, while PR #2 changes only `.field/handoff-kit/**`. There was no target-path overlap.

PR #2 was then updated with current main, producing exact reconciled head:

`06e984d84f3ebf68ca478ec1407ddb78f809ad63`

## Evidence after reconciliation

- `python3 tests/contract_worker_v2_test.py` → PASS
- `python3 tests/kit_self_test.py` → PASS
- kit self-test Bash syntax validation → PASS
- kit self-test Node syntax validation → PASS
- manifest/version consistency → PASS
- handoff kit version → `2026-09-26.2`

## Runtime QA

Not required for this assignment because it changes coordination/process infrastructure only and does not alter field product runtime.

## Preview check note

Cloudflare branch Preview/build behavior is not acceptance evidence for this coordination-only assignment. That infrastructure is explicitly owned by successor assignment `field-branch-preview-live-qa`.

## Final cleanup pass

- PR head `06e984d84f3ebf68ca478ec1407ddb78f809ad63` includes the stale-v1 coordination cleanup.
- `python3 tests/contract_worker_v2_test.py` → PASS
- `python3 tests/kit_self_test.py` → PASS
- `bash -n installer/install-template.sh` → PASS
- `node --check templates/apply.mjs` → PASS
- old tracker-centric helper behavior was removed from `bin/field-handoff`
- old direct-main/default-Contract-Worker installer language was removed
- Firecrawl QA now forbids using production to claim an unmerged branch was tested

The Cloudflare Workers build check on this coordination-only branch is failing, but branch Preview/build behavior is explicitly outside this assignment's acceptance surface and is owned by successor assignment `field-branch-preview-live-qa`.
