# qa-field-tracker-status-reconciliation.md

```yaml
assignment: field-tracker-status-reconciliation
status: not-started
runtime_qa: not-applicable
scope: tracker-coordination-state
```

## Required acceptance evidence

- exact base/main SHA used for reconciliation
- list of active legacy tracker assignment IDs after repair
- list of entries moved from Active to Completed, with evidence
- list of stale blocker/status prose corrected
- proof no assignment exists in both Active and Completed
- proof only `tracker.md` changed on the implementation branch
- PR number and exact head SHA
