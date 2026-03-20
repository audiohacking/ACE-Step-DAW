# ACE-Step DAW - Release QA Checklist

> This file is a release-oriented checklist derived from the story matrix.
> Canonical source of truth: [docs/qa/story-matrix.md](../docs/qa/story-matrix.md)

## How To Use This File

- Use the matrix to decide which stories are in scope for the release.
- Use this checklist to record whether the release-critical subset actually ran.
- If a story is unclear here, update the capability doc and matrix first, not this file.

## Per-PR Quality Gate

### Build and Static Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] No new warnings introduced in changed areas

### Story Coverage Gate

- [ ] `npm run qa:validate`
- [ ] Every changed product area maps to one or more story ids in [docs/qa/story-matrix.md](../docs/qa/story-matrix.md)
- [ ] New or changed feature plans list `QA Stories Affected`
- [ ] New E2E or manual-facing tests declare covered story ids in the file header

### Core Regression Stories

- [ ] `ONB-001` first launch shows onboarding before project setup
- [ ] `PRJ-001` default project creation reaches a usable workspace
- [ ] `PRJ-002` custom name and BPM persist at project creation
- [ ] `TRK-001` stems track can be added from the picker
- [ ] `TRN-001` play/pause works from the keyboard
- [ ] `PNR-001` piano roll can be opened from track context
- [ ] `OUT-001` export dialog opens from the keyboard

## Release-Critical Story Selection

Use these labels from the matrix when building a release runlist:

- `release-critical`: must run before merge or release
- `core-regression`: run when the touched capability changes
- `long-tail`: schedule in milestone or full-system passes

## Human QA Gate

- [ ] All stories marked `H-required` in the selected matrix rows were explicitly reviewed
- [ ] Audio-only judgments were performed by a human and recorded as evidence
- [ ] Visual clarity or interaction-feel issues were written up against the correct story ids

## Every 5 Versions Full-System Pass

- [ ] Run all `release-critical` and `core-regression` stories
- [ ] Run long-tail stories for sequencing, mixing, and AI generation
- [ ] Capture screenshots or GIFs for all major surfaces touched by the release
- [ ] Review performance, visual polish, and browser behavior

## Report Template

```markdown
## QA Report - v0.0.X

### Build
- tsc:
- build:

### Story Results
| Story ID | Status | Coverage Type | Evidence | Notes |
| --- | --- | --- | --- | --- |
| ONB-001 | PASS | E2E + human | screenshot path | |
| PRJ-001 | PASS | E2E | playwright report | |

### Issues Found
1. [P0] Story ID - impact summary - issue link
2. [P1] Story ID - impact summary - issue link

### Verdict
- PASS / CONDITIONAL PASS / FAIL
```
