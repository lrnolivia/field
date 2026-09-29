---
assignment: viewport-header-lockstep
branch: field/viewport-header-lockstep
pr: null
tested_head_sha: null
tested_main_sha: 824a88e78f36d8c86b366a7841c9ad29def13e03
environment: Cloudflare branch Preview /builder/noauth
build: NOT RUN
tests: NOT RUN
runtime_qa: NOT RUN
tested_at: null
evidence: []
---

# QA

Required runtime acceptance:
- fresh load does not show an orphan viewport header before viewport content
- slow/fast pan keeps header rigidly attached to viewport
- zoom keeps attachment and header sizing correct
- fit/recenter remains attached
- no stale header flash on file/page switch
