# field handoff contract overlay

This file is intentionally thin. Universal execution process does not live here anymore.

## authority

Before field execution work, read in this order:

1. `lrnolivia/loew-runner@main/contracts/manifest.json`
2. `lrnolivia/loew-runner@main/LOEW_CHAT_BIBLE.md`
3. `lrnolivia/loew-runner@main/projects/field.json`
4. `lrnolivia/field@main/AGENTS.md`
5. the applicable role contract and current field assignment/mail/QA state
6. fresh Git, PR, Preview, and runtime evidence

Runner owns universal execution and QA law. This file may add field-specific paths and constraints only. If this overlay conflicts with the current Runner Bible, Runner wins unless the user explicitly says otherwise.

The canonical repository is **`lrnolivia/field`**. Historical repository targets such as `revyme-loewfi`, `revyme-loew`, `revyme-löew`, and old local Revyme checkout paths are non-authoritative history. Revyme-prefixed identifiers inside field may remain when they are real compatibility, protocol, dependency, storage, or attribution contracts.

## field execution overlay

Contract Worker / Night Shift coordination may still use:

- control branch: `field/control`
- assignment records: `.field/assignments/assignment-<id>.md`
- mail records: `.field/mail/<id>.md`
- QA records: `.field/qa/<id>.md`
- implementation branches: `field/<id>`
- one Draft PR per implementation assignment unless the current assignment explicitly defines another standing/planning shape

For the Contract Worker / Night Shift lane, **Composio is the exclusive GitHub transport**. The built-in ChatGPT GitHub connector is prohibited for that lane. The separate Codex/local lane follows its current PJM / Master / Worker contract and may use an authorized local clone where permitted.

Do not merge `field/control` into `main`. Preserve current ownership boundaries and do not force-push.

## field QA overlay

`LOEW_CHAT_BIBLE.md` section 11 is law for engine routing, exact-artifact evidence, classifications, retry/watchdog limits, self-correction, fallbacks, danger-zone handoff, and promotion.

field adds only these runtime facts:

- exact branch/PR head SHA -> exact branch Preview
- `/qa/work/<projectId>` -> read-only real saved-project QA
- `/builder/noauth` -> smoke/isolation only, never proof of real-project loading or persistence
- deterministic Inspector/GitHub Chromium -> routine visual/runtime QA when capable
- Browser Run -> exploratory/session behavior deterministic recipes cannot prove
- authenticated/project-native harness -> protected state, credentials, persistence, account metadata, or environment-specific behavior

A successful build is not runtime QA. Production cannot prove an unmerged branch. A head change makes affected runtime evidence stale.

field may specialize Runner `FAIL — PRODUCT` as `FAIL — FIELD`; all other classification meanings remain Runner-owned.

## historical detail

Older field-local universal process rules are retained in Git history only. Do not copy them forward into new assignments. Rehydrate from Runner on every invocation.
