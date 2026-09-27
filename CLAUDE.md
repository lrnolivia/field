# field — architecture & execution guide

field is the product. Revyme is the technical origin.

Start with `README.md` for product/runtime orientation.

For any execution chat, also read:

- `.field/handoff-kit/CHAT_BOOTSTRAP.md`
- `.field/handoff-kit/CONTRACT.md`
- the current assignment/control records for your execution lane

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
