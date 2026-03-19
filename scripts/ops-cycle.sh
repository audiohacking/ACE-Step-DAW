#!/bin/bash
# ACE-Step DAW — Ops Cycle
# Run by Claude Code CLI or Codex CLI: ~/.local/bin/claude --print --permission-mode bypassPermissions "bash /path/to/ops-cycle.sh"
set -e
cd "$(dirname "$0")/.."
REPO="ace-step/ACE-Step-DAW"

echo "=== Ops Cycle $(date) ==="

# 1. Merge ready PRs
echo "--- PRs ---"
gh pr list --repo $REPO --state open --limit 20 --json number,title,isDraft,mergeable | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    if not p['isDraft']:
        print(f'READY #{p[\"number\"]} [{p[\"mergeable\"]}]: {p[\"title\"][:50]}')
    else:
        print(f'DRAFT #{p[\"number\"]}: {p[\"title\"][:50]}')
"

# 2. Open issues needing work
echo "--- Issues ---"
gh issue list --repo $REPO --state open --limit 20 --json number,title,assignees | python3 -c "
import json,sys
for i in json.load(sys.stdin):
    a = [x['login'] for x in i.get('assignees',[])]
    print(f'#{i[\"number\"]} [{\"|\".join(a) or \"unassigned\"}]: {i[\"title\"][:50]}')
"

echo "=== Done ==="
