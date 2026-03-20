# Capability QA - Onboarding

## Purpose

Validate the first-run experience before a user has any project context.

## Setup and Boundaries

- Start from a clean browser profile or clear persisted UI/project state.
- Prefer browser-only verification for visibility, skipping, and focus behavior.
- Store setup is not allowed unless the story explicitly says it is.
- Human QA is required to judge clarity, pacing, and visual hierarchy.

## Agent Evidence Rules

- Capture a screenshot of the first-run surface.
- Attach trace or console output if onboarding is blocked by another overlay.
- Record whether the next expected surface was the onboarding flow or the project dialog.

## Stories

### ONB-001 First launch shows onboarding before project setup

As a new user, I want to see onboarding before the DAW asks me to configure a project, so that the first launch feels guided rather than abrupt.

Acceptance criteria:
- Opening the app on a fresh profile shows the onboarding surface first.
- The new-project dialog is not visible until onboarding is completed or skipped.
- The onboarding surface is focusable and visible without hidden interception from lower layers.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/onboarding.spec.ts`, `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`
- Intentionally not automated: subjective clarity of copy and pacing

Human QA mapping:
- `H-required`
- Confirm visual hierarchy, readability, and whether the path feels understandable to a first-time user.

### ONB-002 Skip onboarding to project creation

As a new user, I want to skip onboarding and continue to project setup, so that I can get to the DAW quickly without breaking first-run state.

Acceptance criteria:
- The skip action is visible and reachable by keyboard and pointer.
- Skipping onboarding opens the new-project surface rather than leaving the app in a blank intermediate state.
- The system does not reopen onboarding in the same session unless the app is reset.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/onboarding.spec.ts`, `tests/support/e2eStartup.ts`
- Missing today: explicit E2E assertion for persistent skip behavior across reload

Human QA mapping:
- `H-required`
- Verify that skip feels intentional and does not trap the user in layered overlays.
