# qa-field-branch-preview-live-qa.md

```yaml
assignment: field-branch-preview-live-qa
status: verified
preview_infrastructure_main_sha: f113cc483fd8a509e0da8d8950aa5f5e0b25788b
cloudflare_preview_trigger_uuid: 8429ee60-0447-4de3-89e0-248c5fab0e6c
cloudflare_preview_trigger_includes:
  - "*"
cloudflare_preview_trigger_excludes:
  - main
  - field/field-branch-preview-live-qa
build_command: npm run build
deploy_command: npx wrangler preview
runtime_entrypoint: /builder/noauth
runtime_qa: pass
```

## Original infrastructure proof

PR #15 proved the isolated Worker Preview configuration on head
`9863bd5412096b0893d794ce083169bedcce0cb2`, then merged it to main as
`f113cc483fd8a509e0da8d8950aa5f5e0b25788b`.

Confirmed:

- Preview `FIELD_PROJECTS` uses `field-projects-preview`, separate from production `field-projects`.
- Preview Durable Object binding is declared under `previews.durable_objects.bindings`; Cloudflare Worker Preview semantics provide isolated Preview namespace/storage.
- production R2 and top-level Durable Object migration remain unchanged.
- `/builder/noauth` serves the builder without an auth gate on a valid Preview.

## Reusable branch Preview trigger

Cloudflare previously exposed only a dedicated build trigger for
`field/field-branch-preview-live-qa`. That made the proof branch work but did not provide a durable all-PR build contract.

A reusable Preview trigger now exists:

- name: `field Preview branches`
- UUID: `8429ee60-0447-4de3-89e0-248c5fab0e6c`
- branch include: `*`
- branch excludes: `main`, `field/field-branch-preview-live-qa`
- build: `npm run build`
- deploy: `npx wrangler preview`
- build cache: enabled
- repository connection and build token reuse the existing field Worker configuration

This follows Cloudflare's documented model of one Preview trigger for all non-production branches.

The dedicated proof-branch trigger remains separate and the generalized trigger excludes it, preventing duplicate automatic builds for that branch.

## Cross-PR validation after reconciliation

Eight stale open PR branches were merged forward to Preview-enabled main without conflicts. Their fresh Cloudflare builds then completed successfully and their live `/builder/noauth` URLs were browser-tested read-only.

| PR | Exact tested head | Cloudflare build | Runtime |
| --- | --- | --- | --- |
| #3 | `97a16e6cf4f659ccd4c4f44050a1255cdd981fb1` | `33acdb7e-3d2d-4184-b50e-778135b545f8` | pass |
| #5 | `16982d199e7428fb8d1dd4eaf194e56f08d579a0` | `ac657250-6e79-4eff-88cf-2ee9254fc1b1` | pass |
| #8 | `417593eaa786e2b9b892df8adb4e9d57a9817d72` | `5e36574a-dd6c-440a-aae8-492dc0df546c` | pass |
| #9 | `0c7891ebef291bf161912d6a5f413e497602d9ee` | `21224fca-89a7-4ab8-9643-3f0e3c720c72` | pass |
| #10 | `322f1a4510498cf9204c943cfe54a8e723c29301` | `e25126b1-b2f1-481d-9444-a4bfa44f80cd` | pass |
| #11 | `2fa7beb2f52f06dab2d9b773b806fbe70a071bd7` | `e4a975a1-9dee-430d-8050-6733f13be785` | pass |
| #13 | `26a98ecf3485bc78e0ac43a9037aae6b3bcf8a55` | `aaa53b4a-7c9c-4806-91b0-1895c2f8605a` | pass |
| #14 | `fd490ae9304be1572603f0703066999ad1bbbada` | `81d07165-30eb-4a54-91c1-c2ef1e2c48e2` | pass |

PR #12 was already on the Preview-enabled baseline and was separately verified at head
`efe9921fab4ceffa2369da67e4a32b0665717852` with build
`8b27109a-deaf-4a26-a9ab-253eb3fc2fca` and a successful live browser smoke.

Therefore every currently open PR at the time of this validation had a usable branch Preview.

## Runtime result

Each tested Preview:

- resolved successfully
- loaded its branch-specific `canvas-preview.loew.fi` hostname
- opened `/builder/noauth` without authentication
- rendered the builder UI
- showed no Cloudflare placeholder or runtime error

A stale product identity remains visible in the onboarding modal: `Welcome to Revyme`. This is a product/content cleanup issue, not a Preview infrastructure failure.

## Recovery / cleanup evidence

During diagnosis, manual backfill jobs were queued through the new trigger. Once the normal PR-triggered Cloudflare builds proved healthy, those redundant manual jobs were stopped/cancelled to avoid duplicate deploy work. They are not acceptance evidence; the GitHub-linked branch builds in the table above are the canonical evidence.

## Staleness rule

Preview QA is exact-SHA evidence.

When a PR head changes:

1. its previous Preview runtime evidence becomes stale,
2. wait for the new Cloudflare Preview build,
3. verify the check is attached to the new head SHA,
4. retest the branch Preview at `/builder/noauth` when runtime QA is required.

A green build from an older head is never acceptance evidence for a newer head.
