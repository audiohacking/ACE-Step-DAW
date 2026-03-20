# Capability QA - Project Lifecycle

## Purpose

Validate project creation and safe exit paths before track or clip editing begins.

## Setup and Boundaries

- Start from first-run or returning-user state as required by the story.
- Browser-first verification is mandatory for dialog presence and button affordances.
- Store seeding is allowed only for agent contract tests, not for dialog success paths.

## Stories

### PRJ-001 Create a project with default settings

As a user, I want to create a project with the default setup, so that I can reach a usable DAW workspace immediately.

Acceptance criteria:
- Confirming the dialog creates a project without requiring extra fields.
- The app enters a usable workspace with transport and timeline visible.
- The project name is non-empty and persisted in store state.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/e2e/project-lifecycle.spec.ts`

Human QA mapping:
- `H-required`
- Confirm the resulting workspace looks coherent and not visually broken.

### PRJ-002 Create a project with custom name and BPM

As a user, I want to define the project name and BPM at creation time, so that the session starts with the musical context I expect.

Acceptance criteria:
- Typed name persists to the created project.
- BPM input persists to the created project.
- The dialog closes after successful creation.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`, `tests/unit/newProjectDialog.test.tsx`

Human QA mapping:
- `H-required`
- Confirm the toolbar and other visible tempo surfaces reflect the chosen BPM.

### PRJ-003 Cancel project creation without mutating state

As a user, I want to close or cancel project setup safely, so that I do not accidentally create state I did not confirm.

Acceptance criteria:
- `Cancel` leaves `project` null or unchanged.
- Close/X behaves like cancel when no project has been created.
- The app remains stable and ready for a later project-creation attempt.

Automation mapping:
- `A-full`
- Primary tests: `tests/e2e/qa-full-workflow.spec.ts`, `tests/e2e/real-user-scenarios.spec.ts`

Human QA mapping:
- `H-required`
- Confirm there is no confusing partially initialized workspace after cancel.
