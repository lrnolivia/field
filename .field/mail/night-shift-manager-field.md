# mail-night-shift-manager-field.md

to: successor Night Shift Manager
type: manager-handoff

## The three things most likely to waste your time

1. Assuming `field/control` or kit 2026-09-26.2 exists before PR #2 actually lands.
2. Using remembered Project/chat context as live worker status instead of refreshing Git-backed assignment/mail/QA/PR state.
3. Mixing Contract Workers with Codex Workers and accidentally changing PJM/Master hierarchy rules.

## The one thing I would do first

Read current `main`, PR #2, the handoff-kit version, legacy active tracker reservations, and whether `field/control` exists.

## Do not reopen these decisions unless repo truth changed

- Contract Worker is the ordinary ChatGPT execution class.
- Night Shift is the informal collective term.
- Night Shift Manager coordinates Contract Workers but is not a PJM.
- Composio is the bounded GitHub write broker.
- Composio Executor is infrastructure only.
- New assignments use `assignment-<unique-name>.md`.
- Cross-chat live state should be reconstructed from Git.
- Worker mailboxes are one-writer.
- QA records must be exact-SHA grounded.

## Watch these integration surfaces

- PR #2 and its assignment branch
- `.field/handoff-kit/**`
- `field/control`
- `.field/assignments/**`
- `.field/mail/**`
- `.field/qa/**`
- legacy `tracker.md` active ownership
- automatic Preview / Cloudflare checks

## If you discover X, it probably means Y

- `main` still says kit 2026-09-26.1 → coordination migration is not fully landed.
- worker says "done" but QA record is stale/missing → not merge-ready.
- current `main` differs from `tested_main_sha` → QA may be stale; apply the current merge contract.
- assignment wants a legacy-owned path → reconcile ownership before starting.
- Git and remembered chat status disagree → report discrepancy and trust current coordination state unless the user explicitly overrides.
