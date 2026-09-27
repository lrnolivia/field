# project-loading-veil

Activated from live QA after dual Canvas entrance choreography was accepted.

Problem: the current loading skeleton previews the final editor layout and spoils the reveal.

Branch: `field/project-loading-veil`
Base: `12d1fb9c64165482d4bfcaa1553a1daaf9fd4049`

Direction: atmospheric theme-aware WebGL mesh + blur + grain + centered breathing frame mark. Preserve existing ProjectLoader readiness/error semantics.


## 2026-09-27 implementation / deployment

- PR #34
- implementation head: `e334b2fac13a8e81cb2a52fe1e4e21ff22217960`
- merged to main: `b7b32070e98f29c0a14cd3048047ef1d13400b68`
- exact-head Preview build: PASS (`05b8008a-89f3-439f-a38b-2743840b851f`)
- immutable Preview: `c516d09b.field-preview.loew.fi`
- production build: PASS (`e59eca7d-5fb8-4c1b-83c0-cf2338988897`)
- live human visual feel QA remains pending.


## 2026-09-27 live visual QA rejection / Figma-match successor

The PR #34 implementation was rejected during live human QA: it was too dark, too empty, and read as an ambient logo-card splash rather than the supplied mock.

Visual source of truth is now the user's Figma `loading-mocks` node `1:49`, supplemented by the actual live ReShaders Mesh Flow source.

Successor:
- branch: `field/project-loading-veil-figma-match`
- PR: #37
- reconciled head: `5cdab405114687c590ffa58092dee9b8c7b6280e`
- reconciled main: `b647b558a3a4078dcff3bb7134b24dbf6af367e5`
- diff: only `src/loading/ProjectLoadingVeil.tsx` and focused test

The implementation now uses actual ReShaders Mesh Flow · Mono mechanics and preset values, Multiply over the Figma gray base, and a mathematically centered field mark with a separate circular bloom.
