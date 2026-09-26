# qa-native-gallery-qol-creation-flow.md

```yaml
assignment: native-gallery-qol-creation-flow
source_worker: field Gallery Worker
tested_head_sha: 1a84843ad3b24cd8572545cba05409fb48b3715a
tested_main_sha: 7e585a2fe66e062bae8a46041a6e08901027f9a8
environment: existing Gallery baseline; GitHub/Cloudflare deployment evidence; live no-auth human smoke; Firecrawl access smoke
build: baseline-pass
tests: baseline-pass
runtime_qa: partial
new_tranche_implementation: not-started
```

## Existing baseline that actually passed

For `1a84843ad3b24cd8572545cba05409fb48b3715a`:

- focused Gallery regression suites passed
- TypeScript passed
- `build:all` passed

These are baseline results only.

## Production evidence

The source SHA itself has no check-run.

Immediate descendant `a873a3f9eeef696a25b6e330a58a41503411747f`:

- directly contains `1a84843...`
- changes only `tracker.md`
- Cloudflare check `Workers Builds: field`
- check-run `108318214279`
- completed / success
- completed 2026-09-26T02:19:04Z

## Legacy closeout

The old Gallery hardening reservation was released on main at:

`7e585a2fe66e062bae8a46041a6e08901027f9a8`

## Human runtime smoke

The user manually tested the live Gallery and reported:

- it works
- it is fast
- all five Gallery modes work

This is smoke, not a complete RC matrix.

## Firecrawl access smoke

A fresh request to `https://field.loew.fi/builder/noauth` returned HTTP 200 and exposed the live field editor DOM. An interactive Firecrawl browser attached successfully.

An earlier large RC attempt encountered a transient 401 and free-tier concurrency/rate limits. Because the same route later succeeded, the earlier 401 is not classified as a Gallery product failure.

The complete Gallery RC matrix was not rerun.

## New tranche — not run

No implementation exists yet for:

- exclusive media-edit input ownership
- image zoom
- image rotation
- direct canvas swap
- mode-aware Source ratio
- Natural Shuffle
- creation wizard
- direct Gallery media/file drop QoL
- new history transactions

Do not claim tests/build/runtime QA for those features until the successor records exact evidence.

## Required successor QA packets

1. Reposition ownership + focal pan + cancel/commit
2. zoom/rotation state + Preview parity where automatable
3. direct swap + source order + geometry
4. Natural Shuffle determinism + unchanged semantic order
5. Grid/Natural Source ratio
6. Strip/Story/Carousel Source ratio
7. wizard Finish
8. wizard Cancel/no artifact
9. replacement/duplicate treatment preservation
10. Design ↔ Preview treatment parity

Use human desktop QA for native trackpad pinch/rotation feel when browser automation cannot represent it faithfully.

`/builder/noauth` is disposable/in-memory and does not prove authenticated persistence, R2 durability, account identity, or cross-session persistence.
