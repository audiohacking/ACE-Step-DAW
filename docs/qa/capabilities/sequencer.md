# Capability QA - Sequencer

## Purpose

Validate pattern-entry workflows for beat-oriented composition.

## Setup and Boundaries

- Start from a project with a sequencer track.
- Prefer visible step toggling for user stories.
- Human QA is required for groove, timing feel, and pad responsiveness.

## Stories

### SEQ-001 Program a basic step pattern

As a user, I want to toggle steps in a sequencer grid, so that I can build a drum pattern quickly.

Acceptance criteria:
- Turning steps on and off changes the stored pattern.
- A basic pattern can be created without editor crashes.
- Step state remains consistent across playback and editor refresh.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/sequencer.spec.ts`, `tests/unit/sessionStore.test.ts`
- Missing today: stronger browser-visible pattern verification linked to story ids

Human QA mapping:
- `H-required`
- Listen for timing, loop feel, and per-row pattern clarity.
