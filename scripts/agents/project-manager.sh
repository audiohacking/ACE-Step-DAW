#!/bin/bash
# Project Manager — Intelligent Agent Orchestrator
# PRIORITY ORDER: 1) Merge ready PRs  2) Balance team  3) Trigger maintenance
set -e
cd /Users/junmingong/.openclaw/workspace/acestep-daw
REPO="ace-step/ACE-Step-DAW"

echo "=== PM Brain $(date) ==="

##############################################
# STEP 1: MERGE — Always check first
##############################################
echo "--- Step 1: Merge ready PRs ---"
READY_PRS=$(gh pr list --repo $REPO --state open --json number,isDraft,mergeable --jq '.[] | select(.isDraft==false) | "\(.number) \(.mergeable)"')
MERGED_COUNT=0
echo "$READY_PRS" | while read -r NUM MERGEABLE; do
  [ -z "$NUM" ] && continue
  if [ "$MERGEABLE" = "MERGEABLE" ]; then
    # Check CI
    FAIL_COUNT=$(gh pr checks $NUM --repo $REPO 2>&1 | grep -c "fail" || true)
    PENDING_COUNT=$(gh pr checks $NUM --repo $REPO 2>&1 | grep -c "pending" || true)
    if [ "$FAIL_COUNT" = "0" ] && [ "$PENDING_COUNT" = "0" ]; then
      echo "  ✅ Merging PR #$NUM"
      gh pr merge $NUM --repo $REPO --squash --admin 2>/dev/null || true
      MERGED_COUNT=$((MERGED_COUNT + 1))
    else
      echo "  ⏳ PR #$NUM: CI pending or failed"
    fi
  elif [ "$MERGEABLE" = "CONFLICTING" ]; then
    echo "  ⚠️ PR #$NUM: CONFLICT — launching rebase agent"
    BRANCH=$(gh pr view $NUM --repo $REPO --json headRefName --jq .headRefName)
    ~/.local/bin/claude --print --permission-mode bypassPermissions \
      "cd /Users/junmingong/.openclaw/workspace/acestep-daw && git fetch origin && git checkout $BRANCH && git rebase origin/main && git push --force-with-lease origin $BRANCH && git checkout main" &
  fi
done

##############################################
# STEP 2: BALANCE — Adjust team size
##############################################
echo "--- Step 2: Balance team ---"
OPEN_ISSUES=$(gh issue list --repo $REPO --state open --json number --jq length)
OPEN_PRS=$(gh pr list --repo $REPO --state open --json number --jq length)
RUNNING_CLI=$(ps aux | grep 'claude.*print' | grep -v grep | wc -l | tr -d ' ')

echo "  Issues: $OPEN_ISSUES | PRs: $OPEN_PRS | CLI: $RUNNING_CLI"

if [ "$OPEN_ISSUES" -lt 3 ]; then
  echo "  → Issues low: launching Researcher + PM to create more"
  bash scripts/agents/researcher.sh &
  bash scripts/agents/product-manager-review.sh &
elif [ "$OPEN_ISSUES" -gt 5 ] && [ "$RUNNING_CLI" -lt 3 ]; then
  echo "  → Issues high, devs low: launching developers"
  TOP_ISSUES=$(gh issue list --repo $REPO --state open --label "role: developer" --json number,title --jq '.[0:3][] | .number')
  for NUM in $TOP_ISSUES; do
    TITLE=$(gh issue view $NUM --repo $REPO --json title --jq .title)
    echo "    Launching dev for #$NUM: $TITLE"
    ~/.local/bin/claude --print --permission-mode bypassPermissions \
      "Implement issue #$NUM ($TITLE) in /Users/junmingong/.openclaw/workspace/acestep-daw. git fetch origin && git reset --hard origin/main. Build, test, create PR." &
    sleep 2
  done
fi

##############################################
# STEP 3: MAINTENANCE — Refactor + Release
##############################################
TOTAL_COMMITS=$(git rev-list --count HEAD)
LAST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)

if [ $((TOTAL_COMMITS % 20)) -eq 0 ] 2>/dev/null; then
  echo "--- Step 3a: Triggering refactorer ---"
  bash scripts/agents/refactorer.sh &
fi

if [ -n "$LAST_TAG" ]; then
  FEATS_SINCE=$(git log ${LAST_TAG}..HEAD --oneline --grep='feat:' | wc -l | tr -d ' ')
  if [ "$FEATS_SINCE" -ge 5 ]; then
    echo "--- Step 3b: $FEATS_SINCE features since $LAST_TAG → Release eval ---"
    bash scripts/agents/release-manager.sh &
  fi
fi

echo "=== PM Done ==="
