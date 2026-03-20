# Feature Plan: Command Palette with Natural-Language Action Search

Issue: #322

## QA Stories Affected

- `TRN-002` keyboard shortcuts open major surfaces

## 1. Problem

ACE-Step’s design documentation treats `Cmd+K` as a core navigation and execution surface, but the application has no command palette implementation.

- Users cannot discover DAW actions from a single keyboard-first entry point.
- Natural-language intents such as `add reverb to vocals` or `tempo 140` have no searchable execution path.
- Repeat workflows are slower because the app does not remember recent commands.
- Agents can call Zustand actions directly, but there is no shared searchable command surface that matches how human users would trigger the same operations.

## 2. Root Cause

- `src/hooks/useKeyboardShortcuts.ts` defines many shortcuts, but there is no `Cmd/Ctrl+K` handler or command registry.
- `src/store/uiStore.ts` owns modal and panel state, but it has no state or actions for a command palette, recent command history, or searchable command execution.
- The UI exposes several isolated entry points in `Toolbar.tsx` and dialog components, but those actions are not indexed into a common search model.
- No unit or E2E coverage currently verifies a searchable action layer or command execution parity.

## 3. Solution

### 3a. Add a typed command registry

- Create `src/services/commandPalette.ts`.
- Build command definitions from current DAW state so results can include:
  - transport actions
  - project/settings actions
  - panel toggles
  - selected-clip actions
  - dynamic per-track effect actions
  - parsed BPM / tempo commands
- Add fuzzy-ish ranking using normalized aliases, keywords, and token matching.

### 3b. Add UI-store command palette state

- Extend `src/store/uiStore.ts` with:
  - `showCommandPalette`
  - `commandPaletteQuery`
  - `recentCommandIds`
  - `openCommandPalette`
  - `closeCommandPalette`
  - `setCommandPaletteQuery`
  - `searchCommandPalette`
  - `executeCommandPaletteCommand`
- Persist only recent command ids, not transient dialog/query state.

### 3c. Build the palette dialog

- Add `src/components/dialogs/CommandPalette.tsx`.
- Requirements:
  - autofocus search input
  - arrow-key result navigation
  - Enter to execute
  - Escape / backdrop close
  - ARIA labels for dialog, input, and results
- Mount it from `AppShell.tsx` and add a discoverable toolbar button.

### 3d. Wire keyboard entry

- Update `src/hooks/useKeyboardShortcuts.ts` so `Cmd/Ctrl+K` toggles the palette even when focus is inside a text field.
- Make Escape close the palette before other dialogs.
- Add the shortcut to `KeyboardShortcutsDialog.tsx`.

### 3e. Verify with tests

- Unit test fuzzy intent matching and BPM parsing in `tests/unit/commandPalette.test.ts`.
- Extend `tests/unit/uiStore.test.ts` for recent command persistence behavior.
- Add Playwright coverage in `tests/e2e/command-palette.spec.ts`:
  - open via keyboard
  - search `add reverb to vocals`
  - execute the command
  - verify the track effect was added through store state

## 4. Verification

- `npx tsc --noEmit`
- `npm run build`
- `npm test`
- `npx playwright test tests/e2e/command-palette.spec.ts`

User-story verification:

- As a user, I want to press `Cmd/Ctrl+K` and open a global command palette from anywhere in the DAW, so that I can reach actions without panel hunting.
- As a user, I want to type `add reverb to vocals` or `tempo 140` and execute the intended command, so that I can work in plain language.
- As an agent, I want to call `window.__uiStore.getState().searchCommandPalette(query)` and `executeCommandPaletteCommand(id)`, so that I can use the same command surface programmatically.

## 5. Files To Touch

- `docs/research-notes/command-palette-competitive-research-20260319.md`
- `docs/plans/feat-command-palette.md`
- `src/components/dialogs/CommandPalette.tsx`
- `src/components/dialogs/KeyboardShortcutsDialog.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Toolbar.tsx`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/services/commandPalette.ts`
- `src/store/uiStore.ts`
- `tests/e2e/command-palette.spec.ts`
- `tests/unit/commandPalette.test.ts`
- `tests/unit/uiStore.test.ts`
