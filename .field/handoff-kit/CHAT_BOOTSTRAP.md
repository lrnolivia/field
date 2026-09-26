# field chat bootstrap

This is the canonical operational reset point for any chat doing field work.

## New chat

Before planning or implementation:

1. Read this file.
2. Read `.field/handoff-kit/manifest.json`.
3. Read `.field/handoff-kit/CONTRACT.md`.
4. Read the live `tracker.md`.
5. Read the assignment file.
6. Read any product/architecture sources named by the assignment.

Do not ask the user to upload the handoff kit. The repository copy is canonical.

## Existing chat / process reset

When an assignment tells an existing chat to rehydrate from the current handoff kit:

- Treat prior **handoff, installer, tracker, ownership, validation, deployment, and QA process assumptions** from the conversation as superseded by the current repo-hosted kit.
- Keep valid product decisions and assignment-specific findings unless current repo truth or an explicit current user decision supersedes them.
- Re-read the current kit and live tracker before doing more work.
- Do not keep using an attached, remembered, quoted, or previously downloaded copy of the kit when the repository version is available.
- Do not silently merge old process rules with the current kit. Current kit wins for process.
- If the current assignment conflicts with the kit, an explicit current user decision wins. Record the exception rather than weakening the kit globally.

This is an operational rehydration rule, not a request to erase chat history or product context.

## Truth precedence

### Product direction

1. explicit current user decision
2. `FIELD_PRODUCT_ARCHITECTURE.md`
3. `LOEWFI_NAMING_SYSTEM.md`
4. current PJM / Master contracts
5. current handoffs / recent decisions
6. historical baselines

### Implementation state

1. current repository / deployed infrastructure
2. newest verified worker report or handoff
3. older implementation docs
4. historical assumptions

Do not confuse product intent with implementation state.

## First repo checks

At minimum establish current `origin/main`, assignment ancestry, active `Owned:` paths, current target-file blobs/preimages, local target dirt/staged state when relevant, and the current kit version.

Moving `main` is normal. Reconcile path-level drift; do not treat every newer commit as a conflict.

## Core field principle

The website is the real artifact. Source stays first-class. Preview is runtime truth. Design, source, Preview, and production should remain aligned.

For visible/runtime changes, production QA is part of completion. Use the Firecrawl protocol where it can prove the acceptance criteria.
