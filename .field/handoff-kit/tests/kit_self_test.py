#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]

manifest = json.loads((ROOT / "manifest.json").read_text())
version = (ROOT / "VERSION").read_text().strip()

assert version == "2026-09-29.1"
assert manifest["version"] == version
assert manifest["repository"] == "lrnolivia/field"
assert manifest["universal_authority"]["repository"] == "lrnolivia/loew-runner"
assert manifest["universal_authority"]["bible"] == "LOEW_CHAT_BIBLE.md"

qa = manifest["runtime_qa"]
assert qa["authority"] == "loew-runner-first"
assert qa["web_visible"] == "exact-sha-preview"
assert qa["routine_engine"] == "deterministic-inspector-github-chromium"
assert qa["real_project_entrypoint"] == "/qa/work/<projectId>"
assert qa["smoke_only_entrypoint"] == "/builder/noauth"
assert qa["exact_sha_required"] is True

root = Path(__file__).resolve().parents[3]
agents = (root / "AGENTS.md").read_text()
assert "canonical target" in agents
assert "lrnolivia/field" in agents
assert "revyme-loewfi" in agents
assert "Historical handoffs" in agents
assert "section 11 is authoritative" in agents

subprocess.run(
    ["python3", str(ROOT / "tests/contract_worker_v2_test.py")],
    check=True,
)

print("field handoff kit self-test: PASS")
