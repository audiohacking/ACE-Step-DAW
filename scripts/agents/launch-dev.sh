#!/bin/bash
set -e
ISSUE_NUM=$1
TOOL=${2:-"codex"}
REPO="ace-step/ACE-Step-DAW"
DAW="/Users/junmingong/.openclaw/workspace/acestep-daw"
WT="/tmp/daw-worktrees/agent-$ISSUE_NUM"

TITLE=$(gh issue view $ISSUE_NUM --repo $REPO --json title --jq .title 2>/dev/null)
BODY=$(gh issue view $ISSUE_NUM --repo $REPO --json body --jq .body 2>/dev/null | head -80)

# ── STEP A: Fresh worktree from latest main (BASH enforced, not prompt) ──
if [ -n "$WT" ] && [[ "$WT" == /tmp/daw-worktrees/* ]]; then
  rm -rf "$WT"
fi
cd "$DAW"
git fetch origin main 2>/dev/null
git worktree prune 2>/dev/null
# Delete stale branch if exists
git branch -D "fix/issue-$ISSUE_NUM" 2>/dev/null || true
# Create worktree — if fails, abort with error
git worktree add "$WT" origin/main --detach 2>/dev/null || {
  echo "ERROR: failed to create worktree for #$ISSUE_NUM" >> /tmp/pm-activity.log
  exit 1
}
cd "$WT" || exit 1
git checkout -B "fix/issue-$ISSUE_NUM" origin/main 2>/dev/null || exit 1

CONTEXT=$(cat "$DAW/scripts/agents/AGENT_CONTEXT.md" 2>/dev/null)

# ── STEP B: Agent does the coding (prompt) ──
PROMPT="$CONTEXT
---
IMPLEMENT ISSUE #$ISSUE_NUM: $TITLE
Details: $BODY

You are on branch fix/issue-$ISSUE_NUM based on LATEST origin/main.
Implement the feature/fix. Then:
1. npx tsc --noEmit && npm run build && npx vitest run tests/unit/
2. git add -A && git commit -m 'feat: resolve #$ISSUE_NUM — $TITLE'
3. Done. Do NOT push or create PR — the wrapper script handles that."

# ── STEP C: Wrapper handles push + rebase + PR (BASH enforced) ──
# This runs AFTER the agent exits, guaranteeing rebase happens
# Write prompt to file (avoid bash escaping issues)
PROMPT_FILE="$WT/agent-prompt.txt"
echo "$PROMPT" > "$PROMPT_FILE"

# Write wrapper script
cat > "$WT/run-agent.sh" << 'WRAPPER_EOF'
#!/bin/bash
cd "$1"  # worktree path passed as arg
PROMPT=$(cat "$1/agent-prompt.txt")

# Run the coding agent (30 min timeout)
if [ "$2" = "codex" ]; then
  codex exec -C "$1" -s danger-full-access "$PROMPT"
else
  ~/.local/bin/claude --print --permission-mode bypassPermissions "$PROMPT"
fi

WRAPPER_EOF
chmod +x "$WT/run-agent.sh"

chmod +x "$WT/run-agent.sh"
# Kill agent after 30 min
(sleep 1800 && kill $(cat "$WT/.agent-pid" 2>/dev/null) 2>/dev/null) &
nohup bash "$WT/run-agent.sh" "$WT" "$TOOL" > "/tmp/daw-worktrees/agent-$ISSUE_NUM.${TOOL}.log" 2>&1 &
echo "$TOOL-$ISSUE_NUM: PID $!"
