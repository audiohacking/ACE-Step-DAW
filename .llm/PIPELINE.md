# ACE-Step DAW — Automated Development Pipeline

> This file defines the cron-driven agent pipeline. Each agent runs periodically
> and picks up work from the previous stage.

## Pipeline Flow

```
┌──────────┐  Periodic   ┌──────────┐  Creates   ┌──────────┐  Implements  ┌──────────┐  Validates  ┌──────────┐
│ PM Agent │────────────>│  Issues  │──────────>│ Dev Agent│────────────>│ QA Agent │────────────>│  Merge   │
│ (weekly) │  specs/tasks │ (GitHub) │  picks up  │ (on-demand)│  runs tests │ (periodic)│  if green  │(orchestr)│
└──────────┘             └──────────┘           └──────────┘            └──────────┘           └──────────┘
      ^                                                                       │
      │                                                                       │
      └───────────── Bug reports feed back into PM planning ──────────────────┘
```

## Cron Schedule

| Agent | Frequency | What it does |
|-------|-----------|-------------|
| PM Agent | Weekly (Mon 10am) | Review research, write sprint plan, create GitHub Issues |
| QA Agent | Every 4 hours | Run user scenario tests, find bugs, create Issue for each |
| Dev Heartbeat | Every 20 min | Pick top issue, implement, PR, wait CI, merge |
| Daily Report | Daily 7pm | Summarize progress, metrics, blockers |
| Research Agent | On-demand | Triggered by PM or orchestrator for deep dives |

## How It Works

### 1. PM Agent (weekly)
- Reads: UX checklist, research reports, bug reports, competitive analysis
- Outputs: Updated TASK_QUEUE.md, new GitHub Issues with labels
- Creates sprint plan with acceptance criteria

### 2. QA Agent (every 4 hours)
- Starts dev server
- Runs Playwright through all core user workflows
- Takes screenshots at each step
- Compares with expected behavior
- Creates GitHub Issues for any bugs found (labeled `priority: P0`, `role: tester`)
- Writes test report to docs/qa/

### 3. Dev Heartbeat (every 20 min)
- Checks GitHub Issues labeled `status: backlog` + `priority: P0`
- Picks highest priority
- Implements fix/feature on a branch
- Runs build + tests
- Creates PR
- Waits for CI (all 5 checks)
- Merges when green
- Updates Issue status → Done

### 4. Daily Report (7pm)
- Runs metrics.sh
- Summarizes: PRs merged, issues closed, bugs found, test results
- Posts to Discord

## Self-Healing Properties
- QA finds bug → creates Issue → Dev picks it up → fixes → QA re-tests
- If CI fails → Dev investigates → fixes → CI re-runs
- If agent idle → heartbeat triggers → picks next task
- No human intervention needed for the pipeline to run
