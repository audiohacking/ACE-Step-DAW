#!/bin/bash
# Project Manager — Pure bash, zero AI cost
# Runs deterministic logic: merge PRs, balance agents, launch work
set -e
cd /Users/junmingong/.openclaw/workspace/acestep-daw
REPO="ace-step/ACE-Step-DAW"
CONTEXT_FILE="scripts/agents/AGENT_CONTEXT.md"

echo "=== PM $(date '+%H:%M') ==="

# ── STEP 1: Merge ready PRs ──
MERGED=0
gh pr list --repo $REPO --state open --json number,isDraft,mergeable --jq '.[] | select(.isDraft==false and .mergeable=="MERGEABLE") | .number' 2>/dev/null | while read NUM; do
  FAIL=$(gh pr checks $NUM --repo $REPO 2>&1 | grep -c "fail" || true)
  PEND=$(gh pr checks $NUM --repo $REPO 2>&1 | grep -c "pending" || true)
  if [ "$FAIL" = "0" ] && [ "$PEND" = "0" ]; then
    gh pr merge $NUM --repo $REPO --squash --admin 2>/dev/null && echo "  ✅ Merged #$NUM" && MERGED=$((MERGED+1))
  fi
done

# ── STEP 2: Count current state ──
ISSUES=$(gh issue list --repo $REPO --state open --label "role: developer" --json number --jq length 2>/dev/null)
CC=$(ps aux | grep 'claude.*print' | grep -v grep | wc -l | tr -d ' ')
CX=$(ps aux | grep 'codex exec' | grep -v grep | wc -l | tr -d ' ')
TOTAL=$((CC + CX))

echo "  Issues: $ISSUES | CC: $CC | Codex: $CX | Total: $TOTAL"

# ── STEP 3: Balance — prefer Codex, cap Claude Code ──
MAX_CC=5
MAX_CX=10
NEED=$((ISSUES - TOTAL))
[ "$NEED" -lt 0 ] && NEED=0
[ "$NEED" -gt 5 ] && NEED=5

# Fill Codex first (cheaper), then Claude Code
CX_SLOTS=$((MAX_CX - CX))
[ "$CX_SLOTS" -lt 0 ] && CX_SLOTS=0
CX_LAUNCH=$NEED
[ "$CX_LAUNCH" -gt "$CX_SLOTS" ] && CX_LAUNCH=$CX_SLOTS

CC_LAUNCH=$((NEED - CX_LAUNCH))
CC_SLOTS=$((MAX_CC - CC))
[ "$CC_SLOTS" -lt 0 ] && CC_SLOTS=0
[ "$CC_LAUNCH" -gt "$CC_SLOTS" ] && CC_LAUNCH=$CC_SLOTS

echo "  Launch: Codex=$CX_LAUNCH, CC=$CC_LAUNCH"

# ── STEP 4: Launch Codex agents ──
if [ "$CX_LAUNCH" -gt 0 ]; then
  IDX=0
  gh issue list --repo $REPO --state open --label "role: developer" --json number,title --jq ".[$TOTAL:$((TOTAL+CX_LAUNCH))][] | \"\(.number)|\(.title)\"" 2>/dev/null | while IFS='|' read -r NUM TITLE; do
    [ -z "$NUM" ] && continue
    WT="/tmp/daw-worktrees/codex-pm-$NUM"
    mkdir -p "$WT" 2>/dev/null
    git worktree add "$WT" origin/main --detach 2>/dev/null || true
    CONTEXT=$(cat "$CONTEXT_FILE" 2>/dev/null)
    codex exec -s danger-full-access "cd $WT && git fetch origin && git checkout -B fix/issue-$NUM origin/main
$CONTEXT
---
Implement issue #$NUM: $TITLE. Build, test, commit as ChuxiJ <junmin@acestudio.ai>, push, create PR." &
    echo "  🚀 Codex → #$NUM"
  done
fi

# ── STEP 5: Launch Claude Code agents (only if Codex slots full) ──
if [ "$CC_LAUNCH" -gt 0 ]; then
  OFFSET=$((TOTAL + CX_LAUNCH))
  gh issue list --repo $REPO --state open --label "role: developer" --json number,title --jq ".[$OFFSET:$((OFFSET+CC_LAUNCH))][] | \"\(.number)|\(.title)\"" 2>/dev/null | while IFS='|' read -r NUM TITLE; do
    [ -z "$NUM" ] && continue
    WT="/tmp/daw-worktrees/cc-pm-$NUM"
    mkdir -p "$WT" 2>/dev/null
    git worktree add "$WT" origin/main --detach 2>/dev/null || true
    bash scripts/agents/launch-dev.sh "$NUM" "$WT" claude &
    echo "  🚀 CC → #$NUM"
  done
fi

echo "=== PM Done ==="
