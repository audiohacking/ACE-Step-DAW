# Competitive Research: Command Palette for Keyboard-First DAW Workflows

Date: 2026-03-19
Issue: #322

## Sources

- ACE-Step interaction design guide
  `docs/design/INTERACTION_DESIGN_GUIDE.md`
- ACE-Step UX improvement checklist
  `docs/design/UX_IMPROVEMENT_CHECKLIST.md`
- Visual Studio Code keyboard shortcuts reference
  https://code.visualstudio.com/docs/getstarted/keybindings

## Interaction Findings

### ACE-Step design requirements

- The interaction guide treats `Cmd+K` as a critical surface for both human users and AI agents.
- The guide requires command discovery to be action-oriented instead of panel-oriented. Users should be able to express an intention such as "add reverb to vocals" instead of hunting through mixer or inspector UI.
- The UX checklist explicitly calls for fuzzy matching, natural-language matching, recent commands, and parameter search. Those are not optional polish items for this feature; they are the acceptance standard.

### VS Code command palette

- VS Code keeps the command palette globally reachable and keyboard-first. That establishes the baseline expectation that the surface can open from almost anywhere in the application.
- Matching is tolerant of partial phrases and non-exact command names. This is useful for ACE-Step because DAW users often think in goals ("tempo 140", "open mixer", "reverb vocals") rather than exact menu labels.
- Commands execute from a single action surface instead of bespoke UI-only handlers. That is the right model for ACE-Step because AGENTS.md requires parity between human and agent workflows.

## Product Implications for ACE-Step

- The palette must open with `Cmd/Ctrl+K` without depending on the current panel.
- Results need more than title matching. They should index:
  - action names
  - settings and parameters such as BPM / tempo
  - dynamic project entities such as track names
  - natural-language aliases
- Recent commands should be stored and boosted so repeat workflows become faster over time.
- Command execution must call the same Zustand-backed actions used elsewhere in the app so browser automation and future agent tooling can execute identical operations.

## Copy / Improve / Skip

- Copy: globally reachable keyboard-first palette entry point.
- Copy: tolerant matching against aliases and partial phrases.
- Improve: index DAW-specific entities such as selected clips, track names, tempo, and effect intents.
- Improve: expose palette search and execution through `window.__uiStore`.
- Skip for now: full free-form NLP parsing and arbitrary parameter editing. Phase 1 should cover common action intents plus BPM parsing with deterministic behavior.

## Implementation Standard for #322

- Global palette dialog opened by `Cmd/Ctrl+K`.
- Search results sourced from a typed command registry, not ad hoc component callbacks.
- Dynamic commands for track/effect intents, including queries like `add reverb to vocals`.
- Recent command ordering when the query is empty.
- Programmatic execution path available via UI store actions for agents and browser tests.
