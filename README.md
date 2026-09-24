# field

**A visual web design environment by loew.fi.**

> the design is the real website

field is a source-first visual environment for designing, building, maintaining, and previewing real websites.

It is evolving from a customized Revyme foundation into a professional visual web design environment where the visual document and the real website remain aligned.

## Product modes

field is organized around four primary modes:

- **Design**
- **Content**
- **Code**
- **Preview**

### Design

The primary visual design environment.

Design owns layout, styling, typography, responsive behavior, components, instances, variants, assets, interactions, and other deterministic document structure.

### Content

The site-maintenance surface.

Content is responsible for CMS data, site copy, metadata, localization, structured content, and routine updates that should not require redesigning the site.

### Code

Source remains first-class.

field does not treat source as an export artifact. The underlying project remains inspectable, editable, portable, and part of the canonical website.

### Preview

Preview is runtime truth.

It represents the website running as closely as possible to its real production behavior and is the final reference when visual editing, source, or runtime behavior disagree.

## Core principles

- the website is the real artifact
- source remains first-class
- Preview is runtime truth
- Design, source, Preview, and production should remain aligned
- parity bugs should be traced to their first point of divergence
- deterministic concepts should be modeled explicitly
- AI should help with ambiguity, translation, cleanup, inference, and higher-level reasoning rather than substitute for a proper document model

## Architecture

field currently runs as three coordinated web surfaces.

### Local development

- editor — port 3333
- Canvas runtime — port 5174
- Preview runtime — port 5175

### Production

- field editor — https://field.loew.fi
- Canvas runtime — https://canvas.field.loew.fi
- Preview runtime — https://preview.field.loew.fi

Canvas and Preview intentionally run on separate origins from the editor.

The Canvas environment uses the isolation required for live visual editing.

Preview uses a less restrictive runtime environment so third-party embeds, cookies, and production-like website behavior can function correctly.

## Development

Install dependencies:

    npm ci

Run the complete local environment:

    npm run dev

Build all production surfaces:

    npm run build:all

Run unit tests:

    npm run test:run

Run linting:

    npm run lint

## Repository

Canonical repository:

    https://github.com/lrnolivia/field

Local development path:

    /Users/lrnolivia/Repos/field

## Upstream foundation

field originated as a customized fork of Revyme.

Some Revyme-prefixed identifiers remain intentionally intact where they represent upstream dependencies or compatibility contracts.

Examples include:

- @revyme/runtime
- @revyme/plugin-sdk
- VITE_REVYME_CLOUD
- existing _revyme compatibility structures
- existing Revyme-prefixed storage keys
- existing Revyme-prefixed protocol or event identifiers

These names describe implementation ancestry and compatibility boundaries.

They are not field's product identity and should not be mechanically renamed.

## Figma

Figma integration is a strategic part of field.

Where possible, field should preserve semantic concepts such as:

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

The goal is not merely visual import. The goal is to preserve design meaning wherever the field document model can represent it.

## Branding

Product name:

    field

Parent brand:

    loew.fi

Editorial form:

    field by loew.fi

field currently uses a temporary working logo and app-icon system.

Light, dark, transparent, and opaque variants are kept as separate assets so the editor and browser chrome can choose the appropriate treatment for their surface.

## License and attribution

field is a modified derivative of Revyme.

The existing LICENSE and NOTICE files remain authoritative.

Required upstream copyright, authorship, attribution, and licensing notices must remain intact.
