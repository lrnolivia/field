# Installer contract

The installer system is retained for the **Codex/local-repository lane** and legacy assignments that explicitly require it.

It is not the default execution mechanism for Contract Workers.

## Codex lane

Existing PJM/Master/Codex Worker contracts remain authoritative.

A production installer should continue to preserve the durable safety rules already established by field:

- resolve package root before changing working directory
- locate the exact field repository
- preserve unrelated dirty work
- never use `reset --hard`, broad clean, force-push, or stash roulette
- parse Git porcelain without destroying leading status bytes
- stage only the exact allowlist
- rehearse transforms against verified preimages/postimages
- use the repo's exact dependency tree and repo-local binaries
- run focused tests, TypeScript, build, and diff/scope validation where applicable
- reconcile moving `main` at path level
- resume known partial postimages instead of destructively replaying them
- distinguish product failures from harness/installer failures
- verify the actual build-triggering/deployed HEAD during closeout

## Contract Worker lane

Contract Workers use:

```text
field/control
+ field/<assignment-id>
+ Draft PR
+ Composio-exclusive GitHub transport
```

Do not use a legacy installer to push Contract Worker implementation directly to `main`.

If a Contract Worker assignment genuinely needs a local-machine installer for implementation or QA, the assignment must explicitly say so and the installer must target the assignment branch, preserve the control-plane ownership contract, and leave merge as a separate explicit operation.

## Package UX

Where a Codex/local installer package is still appropriate:

```bash
cd ~/Downloads || exit 1
unzip -o field-<assignment>-YYYYMMDD.zip
cd field-<assignment>-YYYYMMDD || exit 1

chmod +x install-build-commit-push.sh
./install-build-commit-push.sh
```

The ZIP must unpack to one matching top-level directory and keep `install-build-commit-push.sh` at package root.
