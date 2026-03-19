#!/bin/bash
# Create or refresh a disposable worktree for any agent role.
# Usage: source ensure-worktree.sh <role-name>
#   Sets WT to the worktree path. Caller should `cd "$WT"` after sourcing.
#
# This avoids `git reset --hard` on the shared main checkout, which destroys
# other agents' uncommitted work.

ROLE=${1:?"Usage: source ensure-worktree.sh <role-name>"}

# Sanitize ROLE: only allow alphanumeric, hyphen, underscore
if [[ ! "$ROLE" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "ERROR: invalid role name '$ROLE' (only [A-Za-z0-9_-] allowed)" >&2
  exit 1
fi

# Derive DAW root from this script's location (scripts/agents/ensure-worktree.sh → repo root)
DAW="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WT="/tmp/daw-worktrees/${ROLE}"

# Safety guard before rm -rf
if [[ "$WT" != /tmp/daw-worktrees/* ]]; then
  echo "ERROR: refusing to delete '$WT' — not under /tmp/daw-worktrees/" >&2
  exit 1
fi

# Clean stale worktree
[ -d "$WT" ] && rm -rf "$WT"

cd "$DAW"
git fetch origin main 2>/dev/null
git worktree prune 2>/dev/null

# Create detached worktree at origin/main (never touches the main checkout)
git worktree add "$WT" origin/main --detach 2>/dev/null || {
  echo "ERROR: worktree creation failed for $ROLE" >&2
  exit 1
}

# Install node_modules via symlink (fast, avoids full npm install)
if [ -d "$DAW/node_modules" ] && [ ! -d "$WT/node_modules" ]; then
  ln -s "$DAW/node_modules" "$WT/node_modules" 2>/dev/null
fi

export WT
