# project-switch-isolation

P0 correctness repair for the live bug where every Dashboard project could show its own title while Canvas/Layers retained the prior project's document.

Fresh-source diagnosis:
- ProjectFS is a same-document singleton.
- `loadSnapshot()` could load a new project's main files into the previous project's active branch.
- `hydrateBranches()` accumulated prior branches.
- `activeCodeAtom` / `nodesAtom` are version-gated and project hydration did not bump the version when the active path stayed `app/page.client.tsx`.
- mutation queue state and deferred fan-outs survive React remounts; Safari's `setTimeout` fallback was not tracked for cancellation.
- ProjectLoader wrote project-global metadata before checking whether the old loader had been cancelled.

Shipped:
- PR #53
- merge commit `790789c2c94d0ad2cb7742c1285b00c48ad3aa48`
- focused regression + production build passed on the product-code head
- Cloudflare Workers build passed on the tested head
- temporary verification workflow removed before merge

Runtime QA is delegated to Codex per user instruction.

Manual Save UI remains a separate next batch and was not mixed into this P0 repair.
