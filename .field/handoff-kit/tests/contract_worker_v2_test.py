#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def path_overlap(a: str, b: str) -> bool:
    def norm(p: str) -> str:
        p = p.strip().rstrip("/")
        for suffix in ("/**", "/*"):
            if p.endswith(suffix):
                p = p[:-len(suffix)]
        return p.rstrip("/")
    a, b = norm(a), norm(b)
    return a == b or a.startswith(b + "/") or b.startswith(a + "/")

def validate_identity(filename: str, assignment_id: str, branch):
    assert filename == f"assignment-{assignment_id}.md"
    assert filename != "assignment.md"
    if branch not in (None, "null", ""):
        assert branch == f"field/{assignment_id}"

validate_identity("assignment-demo-work.md", "demo-work", "field/demo-work")
validate_identity("assignment-standing-role.md", "standing-role", None)

for bad in [
    ("assignment.md", "demo-work", "field/demo-work"),
    ("assignment-demo-work.md", "demo-work", "field/wrong"),
]:
    try:
        validate_identity(*bad)
    except AssertionError:
        pass
    else:
        raise AssertionError(f"invalid assignment identity accepted: {bad}")

legacy_owned = ["src/dashboard/**"]
contract_owned = ["src/editor/tools/Foo.tsx"]
candidate = ["src/dashboard/Dashboard.tsx"]
assert any(path_overlap(c, o) for c in candidate for o in legacy_owned + contract_owned)

approved_shared = ["src/dashboard/Dashboard.tsx"]
assert any(path_overlap(candidate[0], p) for p in approved_shared)

protected = ["cloudflare/**"]
assert path_overlap("cloudflare/worker.ts", protected[0])
assert protected[0] not in legacy_owned + contract_owned

template = (ROOT / "templates/assignment-unique-name.md").read_text()
for phrase in [
    "field_assignment: 1",
    "id: <unique-name>",
    "branch: field/<unique-name>",
    "execution_class: contract-worker",
    "Use Composio exclusively",
]:
    assert phrase in template, phrase

legacy = (ROOT / "templates/assignment.md").read_text()
assert "DEPRECATED" in legacy

firecrawl = (ROOT / "qa/FIRECRAWL_QA_PROTOCOL.md").read_text()
assert "Do not use production" in firecrawl
assert "BLOCKED/UNVERIFIED — HARNESS" in firecrawl

print("Contract Worker v2 regression tests: PASS")
