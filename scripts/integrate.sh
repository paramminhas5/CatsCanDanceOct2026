#!/usr/bin/env bash
# Integrate the product branches into platform/v1, regenerate the lockfile and build every app.
# Run from the repo root on branch platform/v1. Stops at the first failure.
set -euo pipefail

for b in platform/ccd platform/artists platform/gate; do
  if git ls-remote --exit-code --heads origin "$b" >/dev/null 2>&1; then
    echo "== merging $b"
    git fetch -q origin "$b"
    git merge --no-edit "origin/$b" || { echo "merge of $b needs a hand"; exit 1; }
  else
    echo "== $b not pushed yet, skipping"
  fi
done

echo "== install"
pnpm install --no-frozen-lockfile

echo "== build"
pnpm -r --workspace-concurrency=1 run typecheck
pnpm -r --workspace-concurrency=1 run build
echo "== all green"
