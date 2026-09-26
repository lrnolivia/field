# assignment-figui3-global-parity-continuation.md

---
field_assignment: 1
id: figui3-global-parity-continuation
status: standing-continuation
branch: null
pr: null
base: 7451b55f29c94e2d56e014590067e7111cd3915a
kit: 2026-09-26.1
type: visual-parity-continuation
execution_class: contract-worker
source_chat: field FigUI3 planning / implementation continuation chat
source_handoff: FIELD_FIGUI3_CONTINUATION_ASSIGNMENT.md
owned: []
approved_shared: []
protected:
  - cloudflare/**
  - wrangler.jsonc
  - package.json
  - package-lock.json
  - .env*
qa:
  firecrawl: true
  authenticated: true
---

# field — FigUI3 global parity continuation

## Purpose

This is the durable continuation of the long-running field FigUI3 program.

It exists so the program does not collapse into whichever single child assignment happened to be last.

The product target remains:

> **full FigUI3 first, then make it ours.**

The human/editorial rule remains:

> **Any empty space has to justify itself.**

field should read as one professional design environment rather than a collection of inherited Revyme controls that were individually restyled.

This is a **standing continuation program**, not a broad source reservation and not one implementation branch.

Every concrete implementation pass must become its own narrow child assignment with fresh current-main/current-ownership preflight.

## What is already landed — do not replay

The following lineage is historical implementation truth and should be treated as foundation, not backlog:

### Inspector / control-system lineage

- Inspector de-stroke + font browser
- Inspector hierarchy cleanup
- residual Revyme binding-chrome cleanup
- final whole-surface Inspector migration
- scroll integrity hardening
- Inspector command-menu consolidation
- rich Inspector popup architecture:
  - `DropdownMenu` for commands/discrete choices
  - `SearchableDropdown` / specialized searchable picker for searchable single-choice
  - `ToolPopup` for rich Inspector editing
  - Modal for blocking workflows
- semantic surface-elevation system
- Typography Advanced → `ToolPopup`
- PresetPicker → `ToolPopup`
- rich popup / child menu / modal stacking hardening

### Sidebar / document chrome

- shared `SectionLabel`
- shared minimal `SearchBar`
- shared `SidebarRow`
- Pages/Layers splitter/header/tree density
- contained independent Pages/Layers scrolling
- removal of shared-sidebar cut-corner/purple defaults
- shared rounded command-menu grammar

### Bottom toolbar / Inspector utility lineage

Current intended toolbar:

`Select/Hand · Frame · Shape · Sketch · Text · Resources · Layout | Smart Zoom · Search · Comments · Upgrade`

Current intended Inspector utility area:

`Design · Prototype … Theme · Zoom%⌄`

Landed decisions:
- Locale is not a toolbar utility; Localization owns it.
- Theme + full zoom belong in the Inspector utility area.
- toolbar Smart Zoom is compact and deterministic:
  - selection exists → Fit Selection
  - otherwise → Fit Canvas
- Resources routes to canonical Library/Components or Media Gallery.
- Resources must never become a duplicate asset/component system.
- growing dynamic inventories should use the canonical minimal SearchBar when useful.
- short fixed command menus should not gain search merely for consistency.
- Media Gallery search is part of the current source lineage.

### Previous closeout implementation

The most recent FigUI3 toolbar / Inspector implementation lineage includes:

`dca7cd406f66fbfc391cec1c6ce3bb7e1c06b4ec`

The prior rich-Inspector / toolbar assignment was closed.

Do not replay r8/r9 installers.

## Current concrete child already registered

### figui3-paint-stacks

Control assignment:

`.field/assignments/assignment-figui3-paint-stacks.md`

This is the next explicit product requirement already preserved separately.

Core requirement:

> Fill and Stroke show every actual contributing paint as a complete ordered stack in the Inspector.

The child owns its own detailed semantic/model/QA contract.

This parent must not silently absorb or rewrite that child while it is active.

## Core visual direction

field should retain strong Figma UI3 influence:

- compact neutral chrome
- precise spacing
- strong Inspector alignment
- restrained radii
- restrained shadows
- thin, optically consistent icons
- sparse functional selection/accent blue
- docked panes read as structural surfaces, not floating cards
- true floating UI may use restrained roundness and elevation
- hierarchy comes from spacing, typography, surfaces, and state — not walls of borders
- compactness must come from density and hierarchy, not illegibly tiny type
- Inter remains the canonical editor UI face unless current product direction changes
- light/dark neutrals must both be deliberately designed
- no generic SaaS
- no macOS Settings
- no GNOME/libadwaita
- no decorative styling at the expense of precision
- no inherited purple language
- no unjustified empty slabs or dead space

After the FigUI3 baseline is genuinely coherent, field may differentiate more strongly.

"Make it ours" means:
- introduce field-specific identity deliberately;
- preserve professional-tool density and clarity;
- preserve source/runtime parity;
- preserve Figma-compatible semantic concepts;
- do not throw away hard-won interaction conventions merely to look different.

## Remaining program

The following work represents the continuation backlog / future goals carried forward from the source chat and earlier FigUI3 handoff.

The order is **not fixed**. Every run must re-audit current main, current control plane, and active legacy ownership and choose the highest-impact coherent unowned mismatch.

### 1. Complete ordered paint stacks

Already split into child assignment:

`figui3-paint-stacks`

Keep it high priority because it advances field from "CSS property editor" toward a real design-tool Inspector and preserves future Figma semantics.

### 2. Workspace / chrome system pass

Audit the editor workspace as one system:

- top header
- left rail
- left content pane shells
- right Inspector shell
- canvas-adjacent chrome
- panel edges
- docking/collapse affordances
- toolbar relationship to workspace
- utility placement
- selection/navigation chrome

Goal:

> one coherent global chrome grammar rather than individually polished islands.

Do not disturb source/product behavior merely to improve cosmetics.

### 3. Deliberate light-mode parity

Dark mode was the initial visual authority.

Light mode must be intentionally designed, not obtained by simply inverting dark tokens.

Matched-scale light-mode audit should include:

- header
- left rail
- Pages/Layers/document panel
- Inspector
- bottom toolbar
- popovers/menus
- Library / Media / Insert surfaces
- dashboard/project surfaces when ownership permits
- selected / hovered / focused / disabled states
- neutral levels and border/surface separation

Avoid:
- pure white everywhere
- washed-out controls
- weak pane/workspace separation
- excessive outlined boxes
- accidental high-contrast seams

### 4. Residual inherited-grammar sweep

Search current source for remaining inherited Revyme visual language, including:

- `cut-corners`
- `cut-border`
- purple fallbacks
- hardcoded black/white interaction fills
- generic rounded-full pills
- unnecessary `font-bold` / `font-extrabold`
- redundant borders on already-filled controls
- unexplained density mismatches
- inconsistent 24/28/32/36px control families
- bespoke hover/focus treatments that bypass shared primitives
- old accent-heavy states
- one-off shadows/radii that fight the field system

This is **not** permission for a blind repository-wide replacement.

Group findings into coherent subsystem passes with screenshot evidence.

### 5. Dashboard / project-surface FigUI3 parity

When current Dashboard/editor-motion and thumbnail ownership permits, audit Dashboard/project browsing as a whole.

Desired direction:

- professional project-management surface
- restrained, non-AI chrome
- clear project creation/open states
- precise grid/list hierarchy
- strong thumbnail behavior
- same neutral field system as editor
- no generic SaaS card wall
- no decorative dashboard treatment disconnected from Design

Do not overlap active Dashboard ownership.

### 6. Matched-scale full-screen visual QA

At regular milestones compare full-screen rendered states, not just source tokens.

Check:

- optical density
- dead space
- text hierarchy
- icon optical weight
- selection visibility
- hover/focus/disabled clarity
- panel alignment
- menu/popover coherence
- floating vs docked geometry
- dark/light balance
- toolbar/Inspector proportion
- left/right pane visual weight
- editor/Dashboard continuity

Screenshots outrank assumptions.

A screenshot defect becomes a fresh narrow corrective assignment.

### 7. Collapsible workspace completion

The long-term workspace should support:

#### Left side
- thin rail may remain visible
- larger content pane collapses
- clicking a rail item while collapsed can reopen directly to that panel
- state persists
- structural background collapses too
- no empty dark slab remains

#### Right side
- Inspector collapses
- subtle obvious reopen affordance
- state persists
- canvas reclaims the space

#### Canvas behavior
- available-area calculations update correctly
- camera centering/fit adapts
- no invisible chrome continues reserving layout space

Future extension worth preserving:

> distraction-free workspace toggle that hides both major panes.

Only implement when current ownership and canvas/layout architecture make it safe.

### 8. Canvas ↔ Preview parity program

WYSIWYG parity remains a core field requirement.

When Canvas and Preview differ, trace one concrete element through:

1. Canvas computed style
2. parser/document/CanvasNode representation
3. generated ProjectFS/source
4. Preview computed style

Compare at least:

- position
- left/top
- width/height
- transforms
- font family
- font size
- font weight
- line height
- letter spacing
- alignment
- color
- opacity
- layout context

Do not automatically blame stale state.

Find the first point of divergence.

Confirm the same user font actually loads in Design and Preview.

Editor UI Inter must never leak into authored site typography.

This parity work may require separate architecture-sensitive child assignments rather than visual-polish ownership.

### 9. Inspector quality as a system

The Inspector should become one of field's strongest surfaces.

Continue refining, based on rendered evidence:

- label/value alignment
- section rhythm
- control heights
- grouped values
- icons
- padding
- separators
- disclosure behavior
- numeric controls
- stack/list semantics
- shared rich editors
- mixed-state behavior
- variable/token identity
- multi-selection behavior
- empty states

Do not reopen already-good surfaces without evidence.

Paint stacks are the next major semantic Inspector step.

### 10. Real editor design-system convergence

Continue reducing one-off styling in favor of a small canonical editor system.

Useful canonical concepts include:

- control height
- compact control height
- icon size families
- panel inset
- Inspector label grid
- section gap
- row height
- menu row height
- toolbar control size
- separators
- radius ladder
- floating-surface shadow/elevation
- selection/hover/focus/disabled grammar
- SearchBar
- SectionLabel
- SidebarRow
- DropdownMenu
- SearchableDropdown
- ToolPopup
- modal elevation
- paint-row grammar

Centralize only where it improves consistency and maintainability.

Do not create a framework for its own sake.

### 11. Layers visual-stack semantics verification

field's design-tool mental model should remain:

> top row = visually frontmost sibling

Do not expose raw DOM/source order as visual stack order if they differ.

Verify current implementation rather than assuming this remains unfinished.

If a mismatch remains, a dedicated child must preserve:

- DOM/source order
- visual paint order
- drag reorder
- nested hierarchy
- flex/grid `order`
- variant/viewport behavior

Do not solve it with superficial CSS reversal.

### 12. Searchable-surface consistency

The current rule is settled and should be extended opportunistically:

Use the canonical minimal SearchBar for:
- dynamic
- user-generated
- meaningfully long
inventories where search materially improves scanning.

Likely families include:
- Components
- Media
- Insert
- assets
- fonts
- variables
- styles/tokens
- other growing inventories

Do not add search to tiny fixed command menus, short radio sets, or a two-action popup simply for visual uniformity.

### 13. Figma semantic compatibility

Figma integration remains strategic.

Every design-system/Inspector behavior should preserve concepts needed by:
- Figma import
- eventual Figma synchronization
- frames
- Auto Layout
- components
- instances
- variants
- variables
- typography
- assets
- prototype relationships
- source identity

This continuation does **not** own the entire Figma import/sync roadmap.

Its rule is narrower:

> do not make visual/Inspector architecture choices that destroy semantic information future import/sync needs.

Use deterministic translation when mappings are explicit.
Use agents only for ambiguity/inference, never instead of a document model.

### 14. Final transition from "Figma-like" to "field"

Only after the editor is genuinely coherent at Figma-class quality:

- identify where field should intentionally differ;
- add field-specific interaction or visual identity where it serves the web-first model;
- preserve familiar design-tool conventions where they reduce cognitive load;
- prefer better web-native semantics over imitation when the two conflict;
- keep the website as the real artifact;
- keep source first-class;
- keep Preview runtime truth.

Do not differentiate prematurely just to prove originality.

## Operating model

This parent assignment owns **no persistent product-source paths**.

Each concrete pass must:

1. fetch current `main`;
2. read current `field/control`;
3. read still-active legacy `tracker.md` ownership while it exists;
4. inspect what has landed since the previous pass;
5. verify whether a candidate is already fixed by another worker;
6. choose the highest-impact coherent unowned mismatch;
7. create or activate a narrow child assignment;
8. claim only exact required source paths;
9. create/adopt one implementation branch + Draft PR if implementation is required;
10. validate;
11. record exact QA evidence;
12. merge/close through the current canonical gate;
13. release ownership;
14. continue from current repository truth.

Do not accumulate broad `src/**` ownership.

Do not keep a child active merely because deployment or screenshot QA is pending if current coordination rules provide a QA-only closeout path.

## Prioritization questions

When choosing the next pass, ask:

- does this make field more professional?
- does it reduce the gap between design and implementation?
- does it improve visual or semantic parity?
- does it make routine site maintenance easier?
- does it belong clearly in Design, Content, Code, or Preview?
- is it native field behavior or inherited Revyme behavior?
- should it be deterministic or agent-driven?
- does it advance `FIELD_PRODUCT_ARCHITECTURE.md`, or merely add surface area?
- is the mismatch visible in rendered evidence?
- is the relevant source currently unowned?

## Explicit non-goals

This continuation is not permission for:

- broad decorative redesign
- generic SaaS restyling
- macOS Settings imitation
- GNOME/libadwaita drift
- purple branding
- selection blue used as decoration
- permanent ownership of the editor
- broad parser/generator changes disguised as polish
- Cloudflare/deployment changes disguised as UI work
- dependency upgrades
- replaying landed FigUI3 work
- AI-generated interpretation where deterministic models belong
- hiding parity defects cosmetically
- inventing unsupported Figma semantics
- bypassing active ownership because another worker is slow

## Current moving dependencies at registration

At this parent registration point, other active work includes or recently included:

- Gallery completion/hardening
- Dashboard/editor motion follow-up
- Dashboard thumbnail capture
- Scale QA closeout

These are moving facts.

Always refresh current coordination before selecting work.

Dashboard/project-surface work in particular must wait for or reconcile with current Dashboard ownership.

## QA standard

For every implementation child, record:

- exact implementation SHA
- exact tested main/base SHA
- focused tests
- TypeScript
- build status appropriate to risk
- runtime QA
- screenshot/human QA where visual
- harness limitations
- architecture drift assessment
- changed paths
- remaining unverified areas

Never inherit a PASS from an earlier child.

## Program completion standard

This continuation should not be considered globally complete because one child lands.

The FigUI3 baseline is mature enough to transition into "make it ours" only when:

- workspace chrome reads as one coherent system;
- Inspector reads as a professional design-tool Inspector across representative objects;
- dark and light modes both feel intentional;
- obvious inherited Revyme grammar is gone from routine surfaces;
- primary floating/menu/search primitives are coherent;
- Fill/Stroke paint stacks expose actual semantic state;
- pane collapse/reclaim behavior is professional and spatially correct;
- Canvas/Preview parity defects are traced and materially reduced;
- Dashboard/project surfaces belong to the same product;
- matched-scale screenshots show no major density/alignment/state inconsistency;
- source/runtime semantics remain first-class;
- Figma-compatible concepts are preserved;
- remaining differences from Figma are intentional field decisions rather than unfinished parity.

At that point, create a new explicitly scoped "make it ours" phase rather than allowing parity cleanup to mutate indefinitely.
