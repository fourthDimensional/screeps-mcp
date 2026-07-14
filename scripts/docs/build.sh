#!/usr/bin/env bash
# Clone/refresh the screeps docs source and rebuild the search index.
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p ../../data

if [ -d screeps-docs ]; then
  git -C screeps-docs pull --ff-only
else
  git clone --depth 1 https://github.com/screeps/docs screeps-docs
fi

curl -sL https://raw.githubusercontent.com/screeps/common/master/lib/constants.js -o constants.js
node ingest.mjs --src ./screeps-docs --constants ./constants.js --db ../../data/screeps_docs.db
