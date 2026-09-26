#!/bin/bash
set -e

PACKAGE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
REPO="${FIELD_REPO:-/Users/lrnolivia/Repos/field}"

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
echo "This template must be specialized with assignment-specific ownership,"
echo "compatibility, validation, apply, moving-main, commit, deploy, and QA logic."
exit 2
