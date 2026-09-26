#!/usr/bin/env python3
from pathlib import Path
import json, tempfile, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
required = [
    "VERSION", "manifest.json", "README.md", "CHAT_BOOTSTRAP.md", "CONTRACT.md",
    "bin/field-handoff", "installer/INSTALLER_CONTRACT.md", "installer/install-template.sh",
    "qa/FIRECRAWL_QA_PROTOCOL.md", "qa/QA_CLASSIFICATION.md", "qa/AUTHENTICATED_QA.md",
    "templates/assignment.md", "templates/package-README.md", "templates/apply.mjs",
    "lessons/INSTALLER_LESSONS.md",
]
for rel in required:
    p = ROOT / rel
    assert p.exists() and p.stat().st_size > 0, f"missing/empty: {rel}"

manifest = json.loads((ROOT / "manifest.json").read_text())
version = (ROOT / "VERSION").read_text().strip()
assert manifest["version"] == version
assert manifest["repository"] == "lrnolivia/field"
assert manifest["production_qa"]["noauth_builder"] == "https://field.loew.fi/builder/noauth"

contract = (ROOT / "CONTRACT.md").read_text()
for phrase in ["`Owned:` reserves", "`Protected:` constrains", "porcelain=v1 -z", "Moving `main` is expected", "Firecrawl"]:
    assert phrase in contract, phrase

bootstrap = (ROOT / "CHAT_BOOTSTRAP.md").read_text()
assert "superseded by the current repo-hosted kit" in bootstrap
assert "Do not ask the user to upload the handoff kit" in bootstrap

qa = (ROOT / "qa/FIRECRAWL_QA_PROTOCOL.md").read_text()
for phrase in ["https://field.loew.fi/builder/noauth", "PASS", "FAIL — FIELD", "BLOCKED/UNVERIFIED — HARNESS", "Don't show again", "revyme-node:qa"]:
    assert phrase in qa, phrase

assignment = (ROOT / "templates/assignment.md").read_text()
assert "Mandatory rehydration" in assignment
assert "https://github.com/lrnolivia/field/tree/main/.field/handoff-kit" in assignment

subprocess.run(["bash", "-n", str(ROOT / "installer/install-template.sh")], check=True)
subprocess.run(["node", "--check", str(ROOT / "templates/apply.mjs")], check=True)

with tempfile.TemporaryDirectory(prefix="field handoff kit ") as td:
    copied = Path(td) / "kit copy"
    shutil.copytree(ROOT, copied)
    subprocess.run(["node", "--check", str(copied / "templates/apply.mjs")], check=True)
    json.loads((copied / "manifest.json").read_text())

print("field handoff kit self-test: PASS")
