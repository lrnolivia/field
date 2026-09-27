# Authenticated / human QA

Use authenticated/staging verification for requirements that disposable /builder/noauth cannot prove.

Examples include Cloudflare Access authentication/re-authentication, dashboard project listing/rename/star/trash/restore, R2 persistence, real account metadata, authenticated API behavior, ETag/stale-session conflict behavior, multi-browser or multi-session persistence, and production-only integration behavior.

Record the exact tested branch/main/deployed SHA when knowable, environment/URL, non-secret auth context, steps, expected result, actual result, and PASS / FAIL / BLOCKED / NOT RUN.

Do not place secrets, cookies, tokens, or private credentials in QA records.

Authenticated/human QA is separate evidence. It does not make stale branch QA current and does not permit claiming an untested SHA was validated.
