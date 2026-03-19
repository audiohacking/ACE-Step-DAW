# Competitive Research: In-DAW Assistant and Context Help

Date: 2026-03-19
Issue: #242

## Sources

- FL Studio manual: Title & Hint Panel / Online Panel
  https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/index_frame_left_offline.html
- Ableton Live 12 manual
  https://cdn-resources.ableton.com/resources/pdfs/live-manual/12/2025-01-23/live12-manual-en.pdf
- Internal issue framing for ACE-Step
  `gh issue view 242 --repo ace-step/ACE-Step-DAW`

## Interaction Findings

### FL Studio

- FL Studio keeps contextual guidance close to the working surface instead of hiding it in a separate docs flow.
- The manual exposes a dedicated hint/help surface in the main application chrome. That establishes a strong precedent for always-visible, context-sensitive guidance.
- FL also treats online/help tooling as part of the DAW workspace, not a detached support site workflow.

### Ableton Live 12

- Ableton relies on contextual inspection patterns: the selected object determines what details are surfaced in adjacent panels.
- The manual consistently teaches users through the currently focused track, device, or clip instead of generic DAW advice.
- This implies that ACE-Step assistant replies should anchor to current project state first, then provide broader production tips.

## Product Implications for ACE-Step

- The assistant should be a docked side panel, not a modal, so users can keep editing while asking questions.
- The assistant must understand the current project snapshot:
  - BPM, key, time signature
  - focused or selected track
  - clip counts and track types
  - active effects / MIDI effects
  - visible panels such as Mixer, Piano Roll, Loop Browser
- Responses should be actionable inside ACE-Step, not only educational. Good answers should reference existing shortcuts or panels.
- Streaming matters because it makes the panel feel like a live assistant rather than a static FAQ card.

## Copy / Improve / Skip

- Copy: docked contextual help behavior from FL/Ableton style side surfaces.
- Improve: add agent-friendly store actions and `window` exposure so the assistant is usable from browser automation and CLI flows.
- Improve: inject project context automatically instead of requiring the user to describe their session.
- Skip for now: remote LLM dependency and action execution. The repo has no stable chat endpoint contract yet, so a local streaming assistant is the correct Phase 1 architecture.

## Implementation Standard for #242

- Docked right-side panel with collapse via toolbar and shortcut.
- Context object derived from current DAW state on every question.
- Streaming response rendering, not a delayed full-message swap.
- Replies must handle common production prompts:
  - drums punch / compression / EQ
  - vocal effects
  - BPM / tempo guidance
  - mixing and balance
  - ACE-Step feature discovery and shortcuts
