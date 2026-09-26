# mail-native-gallery-qol-creation-flow.md

to: successor Contract Worker
type: migration-handoff

## What this assignment is really for

Gallery is already real. The user exercised the live implementation and reported that it is fast and that Grid, Natural, Strip, Story, and Carousel work.

This is the complete **functional QoL + creation-flow** program before the dedicated Gallery UI redesign.

End state: guided creation, direct canvas arrangement, true media Reposition with pan/zoom/rotation, Source-ratio framing in every mode, deterministic Natural Shuffle, coherent history, and Design/Preview/runtime parity.

## Do first

1. Rehydrate from current repo truth and handoff kit.
2. Inspect implementation branch + Draft PR.
3. Run one small baseline Gallery Firecrawl packet.
4. Investigate native seams for Reposition input ownership, canvas swap, zoom/rotation source state, wizard launch, Natural deterministic composition, Source ratio, and direct media drop.
5. Expand ownership before touching generic protected integration surfaces.

## Do not waste time on

- rebuilding Gallery foundation
- retrying the old hardening deployment verifier against `1a84843...`
- inventing Gallery-only runtime state
- polishing the ugly Inspector before functional semantics are complete
- Natural Shuffle by changing source/media order
- Source ratio by merely changing `object-fit`
- source writes on every pointermove

## Settled decisions

- one ordered source-backed content model
- five existing views
- Preview is runtime truth
- one large coherent tranche, not micro-phases
- Reposition owns gestures while active
- focal + zoom + rotation are authored media treatment
- Escape cancels whole media-edit transaction
- Done/Enter commits whole transaction
- image-on-image drag = swap
- Natural Shuffle changes composition, never semantic order
- frame sizing and media fit are separate
- every view gets meaningful Source-ratio mode
- creation wizard = Media → Layout → Behavior
- replace preserves treatment
- duplicate preserves treatment with fresh IDs
- selection follows media identity
- live pointer feedback remains imperative where appropriate
- Gallery Inspector visual redesign follows this assignment

## Baseline evidence

Hardening source:
`1a84843ad3b24cd8572545cba05409fb48b3715a`

Legacy closeout:
`7e585a2fe66e062bae8a46041a6e08901027f9a8`

Production evidence:
descendant `a873a3f9eeef696a25b6e330a58a41503411747f`, Cloudflare check-run `108318214279`, success.

Human smoke:
Gallery is fast and all five modes work.

Old Gallery assignment is released. Do not reopen it.

## Warning signs

- canvas moves during Reposition → input ownership is wrong
- Natural/Story geometry sticks to wrong media after swap → index-responsive cleanup is wrong
- Shuffle changes Content/source order → composition and semantics were conflated
- Source ratio changes `objectFit` → frame sizing and media treatment were conflated
- Carousel controls break after swap → controls are not regenerated from real order
- wizard needs a second authoritative Gallery config → stop and return to canonical source

## After completion

Do not expand this branch into visual polish.

Create a separate Figma UI3-style Gallery Inspector + wizard UI redesign assignment once this functional model is proven.
