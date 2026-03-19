# Feature Plan: In-DAW AI Assistant Help Panel

Issue: #242

## 1. Problem

ACE-Step has an AI assistant panel scaffold on `origin/main`, but it does not yet satisfy the issue acceptance criteria.

- The panel currently simulates a delayed full reply instead of streaming output.
- The reply logic only uses project context in a shallow way, so answers are mostly generic.
- The assistant logic lives inside the React component, which makes programmatic testing and agent-driven usage weak.
- There is no dedicated E2E workflow proving keyboard open, chat submission, streaming, and context-aware output.

## 2. Root Cause

- `src/components/dialogs/AIAssistantPanel.tsx` owns chat orchestration, message mutation, and response generation in component-local callbacks.
- `src/utils/aiAssistantContext.ts` returns a single string, but it does not encode panel visibility, transport state, selected clip count, or robust focused-track resolution.
- `src/store/uiStore.ts` stores assistant UI state, but it does not provide an async action that agents can call directly.
- `src/main.tsx` exposes project/UI stores globally, but not an assistant-specific API surface.

## 3. Solution

### 3a. Move assistant orchestration into store/service layers

- Add `src/services/aiAssistantService.ts`.
- Add pure functions for:
  - deriving contextual suggestions
  - generating a context-aware response
  - streaming the response as deltas
- Add `askAIAssistant(question)` and `updateAIChatMessage(...)` actions in `src/store/uiStore.ts`.

### 3b. Strengthen DAW context injection

- Expand `src/utils/aiAssistantContext.ts` so it derives:
  - focused track from expanded/editor/open-panel state and selected clips
  - active panels
  - transport state
  - project summary text for the assistant

### 3c. Update the panel UI

- Keep the panel docked and collapsible.
- Render streamed assistant text as it arrives.
- Replace static suggestion chips with context-aware suggestions.
- Keep ARIA labels and keyboard submission behavior intact.

### 3d. Expose agent-friendly API

- Expose `window.__assistantStore = useUIStore` in `src/main.tsx`.
- Allow agent/browser tests to call `window.__assistantStore.getState().askAIAssistant(...)`.

### 3e. Verify with tests

- Unit test the assistant service for context-aware output and multi-chunk streaming.
- Extend store tests to cover async assistant actions.
- Add Playwright coverage for:
  - opening via `Cmd+/`
  - sending a production question
  - observing streaming state
  - verifying response content references current session context

## 4. Verification

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/ai-assistant.spec.ts`

User-story verification:

- As a human user, I want to press `Cmd+/`, ask how to improve my drum track, and see a streamed reply that references the current project context.
- As an AI agent, I want to call `window.__assistantStore.getState().askAIAssistant(question)` and inspect the streamed messages in store state, so I can automate help workflows programmatically.

## 5. Files To Touch

- `docs/research-notes/ai-assistant-competitive-research-20260319.md`
- `docs/plans/feat-ai-assistant-help-panel.md`
- `src/components/dialogs/AIAssistantPanel.tsx`
- `src/main.tsx`
- `src/services/aiAssistantService.ts`
- `src/store/uiStore.ts`
- `src/utils/aiAssistantContext.ts`
- `tests/e2e/ai-assistant.spec.ts`
- `tests/unit/aiAssistant.test.ts`
- `tests/unit/aiAssistantService.test.ts`
