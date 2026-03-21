#!/bin/bash
# Sprint Runner — Single Codex agent with native sub-agents
# Replaces: N independent codex exec processes
# Uses: Codex multi_agent feature (spawn_agent) for parallel work
#
# Usage: sprint-runner.sh [max_parallel]
# Called by pm-auto.sh when there are open issues to work on

set -e
cd "$(dirname "$0")/../.."

REPO="ace-step/ACE-Step-DAW"
DAW="$(pwd)"
LOG=".pm/activity.log"
MAX_PARALLEL=${1:-6}
LOCKDIR="/tmp/sprint-runner.lock.d"

log() { echo "[$(date)] [sprint-runner] $*" >> "$LOG"; }

# Mutex — only one sprint runner at a time
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCKDIR" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -gt 3600 ]; then
    rm -rf "$LOCKDIR"
    mkdir "$LOCKDIR" 2>/dev/null || exit 0
  else
    log "Skip — sprint runner already active"
    exit 0
  fi
fi
trap 'rm -rf "$LOCKDIR"' EXIT

# ── Gather open issues not already being worked on ──
ISSUES_JSON=$(gh issue list --repo "$REPO" --state open --limit 20 \
  --json number,title,body,labels \
  --jq '[.[] | {number, title, body, labels: [.labels[].name]}]' 2>/dev/null)

ISSUE_COUNT=$(echo "$ISSUES_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "$ISSUE_COUNT" = "0" ] || [ -z "$ISSUE_COUNT" ]; then
  log "No open issues to work on"
  exit 0
fi

# Filter out issues that already have open PRs
FILTERED_ISSUES=$(echo "$ISSUES_JSON" | python3 -c "
import sys, json, subprocess

issues = json.load(sys.stdin)
result = []
for issue in issues:
    num = issue['number']
    branch = f'fix/issue-{num}'
    try:
        pr = subprocess.run(
            ['gh', 'pr', 'list', '--repo', '$REPO', '--head', branch, '--state', 'open', '--json', 'number', '-q', '.[0].number'],
            capture_output=True, text=True, timeout=10
        )
        if pr.stdout.strip():
            continue  # Already has PR
    except:
        pass
    result.append(issue)
print(json.dumps(result))
" 2>/dev/null)

FILTERED_COUNT=$(echo "$FILTERED_ISSUES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "$FILTERED_COUNT" = "0" ] || [ -z "$FILTERED_COUNT" ]; then
  log "All open issues already have PRs in progress"
  exit 0
fi

log "Sprint runner: $FILTERED_COUNT issues ready, max $MAX_PARALLEL parallel"

# ── Build the sprint prompt ──
ISSUE_LIST=$(echo "$FILTERED_ISSUES" | python3 -c "
import sys, json
issues = json.load(sys.stdin)
for i in issues[:$MAX_PARALLEL]:
    labels = ', '.join(i.get('labels', []))
    print(f\"### Issue #{i['number']}: {i['title']}\")
    print(f\"Labels: {labels}\")
    print(f\"Branch: fix/issue-{i['number']}\")
    print(f\"{i.get('body', 'No description')}\")
    print()
" 2>/dev/null)

SPRINT_PROMPT="# Sprint: Parallel Feature Implementation

You are a lead developer managing a sprint for ACE-Step DAW (browser-based AI-native DAW).

## Your Strategy
Use \`spawn_agent\` to create one sub-agent per issue below. Each sub-agent works in its own git worktree independently. You should spawn ALL agents in parallel, then wait for them to complete.

## Per-Agent Setup
Each sub-agent must:
1. Create a fresh worktree: \`git worktree add /tmp/daw-worktrees/agent-{ISSUE_NUM} origin/main --detach && cd /tmp/daw-worktrees/agent-{ISSUE_NUM} && git checkout -B fix/issue-{ISSUE_NUM} origin/main\`
2. Read \`CLAUDE.md\` and \`AGENTS.md\` for coding standards
3. Write failing tests FIRST (TDD)
4. Implement the feature
5. Run quality gates: \`npx tsc --noEmit && npm run build && npx vitest run tests/unit/\`
6. Commit: \`git add -A && git commit -m 'feat: resolve #{ISSUE_NUM}'\`
7. Push: \`git push origin fix/issue-{ISSUE_NUM} --force-with-lease\`
8. Create PR: \`gh pr create --repo $REPO --title 'feat: #{ISSUE_NUM} — {TITLE}' --body 'Closes #{ISSUE_NUM}' --base main --head fix/issue-{ISSUE_NUM}\`

## Git Identity
\`\`\`
git config user.email 'junmin@acestudio.ai'
git config user.name 'ChuxiJ'
\`\`\`

## Code Quality Requirements
- 0 TypeScript \`any\` types
- Every UI action = Zustand store action  
- Components < 600 lines
- Tests for every new feature

## Issues to Implement
$ISSUE_LIST

## Execution Plan
1. Spawn one sub-agent per issue (up to $MAX_PARALLEL in parallel)
2. Each agent works independently in its own worktree
3. Wait for all to complete
4. Report which succeeded and which failed

GO — spawn agents now, don't wait for confirmation."

# ── Launch single Codex with native sub-agents ──
OUTPUT_FILE="/tmp/sprint-runner-output.txt"
log "Launching Codex sprint runner with native sub-agents"

codex exec \
  -C "$DAW" \
  --full-auto \
  -m gpt-5.4 \
  -o "$OUTPUT_FILE" \
  "$SPRINT_PROMPT" 2>&1 | tee -a "$LOG"

EXIT_CODE=$?
log "Sprint runner finished (exit $EXIT_CODE)"

# ── Request Copilot review on new PRs ──
for issue in $(echo "$FILTERED_ISSUES" | python3 -c "import sys,json; [print(i['number']) for i in json.load(sys.stdin)[:$MAX_PARALLEL]]" 2>/dev/null); do
  BRANCH="fix/issue-$issue"
  PR_NUM=$(gh pr list --repo "$REPO" --head "$BRANCH" --state open --json number -q '.[0].number' 2>/dev/null)
  if [ -n "$PR_NUM" ]; then
    gh api "repos/$REPO/pulls/$PR_NUM/requested_reviewers" \
      -f "reviewers[]=copilot[bot]" 2>/dev/null && log "Copilot review requested on PR #$PR_NUM"
  fi
done

log "Sprint runner complete"
