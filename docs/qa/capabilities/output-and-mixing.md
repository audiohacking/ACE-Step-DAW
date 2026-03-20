# Capability QA - Output and Mixing

## Purpose

Validate the path from inspecting session output readiness to exporting or mixing it.

## Setup and Boundaries

- Export readiness may use seeded content when the UI under test is the export surface itself.
- Mixer stories should prefer user-visible panel toggles over direct store state mutation.
- Human QA is required for audible mix judgment and output confidence.

## Stories

### OUT-001 Open the export surface from the keyboard

As a user, I want to open export from the keyboard, so that final output is reachable from the same flow as the rest of the DAW.

Acceptance criteria:
- The documented export shortcut opens the export dialog.
- The export dialog renders without blocking the rest of the app.
- The dialog shows project readiness information.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/midi-export.spec.ts`

Human QA mapping:
- `H-required`
- Confirm labels, readiness hints, and control affordances are understandable.

### OUT-002 Export readiness reflects project content

As a user, I want export controls to reflect whether my project has usable content, so that I do not attempt empty exports by mistake.

Acceptance criteria:
- Empty projects keep export actions disabled.
- Projects with musical content enable export actions.
- Readiness counts or summaries stay in sync with visible project state.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/unit/browserDownload.test.ts`, `tests/unit/projectStorageDownload.test.ts`

Human QA mapping:
- `H-required`
- Confirm the readiness summary feels truthful and not confusing.

### OUT-003 Open the mixer and verify basic channel visibility

As a user, I want to open the mixer and see channel strips for my tracks, so that I can inspect the mix state quickly.

Acceptance criteria:
- Mixer visibility toggles from the documented shortcut or visible control.
- Existing project tracks appear in the mixer surface.
- Basic per-channel controls render without layout breakage.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/mixer.spec.ts`, `tests/e2e/qa-full-workflow.spec.ts`, `tests/unit/mixerPanel.test.tsx`

Human QA mapping:
- `H-required`
- Confirm spacing, readability, and audible meaning of channel controls.
