#!/bin/bash
# Agent Registry — single source of truth for who's doing what
# File: /tmp/agent-registry.json
# Format: {"agents": [{"id": "codex-434", "issue": 434, "tool": "codex", "pid": 12345, "started": "10:30:00", "status": "running"}]}

PM_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.pm"
mkdir -p "$PM_DIR"
REGISTRY="$PM_DIR/agent-registry.json"
[ ! -f "$REGISTRY" ] && echo '{"agents":[]}' > "$REGISTRY"

register() {
  local ISSUE=$1 TOOL=$2 PID=$3
  local ID="${TOOL}-${ISSUE}"
  local TIME=$(date '+%H:%M:%S')
  python3 -c "
import json
r = json.load(open('$REGISTRY'))
# Remove any existing entry for this issue
r['agents'] = [a for a in r['agents'] if a['issue'] != $ISSUE]
r['agents'].append({'id': '$ID', 'issue': $ISSUE, 'tool': '$TOOL', 'pid': $PID, 'started': '$TIME', 'status': 'running'})
json.dump(r, open('$REGISTRY', 'w'), indent=2)
"
  echo "Registered: $ID (PID $PID)"
}

unregister() {
  local ISSUE=$1
  python3 -c "
import json
r = json.load(open('$REGISTRY'))
r['agents'] = [a for a in r['agents'] if a['issue'] != $ISSUE]
json.dump(r, open('$REGISTRY', 'w'), indent=2)
"
  echo "Unregistered: #$ISSUE"
}

is_assigned() {
  local ISSUE=$1
  python3 -c "
import json
r = json.load(open('$REGISTRY'))
assigned = [a for a in r['agents'] if a['issue'] == $ISSUE and a['status'] == 'running']
# Verify PID is still alive
for a in assigned:
    import os
    try: os.kill(a['pid'], 0); print('yes'); exit()
    except: pass
# Dead agent — clean up
r['agents'] = [a for a in r['agents'] if a['issue'] != $ISSUE]
json.dump(r, open('$REGISTRY', 'w'), indent=2)
print('no')
"
}

list_agents() {
  python3 -c "
import json, os
r = json.load(open('$REGISTRY'))
alive = []
for a in r['agents']:
    try:
        os.kill(a['pid'], 0)
        alive.append(a)
        print(f\"  {a['id']:15s}  #{a['issue']}  PID:{a['pid']}  ⏱{a['started']}  {a['status']}\")
    except:
        pass  # dead process
# Update registry with only alive agents
r['agents'] = alive
json.dump(r, open('$REGISTRY', 'w'), indent=2)
if not alive: print('  (no agents)')
"
}

stale_agents() {
  # Find worktrees where the agent process is dead but the issue has an open (non-merged) PR
  local REPO="ace-step/ACE-Step-DAW"
  for wt in /tmp/daw-worktrees/agent-*; do
    [ -d "$wt" ] || continue
    local issue_num=$(basename "$wt" | sed 's/agent-//')
    # Skip if agent is still alive
    if pgrep -f "run-agent.sh.*agent-$issue_num" > /dev/null 2>&1; then
      continue
    fi
    # Check if there's an open PR for this issue
    local branch="fix/issue-$issue_num"
    local pr_info=$(gh pr list --repo "$REPO" --head "$branch" --state open --json number,mergeable,title --jq '.[0] | "\(.number)\t\(.mergeable)\t\(.title[:60])"' 2>/dev/null)
    if [ -n "$pr_info" ]; then
      local pr_num=$(echo "$pr_info" | cut -f1)
      local mergeable=$(echo "$pr_info" | cut -f2)
      local title=$(echo "$pr_info" | cut -f3)
      echo "STALE #$issue_num PR:#$pr_num $mergeable | $title"
    fi
  done
}

# CLI
case "$1" in
  register)   register "$2" "$3" "$4" ;;
  unregister) unregister "$2" ;;
  check)      is_assigned "$2" ;;
  list)       list_agents ;;
  stale)      stale_agents ;;
  *)          echo "Usage: registry.sh register|unregister|check|list|stale [args]" ;;
esac
