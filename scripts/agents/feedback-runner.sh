#!/bin/bash
# Feedback Runner — Fix CI failures on open PRs using Codex native sub-agents
# Single Codex process spawns sub-agents to fix all failing PRs in parallel
#
# Usage: feedback-runner.sh [max_parallel]
# Called by pm-auto.sh when there are PRs needing fixes

set -e
cd "$(dirname "$0")/../.."

REPO="ace-step/ACE-Step-DAW"
DAW="$(pwd)"
LOG=".pm/activity.log"
MAX_PARALLEL=${1:-4}
LOCKDIR="/tmp/feedback-runner.lock.d"

log() { echo "[$(date)] [feedback-runner] $*" >> "$LOG"; }

# Mutex
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCKDIR" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -gt 1800 ]; then
    rm -rf "$LOCKDIR"
    mkdir "$LOCKDIR" 2>/dev/null || exit 0
  else
    log "Skip — feedback runner already active"
    exit 0
  fi
fi
trap 'rm -rf "$LOCKDIR"' EXIT

# ── Find PRs with failed CI ──
FAILING_PRS=$(gh pr list --repo "$REPO" --state open --json number,title,headRefName,statusCheckRollup \
  --jq '[.[] | select(.statusCheckRollup | length > 0) | select(.statusCheckRollup | any(.conclusion == "FAILURE" or .conclusion == "ERROR")) | {number, title, branch: .headRefName}]' 2>/dev/null)

FAIL_COUNT=$(echo "$FAILING_PRS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "$FAIL_COUNT" = "0" ] || [ -z "$FAIL_COUNT" ]; then
  log "No failing PRs to fix"
  exit 0
fi

log "Feedback runner: $FAIL_COUNT PRs need fixes"

# ── Build fix prompt with CI logs for each failing PR ──
FIX_DETAILS=$(echo "$FAILING_PRS" | python3 -c "
import sys, json, subprocess

prs = json.load(sys.stdin)[:$MAX_PARALLEL]
for pr in prs:
    num = pr['number']
    branch = pr['branch']
    print(f\"### PR #{num}: {pr['title']}\")
    print(f\"Branch: {branch}\")
    
    # Get CI failure logs
    try:
        result = subprocess.run(
            ['gh', 'run', 'list', '--branch', branch, '--repo', '$REPO', '--status', 'failure',
             '--limit', '1', '--json', 'databaseId', '-q', '.[0].databaseId'],
            capture_output=True, text=True, timeout=10
        )
        run_id = result.stdout.strip()
        if run_id:
            logs = subprocess.run(
                ['gh', 'run', 'view', run_id, '--repo', '$REPO', '--log-failed'],
                capture_output=True, text=True, timeout=15
            )
            log_text = logs.stdout.strip()[-2000:] if logs.stdout else 'No logs captured'
            print(f\"CI Failure Log (last 2000 chars):\n\`\`\`\n{log_text}\n\`\`\`\")
    except:
        print('CI logs unavailable — run locally: npx tsc --noEmit && npm run build && npx vitest run tests/unit/')
    
    # Get review comments
    try:
        result = subprocess.run(
            ['gh', 'api', f'repos/$REPO/pulls/{num}/comments',
             '--jq', '.[] | \"**\" + .user.login + \"** on \`\" + .path + \":\" + (.line|tostring) + \"\`: \" + .body'],
            capture_output=True, text=True, timeout=10
        )
        if result.stdout.strip():
            print(f\"Review Comments:\n{result.stdout.strip()}\")
    except:
        pass
    print()
" 2>/dev/null)

FEEDBACK_PROMPT="# Fix Failing PRs

You are a senior developer fixing CI failures and review feedback on open PRs.

## Strategy
Use \`spawn_agent\` to create one sub-agent per failing PR. Each works in the existing worktree for that branch. Spawn ALL in parallel, then wait.

## Per-Agent Instructions
Each sub-agent must:
1. cd to the worktree: \`cd /tmp/daw-worktrees/agent-{ISSUE_NUM}\` (if exists) or check out the branch in repo
2. \`git fetch origin main && git rebase origin/main\` (resolve conflicts if any)
3. Fix ALL CI failures and review comments
4. Run quality gates: \`npx tsc --noEmit && npm run build && npx vitest run tests/unit/\`
5. \`git add -A && git commit -m 'fix: address CI/review feedback for #{ISSUE_NUM}'\`
6. \`git push origin fix/issue-{ISSUE_NUM} --force-with-lease\`

## Git Identity
\`\`\`
git config user.email 'junmin@acestudio.ai'
git config user.name 'ChuxiJ'
\`\`\`

## PRs to Fix
$FIX_DETAILS

GO — spawn agents for each PR now."

OUTPUT_FILE="/tmp/feedback-runner-output.txt"
log "Launching Codex feedback runner with native sub-agents"

codex exec \
  -C "$DAW" \
  --dangerously-bypass-approvals-and-sandbox \
  -m gpt-5.4 \
  -o "$OUTPUT_FILE" \
  "$FEEDBACK_PROMPT" 2>&1 | tee -a "$LOG"

log "Feedback runner complete (exit $?)"
