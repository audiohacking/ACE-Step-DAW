# Capability QA - Transport and Keyboard Workflow

## Purpose

Validate the DAW's keyboard-first operating loop, including playback, panel shortcuts, and agent-visible command contracts.

## Setup and Boundaries

- Use a created project unless the story explicitly tests no-project behavior.
- Set focus intentionally before shortcut tests.
- Agent setup through store APIs is allowed for zoom-contract stories but not for shortcut discoverability stories.

## Stories

### TRN-001 Space toggles play/pause

As a user, I want to use the spacebar to play and pause, so that transport control feels immediate and standard.

Acceptance criteria:
- Space starts playback when the app is in a playable context.
- Pressing space again pauses playback.
- The shortcut does not silently fail because of unexpected focus state.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/transport.spec.ts`
- Missing today: stable audible verification in browser automation

Human QA mapping:
- `H-required`
- Listen for actual playback start/stop and confirm there are no audible glitches.

### TRN-002 Keyboard shortcuts open major surfaces

As a user, I want documented shortcuts to open major panels and dialogs, so that I can stay in flow without hunting through the UI.

Acceptance criteria:
- The export dialog, keyboard shortcuts dialog, and key panel toggles open from their documented shortcuts.
- Shortcut behavior matches the current contract shown to the user.
- Failures caused by focus routing are recorded as product bugs, not shrugged off as test noise.

Automation mapping:
- `A-partial`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/unit/useKeyboardShortcuts.test.tsx`

Human QA mapping:
- `H-required`
- Confirm that shortcut timing and focus feel reliable from the keyboard alone.

### TRN-003 Zoom commands emit the correct request contract

As an agent or power user, I want zoom commands to resolve to a stable request contract, so that automation can drive timeline framing without brittle pixel assertions.

Acceptance criteria:
- Zoom-to-selection emits the `selection` request mode.
- Zoom-to-fit emits the `project` request mode.
- The request ids advance predictably in the current implementation.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/project-lifecycle.spec.ts`, `tests/unit/timelineZoomRequests.test.tsx`

Human QA mapping:
- none
- Human visual confirmation is optional here because the contract is the primary acceptance surface.
