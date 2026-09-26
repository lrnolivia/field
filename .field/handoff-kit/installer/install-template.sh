#!/bin/bash
set -e

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
REPO="$FIELD_REPO"
if [ -z "$REPO" ]; then
  REPO="/Users/lrnolivia/Repos/field"
fi

ASSIGNMENT_ID="__ASSIGNMENT_ID__"
COMMIT_MESSAGE="__COMMIT_MESSAGE__"

if [ ! -d "$REPO/.git" ]; then
  echo "ERROR: field repo not found at $REPO"
  exit 1
fi

cd "$REPO"
git fetch origin main

echo "===== FIELD HANDOFF KIT ====="
cat .field/handoff-kit/VERSION
echo
echo "This installer template belongs to the Codex/local-repository lane."
echo "It MUST NOT be used by a Contract Worker to push implementation directly to main."
echo "A Contract Worker uses field/control + field/<assignment-id> + Draft PR through Composio."
echo
echo "This template must be specialized with assignment-specific ownership,"
echo "compatibility, validation, apply, branch, moving-main, commit, deploy, and QA logic."
exit 2
