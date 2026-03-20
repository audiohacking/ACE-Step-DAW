# Capability QA - Piano Roll

## Purpose

Validate the core MIDI editing workflow and the discoverability of the piano-roll editor.

## Setup and Boundaries

- Stories may seed a piano roll track or clip through the store when the UI under test is the editor behavior itself.
- User-facing open/close flows should still be validated through visible interactions.
- Human QA must judge editing comfort, preview feel, and visual note rendering.

## Stories

### PNR-001 Open the piano roll for a track

As a user, I want to open the piano roll from the track context, so that I can reach MIDI editing without hidden setup.

Acceptance criteria:
- A piano roll track exposes an open action through the visible UI.
- Opening the editor sets the expected UI state for the selected track.
- Closing the editor returns the app to the prior workspace without corruption.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/piano-roll.spec.ts`

Human QA mapping:
- `H-required`
- Confirm that opening and closing the editor feels intentional and visually stable.

### PNR-002 Create and edit basic MIDI notes

As a user, I want to create and edit notes in the piano roll, so that I can sketch melodies and harmonies directly in the DAW.

Acceptance criteria:
- Notes can be created, selected, moved, resized, and removed.
- The underlying clip state remains valid after edit operations.
- The editor does not crash or visually desync under a moderate number of notes.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/piano-roll.spec.ts`, `tests/unit/PianoRoll.test.tsx`, `tests/unit/pianoRollContextMenu.test.tsx`

Human QA mapping:
- `H-required`
- Listen for note preview and confirm visual editing precision is acceptable.
