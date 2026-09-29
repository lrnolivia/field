# field product language

## rule

field uses a restrained naming system.

- structural/core product concepts use the clearest lowercase name;
- user-action and QoL features may use a verb or editorial lowercase name;
- ordinary improvements stay descriptive and unnamed;
- durable internal architecture may use `field.SOMETHING` sparingly.

Revyme is the technical origin. field is the product.

## casing

field has one **Brand casing** switch.

When Brand casing is on, eligible field-owned chrome uses the loew.fi lowercase voice across headings, panel labels, menus, buttons, tabs, tooltips, placeholders, and contextual actions.

Protected technical and product names keep their intended case, including `AI`, `SEO`, `CMS`, `API`, `A/B`, `Figma`, `Cloudflare`, `GitHub`, and architectural names such as `field.RUNTIME`.

When Brand casing is off, field renders normal/original UI casing.

Brand casing never rewrites project names, page names, filenames, user-authored website text, code, or other project content.

## current structural strings

| concept | field string |
| --- | --- |
| project dashboard | `home` |
| visual editing mode | `design` |
| content mode | `content` |
| source mode | `code` |
| runtime view | `preview` |
| Pages surface | `pages` |
| Layers surface | `layers` |
| media library | `media` |
| property surface | `inspector` |
| Gallery object | `gallery` |
| Group action/object | `group` |
| proportional tool | `scale` |
| field chrome theme controls | `appearance` |
| build/version modal | `about field` |

Workspace states remain `full`, `focus`, and `float`. Panel behavior remains `collapse`, `expand`, and `auto-hide`.

## current authored interaction names

### locate

`locate` finds the corresponding object on the live Canvas from another field surface. Selection-color locating belongs to this same interaction family.

### close read

`close read` is the text-editing focus experience: direct text entry, intelligent camera framing, caret following for oversized text, text-to-text handoff, and restoration of the previous Canvas view.

The ordinary action is still editing text; `close read` is the feature-level name for the QoL experience around it.

### drop in

`drop in` is the direct Gallery-media add interaction: drag media onto an existing Gallery to add it without routing through a separate creation flow.

### quick swap

`quick swap` is direct in-place Gallery media replacement/swap behavior.

These interaction names are feature/release language. They do not need to be stamped onto every control.

## descriptive capabilities, not names

Do not invent names for ordinary improvements such as smoother canvas panning, reliable project switching, better thumbnail refresh, improved Inspector alignment, faster project loading, more accurate group bounds, save conflict protection, or Safari input fixes.

Use plain language.

## architecture names

Current durable architecture names:

- `field.GLYPH`
- `field.MOTION`
- `field.RUNTIME`
- `field.BUILD`

Future/reserved:

- `field.GRAPH`

Do not create `field.SOMETHING` for ordinary modules, stores, implementation details, or one-off behavior.

## future product language

Core future design-tool concepts should stay clear unless a genuinely authored interaction emerges:

- `variables`
- `variants`
- `components`
- `libraries`
- `prototyping`
- `interactions`
- `constraints`

For Figma integration, use direct language such as `import from Figma` and `sync with Figma` until the interaction itself earns a distinct product name.

## text-string pass rule

A string sweep may normalize product terminology, but it must not turn every micro-improvement into a branded feature.

The intended contrast is:

**structural:** `home` · `media` · `layers` · `gallery` · `preview`

**authored interaction:** `locate` · `close read` · `drop in` · `quick swap`

**architecture:** `field.GLYPH` · `field.MOTION` · `field.RUNTIME` · `field.BUILD` · future `field.GRAPH`

Everything else can simply be good product language.
