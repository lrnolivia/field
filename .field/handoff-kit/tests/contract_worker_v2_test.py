#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

contract = (ROOT / "CONTRACT.md").read_text()
bootstrap = (ROOT / "CHAT_BOOTSTRAP.md").read_text()
preview = (ROOT / "qa/BROWSER_PREVIEW_QA_PROTOCOL.md").read_text()
template = (ROOT / "templates/assignment-unique-name.md").read_text()

for phrase in [
    "lrnolivia/loew-runner@main",
    "lrnolivia/field",
    "Runner Bible section 11",
    "/qa/work/<projectId>",
    "/builder/noauth",
]:
    assert phrase in contract, phrase

assert "smoke-only" in contract
assert "deterministic Inspector/GitHub Chromium" in contract
assert "Browser Run" in contract

assert "Runner comes first" in bootstrap
assert "smoke harness" in bootstrap

assert "Runner-first law" in preview
assert "deterministic Inspector/GitHub Chromium" in preview
assert "/qa/work/<projectId>" in preview
assert "smoke/isolation checks" in preview

assert "kit: 2026-09-29.1" in template
assert "re-read current `lrnolivia/loew-runner@main/contracts/manifest.json`" in template
assert "Runner-approved harness" in template

print("field Contract Worker governance regression: PASS")
