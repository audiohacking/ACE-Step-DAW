# Capability QA - AI Generation

## Purpose

Validate the prompt-to-content workflow and its visible status states.

## Setup and Boundaries

- These stories are environment-sensitive and may require a reachable ACE-Step backend.
- If the backend is offline, the story must be marked `Blocked-env`, not passed or silently skipped.
- Human QA is required for musical usefulness, not just technical completion.

## Stories

### GEN-001 Generate a stems clip from a prompt

As a user, I want to turn a prompt into musical track content, so that AI generation feels like a core DAW workflow rather than a detached tool.

Acceptance criteria:
- A prompt can be entered and submitted from the visible generation surface.
- The target track receives generated content on success.
- The resulting clip is visible and can enter normal playback/edit workflows.

Automation mapping:
- `Blocked-env`
- Primary tests: `tests/e2e/generation-panel.spec.ts`, `tests/unit/generationPanel.test.tsx`, `tests/unit/generationProgress.test.ts`
- Blocker: live backend/API availability is required for end-to-end success

Human QA mapping:
- `H-required`
- Judge musical quality, prompt relevance, and whether the result feels usable.

### GEN-002 See progress, success, and failure states

As a user, I want visible status feedback during generation, so that I know whether the request is working, done, or failed.

Acceptance criteria:
- In-flight generation shows visible progress or streaming state.
- Success resolves into usable content and removes loading affordances.
- Failure surfaces an actionable error without freezing the workflow.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/generation-streaming.spec.ts`, `tests/unit/generationStore.test.ts`, `tests/unit/generationStreaming.test.ts`

Human QA mapping:
- `H-required`
- Confirm copy clarity and whether recovery options are understandable under failure.
