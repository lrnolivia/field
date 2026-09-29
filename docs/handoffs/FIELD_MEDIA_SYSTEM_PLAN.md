# field Media system — implementation plan

Status: approved product direction; implementation started on `field/media-system-foundation`.

## Product rule

Media is one project-level system expressed through several deliberate surfaces. The same media objects, upload state, provenance, deduplication, selection semantics, and usage references must be reused everywhere. Surfaces may change density and controls, but must not become independent media silos.

The interaction principle is:

> drop it → see it → use it → keep moving

Preview remains runtime truth and does not gain field editing/upload chrome.

## Batch 1 — foundation + shared interaction model

Build the canonical Media types/state before replacing visible upload surfaces.

- shared Media kinds: All, Images, Video, Audio, Embeds, Vectors where applicable
- Gallery is a composition/intent, not a media kind
- shared session state: surface, route, intent, search, selection, scroll, target/source context
- shared upload queue states
- deterministic MIME/type mapping and compatible-file filters
- shared primitives for tiles, grids, drop targets, progress, empty/error states
- exact-content deduplication; filename equality alone is not duplication
- new mixed-media glyph distinct from the Image landscape glyph
- keyboard/focus contracts shared across shells

Acceptance:
- later surfaces can consume one Media model without inventing their own routing/state
- Gallery routes through Images in multi-select intent
- upload/generation can resolve into the same library identity

## Batch 2 — canonical browser + sidebar Media

Build the full browser first, then the docked sidebar form.

- full free-standing Media workspace: search, type views, upload, filters/sort, selection, metadata, source/provenance, usage references
- promote Media out of Elements into a first-class row under Insert
- `Insert → Media` opens the docked sidebar Media browser
- sidebar is dense: browse/search/filter/upload/drag-to-canvas; full metadata stays in expanded Media
- toolbar actions never hijack the left sidebar
- remove the old static Media subsection from Elements once replacement coverage exists

Acceptance:
- one project library is visible in both full and sidebar shells
- navigating Media in the left sidebar does not change toolbar panel state
- Design media can be dragged/inserted from the sidebar through the existing toolbar-drag pipeline

## Batch 3 — toolbar launcher + anchored dynamic Media

Replace the current Media dropdown/pickers with one toolbar-connected dynamic panel.

Home state is a compact ~224 px vertical launcher:

- Upload
- Browse media
- Image
- Gallery
- Video
- Audio
- Embed
- Paste from clipboard

Rules:

- main Media glyph opens the launcher directly
- no modal X; dismiss via Media button, click outside, or Escape
- top-right control is expand glyph only, no “Expand” label
- panel remains physically anchored to the Media toolbar control
- actions deep-link into the same anchored Media component rather than spawning unrelated dialogs
- back returns to launcher
- Image/Video/Audio open their scoped browser view
- Gallery opens Images in multi-select/gallery intent
- Embed opens embed-provider creation state
- Upload opens the native picker immediately
- Paste ingests immediately
- Create/generation lives inside Media and generated results automatically enter Media
- expand morphs anchored Media into full free-standing Media while preserving route, search, selection, scroll, creation state, and intent

Acceptance:
- old toolbar dropdown is no longer the product model
- no toolbar action sends the user to sidebar Media
- expand is state-preserving rather than a close/reopen reset

## Batch 4 — contextual integrations

Replace remaining bespoke media inputs with shared Media intents.

Design:
- canvas drop targets wake only valid destinations
- empty canvas = place; media node = replace; container = place inside
- inspector media row opens compatible contextual picker
- direct drop onto inspector preview replaces
- actions: Replace, Reveal in Media, Download original, Remove

Gallery:
- select multiple Images in Media, then create Gallery
- resulting Gallery is a design composition; source assets remain Media assets

Content:
- compact empty/populated media field states
- choose existing, upload, replace, alt/caption/focal-point support
- ingestion is not blocked by missing alt text; content completeness is separate

Code:
- same ingest engine, but path-aware
- collisions offer Replace existing / Keep both / Rename
- do not silently mutate source paths

Preview:
- no field Media editing UI
- real runtime file inputs continue to behave as the website does

Acceptance:
- bespoke uploaders/pickers are replaced by shared Media routing and primitives
- intent is inferred from invocation context but can be changed where appropriate

## Batch 5 — delight, migration, hardening + parity

Finish the system as a professional field feature.

Feedback:
- tiny local upload receipt for quick toolbar uploads
- persistent upload tray for batches/long-running work
- item-level retry/cancel/error; one failure never blocks the queue
- completed queue collapses quietly

Progressive disclosure:
- no mandatory rename/metadata/folder/optimization ceremony before ingestion
- controls remain available after ingestion

Motion:
- launcher ~140–180 ms
- anchored → full ~180–240 ms
- subtle tile resolve and canvas replacement crossfade
- reduced-motion becomes immediate state changes
- no confetti/bounce/decorative motion

Visual:
- compact Inter
- 24 px-ish controls
- thin 14–16 px glyphs
- restrained 4–6 px floating radii
- rectilinear docked panes
- minimal elevation
- sparse accent
- media itself supplies most color
- no generic SaaS uploader cards, giant pills, decorative glass, or giant dashed upload zones

Migration:
- remove old toolbar Images/Video/Audio/Gallery picker implementations only after replacement coverage exists
- remove Media subsection from Elements
- preserve paths/references
- keep Image landscape glyph; use the new mixed-media glyph for Media
- remove dead Media CSS/components only when proven unused

Validation:
- dark/light
- keyboard/focus/Escape/click-outside
- drag/drop + clipboard
- upload batches/failure/retry
- duplicate handling
- Gallery multi-select
- generation
- toolbar expand state preservation
- sidebar independence
- contextual inspector + Content
- source-path collisions
- reduced motion
- narrow editor widths
- no toolbar → sidebar navigation leakage
- no Preview editor leakage
