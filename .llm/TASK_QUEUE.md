# ACE-Step DAW — Task Queue

> Auto-managed by the orchestrator agent. Pick from top, always keep pipeline full.
> Format: [priority] [type] description
> Sprint 1 plan: `docs/plans/sprint-1-plan.md`

## 🔥 Sprint 1 — Ready (pick next)

### Wave 1 (no dependencies — start now)
- [P0] [feat] **S1-01** Audio context resume overlay on first user gesture — show "Click to enable audio" when AudioContext suspended → `AppShell.tsx`
- [P0] [feat] **S1-02** Undo/redo system (Cmd+Z / Cmd+Shift+Z) — Zustand temporal middleware on projectStore, 100-action stack, labeled entries → `projectStore.ts`, new `useKeyboardShortcuts.ts`
- [P0] [feat] **S1-03** Connect EffectsEngine to live audio path — refactor to native Web Audio nodes, insert between TrackNode and master → `EffectsEngine.ts`, `AudioEngine.ts`, `TrackNode.ts`
- [P0] [feat] **S1-06** Auto-save to IndexedDB every 30s + beforeunload warning — dirty detection, debounced writes, status bar indicator → new `useAutoSave.ts`, `StatusBar.tsx`
- [P1] [feat] **S1-09** Project archive import UI — "Import" button in ProjectListDialog, wire `importProjectArchive()`, handle duplicates → `ProjectListDialog.tsx`
- [P0] [feat] **S1-10** DAWState.summary — auto-generated natural language project summary for LLM agents, debounced, <2000 chars → new `projectSummary.ts`, `projectStore.ts`

### Wave 2 (after Wave 1 dependencies resolve)
- [P0] [feat] **S1-04** Apply effects in WAV export — rebuild full signal chain in OfflineAudioContext, extract factory from TrackNode → `exportMix.ts`, `TrackNode.ts` *(depends: S1-03)*
- [P1] [feat] **S1-05** Piano Roll batch ops — quantize to grid button, Delete selected, Shift+Up/Down transpose, selected note visual highlight → `PianoRoll.tsx` *(soft depends: S1-02)*
- [P0] [feat] **S1-07** Global keyboard shortcuts — Space/R/L/S/M/Cmd+Z/Cmd+S/Delete/Cmd+D, input-aware, browser-conflict-safe → new `useKeyboardShortcuts.ts` *(soft depends: S1-02)*
- [P1] [feat] **S1-08** Wire up RecordingEngine — enable Record button, track arm buttons, clip creation on stop, mic permission flow → new `useRecording.ts`, `Toolbar.tsx`, `TrackHeader.tsx` *(depends: S1-01)*

## Backlog — Sprint 2 Candidates

### P0 (from UX Checklist, not yet addressed)
- [P0] [feat] Latency calibration — auto-detect outputLatency + baseLatency, display in settings, allow override
- [P0] [feat] Lookahead scheduling — set Tone.js lookAhead to 0.1s, schedule events ahead, compensate visual playhead
- [P0] [feat] Glitch-free playback — AudioWorklet for custom DSP, test with 20+ tracks
- [P0] [feat] Transport controls polish — Play/Stop/Record/Loop respond in <16ms visually
- [P0] [feat] Undo history panel — show list of named actions with timestamps, click to jump
- [P0] [feat] Typed action API — full TypeScript interface for all DAW actions, export as public API
- [P0] [feat] Error responses with suggestions — structured error format for agent API
- [P0] [feat] Project format documentation — define and document JSON + audio blob format
- [P0] [feat] Export WAV mix — full mixdown via OfflineAudioContext (basic version exists, needs effects)

### P1 (UX polish & parity)
- [P1] [feat] Timeline minimap — project overview strip at top
- [P1] [feat] Zoom gestures — Cmd+Scroll horizontal, Cmd+Shift+Scroll vertical, pinch
- [P1] [feat] Zoom to selection — Z zooms to fit selection, Shift+Z fits entire project
- [P1] [feat] Adaptive grid — auto grid resolution based on zoom level
- [P1] [feat] Snap toggle — Cmd+G toggles snap, hold Cmd to temporarily disable
- [P1] [feat] Ghost notes in piano roll (FL Studio style, 15% opacity)
- [P1] [feat] OS file drop — drag audio files from Finder into timeline
- [P1] [feat] Drag preview ghost — translucent clip preview during drag
- [P1] [feat] Drag between tracks — move clips across tracks
- [P1] [feat] Draw/paint tools in piano roll — pencil, brush, select, erase (1-4 keys)
- [P1] [feat] Velocity color in piano roll — note color = velocity
- [P1] [feat] Note resize — drag right/left edge to change duration/start
- [P1] [feat] Generation panel sidebar — prompt input, style tags, key/BPM/length, temperature
- [P1] [feat] Multi-variation output — generate 2-4 variations, show as they complete
- [P1] [feat] Command palette (Cmd+K) — fuzzy-match all actions, parameters, settings
- [P1] [feat] Single-key shortcuts for all common ops
- [P1] [feat] DAW migration shortcut presets (Ableton, Logic, FL Studio)
- [P1] [refactor] Extract drag math from ClipBlock into dragMath.ts

### P2 (nice to have)
- [P2] [feat] Playhead glow — 2px playhead with soft glow trail
- [P2] [feat] AI clip distinction — sparkle overlay on AI-generated clips
- [P2] [feat] Level meters — per-track vertical meters, green→yellow→red, peak hold, 60fps
- [P2] [feat] Scrubbing — click-drag on timeline ruler
- [P2] [feat] Chord stamp tool for piano roll
- [P2] [feat] Prompt history panel for AI generation
- [P2] [feat] Virtualized track rendering — react-window for track list
- [P2] [feat] Canvas/WebGL waveforms — never render as DOM elements
- [P2] [test] Playwright E2E: keyboard shortcuts
- [P2] [test] Playwright E2E: effect chain operations
- [P2] [test] Playwright E2E: undo/redo across all contexts

## In Progress

(auto-populated by orchestrator)

## Done Today

(auto-populated)

## Subagent Queue (research/heavy tasks to parallelize)

- [P1] [research] ACE-Step 1.5 model — how to start, switch to base model
- [P1] [research] Zustand temporal middleware vs custom undo — evaluate zustand-undo, zundo, or roll our own
- [P2] [research] Electron/Tauri packaging strategy for browser DAW
- [P2] [research] CLAP/VST plugin hosting in WASM
- [P2] [research] Cmajor evaluation for Phase 2 DSP modules
