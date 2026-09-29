# project-switch-isolation

P0 correctness repair activated from a live user report: every Dashboard project could show its own title while Canvas/Layers retained the same prior project's document.

Fresh-source diagnosis:
- ProjectFS is a same-document singleton.
- loadSnapshot() could load a new project's main files into the previous project's active branch.
- hydrateBranches() accumulated prior branches.
- activeCodeAtom / nodesAtom are version-gated and project hydration did not bump the version when the active path stayed app/page.client.tsx.
- mutation queue state and deferred fan-outs survive React remounts; Safari's setTimeout fallback was not tracked for cancellation.
- ProjectLoader wrote project-global metadata before checking whether the old loader had been cancelled.

Branch: field/project-switch-isolation
Base: 348c25d54a5acf60e96c6093bfefdcfd6e2d747b

Keep this batch strictly to project isolation. Manual Save UI is a separate next batch after this ships.
