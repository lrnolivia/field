# qa-field-preview-canvas-host-routing.md

```yaml
assignment: field-preview-canvas-host-routing
status: in-progress
tested_head_sha: null
tested_main_sha: 0c71cab5cdab71e651e08e9c35a3a79202eeac35
environment: branch Preview
runtime_qa: required
```

## Root-cause evidence

- current Worker production Canvas classifier: exact `canvas.field.loew.fi`
- observed branch Canvas host pattern: `<branch>.canvas-preview.loew.fi`
- current branch host falls through to editor/root asset routing
- Canvas COOP/COEP/CORP/OAC path is therefore skipped
- branch Preview itself can build/deploy successfully while Canvas fails

## Required acceptance evidence

NOT RUN. The implementing worker must record:

- exact repair head SHA
- exact main SHA
- targeted routing test results
- branch Preview build/deploy result
- branch Preview URL
- resolved Canvas host
- asset path served for Canvas host
- Canvas security headers
- real Canvas first paint result
- regression check for editor root + site Preview
