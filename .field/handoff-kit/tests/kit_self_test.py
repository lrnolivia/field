#!/usr/bin/env python3
from pathlib import Path
import json, tempfile, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
required = [
    "VERSION",
    "manifest.json",
    "README.md",
    "CHAT_BOOTSTRAP.md",
    "CONTRACT.md",
    "ASSIGNMENT_AUTHORING.md",
    "COMPOSIO_WRITE_BROKER.md",
    "bin/field-handoff",
    "installer/INSTALLER_CONTRACT.md",
    "installer/install-template.sh",
    "qa/FIRECRAWL_QA_PROTOCOL.md",
    "qa/QA_CLASSIFICATION.md",
    "qa/AUTHENTICATED_QA.md",
    "templates/assignment.md",
    "templates/assignment-unique-name.md",
    "templates/package-README.md",
    "templates/apply.mjs",
    "tests/contract_worker_v2_test.py",
]
for rel in required:
    p = ROOT / rel
    assert p.exists() and p.stat().st_size > 0, f"missing/empty: {rel}"

manifest = json.loads((ROOT / "manifest.json").read_text())
version = (ROOT / "VERSION").read_text().strip()
assert version == "2026-09-26.2"
assert manifest["version"] == version
assert manifest["repository"] == "lrnolivia/field"
assert manifest["control_branch"] == "field/control"
assert manifest["contract_worker"]["github_transport"] == "composio-exclusive"
assert manifest["contract_worker"]["native_github_connector_allowed"] is False
assert manifest["assignment_template"].endswith("templates/assignment-unique-name.md")

contract = (ROOT / "CONTRACT.md").read_text()
for phrase in [
    "Composio is the exclusive GitHub transport",
    "built-in ChatGPT GitHub connector is prohibited",
    "field/control",
    "assignment-<unique-name>.md",
    "protected",
    "Exact-SHA merge gate",
]:
    assert phrase in contract, phrase

broker = (ROOT / "COMPOSIO_WRITE_BROKER.md").read_text()
for phrase in [
    "exclusive GitHub transport",
    "Do not call the built-in ChatGPT GitHub connector",
    "COMPOSIO_SEARCH_TOOLS",
    "CONTRACT WORKER GITHUB UNAVAILABLE",
]:
    assert phrase in broker, phrase

bootstrap = (ROOT / "CHAT_BOOTSTRAP.md").read_text()
for phrase in [
    "Use Composio exclusively",
    "field/control",
    "active legacy",
]:
    assert phrase in bootstrap, phrase

legacy_template = (ROOT / "templates/assignment.md").read_text()
assert "DEPRECATED" in legacy_template
assert "assignment-unique-name.md" in legacy_template

subprocess.run(["python3", str(ROOT / "tests/contract_worker_v2_test.py")], check=True)
subprocess.run(["bash", "-n", str(ROOT / "installer/install-template.sh")], check=True)
subprocess.run(["node", "--check", str(ROOT / "templates/apply.mjs")], check=True)

with tempfile.TemporaryDirectory(prefix="field handoff kit ") as td:
    copied = Path(td) / "kit copy"
    shutil.copytree(ROOT, copied)
    json.loads((copied / "manifest.json").read_text())
    subprocess.run(["python3", str(copied / "tests/contract_worker_v2_test.py")], check=True)

print("field handoff kit self-test: PASS")
