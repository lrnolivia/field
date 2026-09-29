# viewport-header-lockstep mailbox

Status: active
Branch: field/viewport-header-lockstep
PR: pending
Base: 824a88e78f36d8c86b366a7841c9ad29def13e03

User directly requested that this bug be fixed and shipped while away.

Primary defect: viewport header and sandbox viewport are on different visual clocks during pan/zoom. Secondary defect: config fallback allows the header to paint before real viewport geometry on first load.

Next: create branch from the recorded current-main SHA, re-read owned source at that SHA, implement the bounded lockstep/readiness repair, validate, open Draft PR, run exact-head Preview QA, and merge only after gates pass.
