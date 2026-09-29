# field — architecture & execution guide

field is the product. Revyme is the technical origin.

The active repository is **`lrnolivia/field`**. Historical targets such as `revyme-loewfi`, `revyme-loew`, `revyme-löew`, and old local Revyme checkout paths are not current repositories. Preserve Revyme-prefixed identifiers only when they are real compatibility, protocol, dependency, storage, or attribution contracts inside field.

Before any execution work, refresh directions in this order:

1. `lrnolivia/loew-runner@main/contracts/manifest.json`
2. `lrnolivia/loew-runner@main/LOEW_CHAT_BIBLE_CURRENT.md`
3. this repository's current `AGENTS.md`
4. the applicable role contract and current assignment/control/QA state
5. fresh Git/runtime truth

Then use `README.md` for product/runtime orientation and the repo-hosted handoff kit only as a **field-specific overlay**:

- `.field/handoff-kit/CHAT_BOOTSTRAP.md`
- `.field/handoff-kit/CONTRACT.md`
- the current assignment/control records for your execution lane

Runner universal law outranks copied/stale local process guidance. Do not continue from an old handoff without rehydrating from Runner and live `lrnolivia/field` state.

## Product principles

- the website is the real artifact
- source remains first-class
- Preview is runtime truth
- Design, source, Preview, and production should remain aligned
- parity bugs should be traced to the first point of divergence
- deterministic concepts should be modeled explicitly
- AI is for ambiguity, translation, cleanup, inference, and higher-level reasoning — not as a substitute for a proper document model

field is evolving from a customized Revyme foundation into a professional visual web design environment. Preserve real upstream/compatibility identifiers when they still represent actual runtime or dependency contracts.

## Execution lanes

### Codex/local lane

Use the current PJM / Master / Codex Worker contracts. Do not silently replace that hierarchy with Contract Worker rules.

### Contract Worker / Night Shift lane

Use the repo-hosted handoff kit.

Contract Workers and the Night Shift Manager use **Composio exclusively for all GitHub reads and writes**. The built-in ChatGPT GitHub connector is prohibited for this lane.

Live cross-chat coordination is on:

`field/control`

Canonical records:

`.field/assignments/assignment-<id>.md`
`.field/mail/<id>.md`
`.field/qa/<id>.md`

Implementation belongs on `field/<id>` with one Draft PR unless the assignment is explicitly a standing/planning role.

## Artificial blockers

Do not stop merely because our own workflow is broken.

If stale coordination, metadata, instructions, deterministic tooling, or QA harness behavior blocks the assignment and the repair is bounded, safe, and within current authority, fix it, validate it, record it, and continue.

Do not cross another active assignment's ownership, weaken Git safety, change product direction, or bypass authorization to clear a blocker.

## QA authority

`loew-runner/LOEW_CHAT_BIBLE_CURRENT.md` section 11 is the law for QA engine selection, exact-SHA evidence, classification, bounded retries, fallbacks, self-correction, danger-zone handoff, and promotion.

field only adds target-specific runtime semantics:

- exact branch Preview represents the branch artifact under test
- `/qa/work/<projectId>` is the read-only real-project QA surface
- `/builder/noauth` is a disposable **smoke-only** harness
- deterministic Inspector/GitHub Chromium is the routine web-visible QA workhorse when it can prove the criterion
- Browser Run is reserved for exploratory or session behavior that deterministic recipes cannot prove
- authenticated/project-native harnesses are required when state, credentials, persistence, or platform behavior matter

A build is not runtime QA. Production does not prove an unmerged branch. Head changes stale affected runtime evidence.

## Runtime architecture

Local development exposes three coordinated surfaces:

- editor — port 3333
- Canvas runtime — port 5174
- Preview runtime — port 5175

Production:

- editor — https://field.loew.fi
- Canvas — https://canvas.field.loew.fi
- Preview — https://preview.field.loew.fi

Canvas and Preview intentionally run on separate origins. Treat Preview behavior as runtime truth when design/source/runtime disagree.

## Development

Requires Node 22+.

Install:

`npm ci`

Run the complete local environment:

`npm run dev`

Build all production surfaces:

`npm run build:all`

Unit tests:

`npm run test:run`

Lint:

`npm run lint`

End-to-end tests:

`npm run e2e`

Additional supported scripts are defined in `package.json`.

## Change discipline

Before editing:

- refresh current Git truth
- inspect current ownership
- read the relevant assignment and dependency mail
- preserve unrelated work
- keep changes inside assigned paths
- understand existing source/document/history/runtime contracts before replacing them

Before merge:

- run assignment-required focused tests
- run static/type/build checks that apply
- perform required runtime QA
- record exact tested branch/main SHAs
- reconcile moving main
- re-check ownership and PR state

A successful build is not automatically runtime QA.

## Compatibility and attribution

Some Revyme-prefixed dependencies, environment names, storage keys, protocol identifiers, or compatibility structures remain intentionally present. Do not mechanically rename them because the product is now field.

`LICENSE` and `NOTICE` are authoritative for licensing and attribution.
