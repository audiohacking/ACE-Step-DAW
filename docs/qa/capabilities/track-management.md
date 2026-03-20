# Capability QA - Track Management

## Purpose

Validate the first layer of musical structure: creating tracks and controlling their audible state.

## Setup and Boundaries

- Stories should prefer the instrument picker and visible track controls.
- Store setup is allowed only to seed a project when the UI under test is not the setup path itself.
- Human QA should verify iconography, ordering, and audibility implications.

## Stories

### TRK-001 Add a stems track from the instrument picker

As a user, I want to add a stems track from the picker, so that I can start building an arrangement from the UI without memorizing APIs.

Acceptance criteria:
- The instrument picker opens from the documented entry point.
- Selecting a stems instrument creates exactly one new track.
- The track label or icon reflects the chosen instrument.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`

Human QA mapping:
- `H-required`
- Confirm the track appears with sensible naming and visual identity.

### TRK-002 Add a piano roll track

As a user, I want to add a piano roll track, so that I can enter MIDI notes in a melodic editor.

Acceptance criteria:
- The picker exposes a piano roll path.
- The created track reports a piano roll type.
- The track can be used by the piano-roll stories without further repair.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/piano-roll.spec.ts`

Human QA mapping:
- `H-required`
- Confirm the track naming and editor affordance are discoverable.

### TRK-003 Add a sequencer track

As a user, I want to add a sequencer track, so that I can program beat patterns quickly.

Acceptance criteria:
- The picker exposes a sequencer path.
- The created track reports a sequencer type.
- The track can open the sequencer editor without runtime failure.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/sequencer.spec.ts`

Human QA mapping:
- `H-required`
- Confirm the track reads as a rhythm/pattern surface rather than a generic lane.

### TRK-004 Mute and solo track controls

As a user, I want to mute or solo tracks quickly, so that I can isolate or silence parts of the arrangement while editing.

Acceptance criteria:
- Mute toggles the selected track state on and off.
- Solo toggles the selected track state without corrupting neighboring tracks.
- Visible buttons stay in sync with store state.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/unit/trackHeader.test.tsx`

Human QA mapping:
- `H-required`
- Human ear verification is required for real audible behavior even when the state contract passes.
