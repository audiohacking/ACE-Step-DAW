# ACE-Step DAW — Sprint 1 Plan

> **Sprint Goal:** Fix trust-breaking gaps and lay the foundation for a credible DAW.
> **Theme:** "What you hear is what you get" + "Nothing is lost"
> **Duration:** ~2 weeks
> **Created:** 2026-03-18

---

## Context & Rationale

The codebase has ~113 source files with a functional DAW skeleton. However, several critical systems are built but unwired (RecordingEngine, EffectsEngine), and foundational features expected by any DAW user (undo, auto-save, keyboard shortcuts) are missing. Sprint 1 focuses on:

1. **Closing trust-breaking gaps** — Effects that don't affect sound, exports that don't match playback, no undo
2. **P0 items from UX Checklist** — Audio context, undo, auto-save, keyboard shortcuts
3. **Quick wins from existing code** — Piano roll polish, project import (code exists, needs UI wiring)

---

## Tasks

### S1-01: Audio Context Resume Overlay
**Priority:** P0 | **Complexity:** S (Small) | **Agent:** dev

**Description:**
Show a full-screen overlay with "Click to enable audio" when `AudioContext` is suspended (browser autoplay policy). Resume context on first user gesture. Remove overlay once context is running.

**Acceptance Criteria:**
- [ ] On page load, if `audioContext.state === 'suspended'`, show semi-transparent overlay with clear CTA
- [ ] Any click/tap on overlay calls `audioContext.resume()` and dismisses overlay
- [ ] Overlay does NOT appear if context is already running (e.g., after interaction elsewhere)
- [ ] After resume, `Tone.context.state === 'running'` confirmed
- [ ] No audio operations attempted while context is suspended

**Files to touch:**
- `src/components/layout/AppShell.tsx` — add overlay component
- `src/hooks/useTransport.ts` or new `src/hooks/useAudioContext.ts` — context state tracking

**Dependencies:** None (can start immediately)

---

### S1-02: Undo/Redo System (Cmd+Z Everywhere)
**Priority:** P0 | **Complexity:** L (Large) | **Agent:** dev

**Description:**
Implement a scoped undo/redo system using Zustand middleware. Every state mutation that changes project data must create an undo point. Support `Cmd+Z` / `Cmd+Shift+Z` globally.

**Acceptance Criteria:**
- [ ] `Cmd+Z` undoes the last project mutation in any context (timeline, piano roll, mixer)
- [ ] `Cmd+Shift+Z` redoes
- [ ] Undo stack stores at least 100 actions
- [ ] Each undo entry has a human-readable label (e.g., "Move clip", "Change volume", "Add track")
- [ ] Batch operations (e.g., quantize all notes) create a single undo point
- [ ] Undo works for: add/remove track, move/trim/split/delete clip, add/edit/remove MIDI notes, change track volume/pan/mute/solo, add/remove effects
- [ ] No silent failures — if undo stack is empty, no-op (no error)

**Implementation approach:**
- Zustand `temporal` middleware (zustand-undo or custom) wrapping `projectStore`
- Wrap state-mutating actions to push undo entries
- Global keyboard handler for Cmd+Z / Cmd+Shift+Z (not per-component)

**Files to touch:**
- `src/store/projectStore.ts` — add undo middleware
- `src/hooks/useKeyboardShortcuts.ts` *(new)* — global shortcut handler
- `src/App.tsx` or `src/components/layout/AppShell.tsx` — mount global handler

**Dependencies:** None (can start immediately, but S1-08 will use the same keyboard system)

---

### S1-03: Connect EffectsEngine to Live Audio Path
**Priority:** P0-equivalent (trust-breaking bug) | **Complexity:** L (Large) | **Agent:** dev

**Description:**
The `EffectsEngine` builds Tone.js effect chains per track that are completely disconnected from audio output. Users add effects in the Mixer panel and hear nothing. Refactor to connect effect chains into the live audio signal path.

**Acceptance Criteria:**
- [ ] Adding an effect (EQ3, compressor, reverb, delay, distortion, filter) via the Mixer UI produces audible change
- [ ] Removing an effect cleanly disconnects it (no orphaned nodes, no audio artifacts)
- [ ] Changing effect parameters in real-time updates the sound (no rebuild needed for param changes)
- [ ] Bypassing an effect routes audio around it
- [ ] Multiple effects chain correctly in series
- [ ] No audio glitches when adding/removing effects during playback

**Implementation approach (recommended: Option B from next-priorities.md):**
- Refactor `EffectsEngine` to use native Web Audio nodes instead of Tone.js nodes
- Insert effect chain between `TrackNode.volumeGain` and master gain
- Subscribe to `track.effects` changes in `projectStore` to trigger `rebuildChain()`

**Files to touch:**
- `src/engine/EffectsEngine.ts` — refactor to native Web Audio nodes
- `src/engine/AudioEngine.ts` — integrate effect chains per track
- `src/engine/TrackNode.ts` — expose connection points for effect insertion
- `src/hooks/useTransport.ts` — trigger rebuild on effect changes

**Dependencies:** None (can start immediately)

---

### S1-04: Apply Effects in WAV Export
**Priority:** P0-equivalent (trust-breaking bug) | **Complexity:** M (Medium) | **Agent:** dev

**Description:**
`exportMixToWav()` currently renders bare audio with gain only — no pan, EQ, compressor, reverb, or user-added effects. Export must match what the user hears during playback.

**Acceptance Criteria:**
- [ ] Exported WAV includes per-track: pan, EQ (low/mid/high gains), compressor, reverb
- [ ] Exported WAV includes user-added effects from `track.effects[]` array
- [ ] A/B test: play back the project, then play the exported WAV — they should sound identical (within rounding)
- [ ] Export does not crash or hang with complex effect chains
- [ ] Progress indicator remains accurate with effects processing

**Implementation approach:**
- Re-instantiate the same native Web Audio node chain from S1-03 inside `OfflineAudioContext`
- Extract a factory function from `TrackNode.ts` that builds the signal chain given any `BaseAudioContext`

**Files to touch:**
- `src/engine/exportMix.ts` — rebuild full signal chain in offline context
- `src/engine/TrackNode.ts` — extract reusable chain factory
- `src/components/dialogs/ExportDialog.tsx` — pass full track data

**Dependencies:** S1-03 (shares the refactored effect chain architecture)

---

### S1-05: Piano Roll — Quantize, Delete, Transpose
**Priority:** P1 (daily-use operations) | **Complexity:** S (Small) | **Agent:** dev

**Description:**
Add the four most-needed batch operations to the Piano Roll: quantize to grid, delete selected, transpose by semitone, and visual highlight for selected notes.

**Acceptance Criteria:**
- [ ] "Quantize" button in Piano Roll toolbar snaps all selected note start times to current grid resolution
- [ ] If no notes selected, quantize applies to ALL notes in the clip
- [ ] `Backspace` / `Delete` removes all selected notes
- [ ] `Shift+Up` / `Shift+Down` transposes selected notes by ±1 semitone
- [ ] `Shift+Cmd+Up` / `Shift+Cmd+Down` transposes by ±1 octave (12 semitones)
- [ ] Selected notes render with a distinct fill color (e.g., brighter, different hue) in the canvas
- [ ] All operations create a single undo point (integrates with S1-02 if available, or standalone batch)

**Files to touch:**
- `src/components/pianoroll/PianoRoll.tsx` — toolbar button, keyboard handlers, canvas render for selection
- `src/components/pianoroll/PianoRollCanvas.tsx` — selected note rendering

**Dependencies:** Ideally after S1-02 (undo), but can ship standalone

---

### S1-06: Auto-Save + beforeunload Warning
**Priority:** P0 | **Complexity:** S (Small) | **Agent:** dev

**Description:**
Auto-save project state to IndexedDB every 30 seconds. Warn user on tab close if there are unsaved changes.

**Acceptance Criteria:**
- [ ] Project auto-saves to IndexedDB every 30 seconds when changes are detected (dirty flag)
- [ ] Auto-save is debounced — rapid changes don't trigger 30 saves
- [ ] `beforeunload` event shows browser's native "unsaved changes" warning when project has unsaved mutations
- [ ] Status bar shows "Saved" / "Saving..." / "Unsaved changes" indicator
- [ ] Auto-save does NOT block the UI (async IndexedDB write)
- [ ] On next app load, auto-saved project is automatically restored

**Files to touch:**
- `src/hooks/useAutoSave.ts` *(new)* — auto-save logic with dirty detection
- `src/services/projectStorage.ts` — ensure save/load functions work for auto-save
- `src/components/layout/StatusBar.tsx` — save status indicator
- `src/App.tsx` — mount auto-save hook, add beforeunload handler

**Dependencies:** None

---

### S1-07: Global Keyboard Shortcuts
**Priority:** P0/P1 | **Complexity:** S (Small) | **Agent:** dev

**Description:**
Implement a global keyboard shortcut system with the essential DAW shortcuts. Must not conflict with browser defaults.

**Acceptance Criteria:**
- [ ] `Space` — Play/Pause toggle (responds in < 16ms visually)
- [ ] `R` — Toggle record arm (when recording is wired, S1-08)
- [ ] `L` — Toggle loop on/off
- [ ] `S` — Solo focused track
- [ ] `M` — Mute focused track
- [ ] `Cmd+Z` — Undo (delegates to S1-02's system)
- [ ] `Cmd+Shift+Z` — Redo
- [ ] `Cmd+S` — Save project
- [ ] `Delete` / `Backspace` — Delete selection
- [ ] `Cmd+D` — Duplicate selection
- [ ] Shortcuts are blocked from propagating to browser (no accidental tab closes)
- [ ] Shortcuts disabled when user is typing in an input/textarea
- [ ] `?` or `Cmd+/` opens keyboard shortcuts reference dialog

**Implementation approach:**
- Single global `useEffect` in `AppShell.tsx` or dedicated `useKeyboardShortcuts` hook
- Map keybindings to Zustand actions
- Check `document.activeElement` to skip when in text inputs

**Files to touch:**
- `src/hooks/useKeyboardShortcuts.ts` *(new or extend from S1-02)*
- `src/components/layout/AppShell.tsx` — mount hook
- `src/components/dialogs/KeyboardShortcutsDialog.tsx` — update with actual bindings

**Dependencies:** S1-02 (for Cmd+Z), but can implement other shortcuts independently

---

### S1-08: Wire Up Recording Engine
**Priority:** P1 (critical DAW feature) | **Complexity:** M (Medium) | **Agent:** dev

**Description:**
The `RecordingEngine` is fully implemented but completely unwired. Connect it to the UI: enable the Record button, add track arm buttons, create clips from recorded audio on stop.

**Acceptance Criteria:**
- [ ] Record button in toolbar is enabled and toggles record-ready state
- [ ] Each track header has an "arm" (record-enable) button (red circle, toggleable)
- [ ] When record-armed tracks exist and user presses Play, recording starts on armed tracks
- [ ] On Stop, recorded audio is encoded to WAV, stored in IndexedDB via `audioFileManager`, and a new clip is created at the record start position
- [ ] Recording indicator (red pulsing) visible on armed tracks during recording
- [ ] Microphone permission is requested gracefully with clear error message on denial
- [ ] Works with default system microphone (device selection is P2)

**Files to touch:**
- `src/hooks/useRecording.ts` *(new)* — bridge RecordingEngine ↔ transport ↔ store
- `src/components/layout/Toolbar.tsx` — enable record button
- `src/components/tracks/TrackHeader.tsx` — add arm button
- `src/hooks/useTransport.ts` — trigger recording on play-while-armed
- `src/store/uiStore.ts` — `recordArmedTracks` state

**Dependencies:** S1-01 (audio context must be running)

---

### S1-09: Project Archive Import
**Priority:** P1 (completes half-built feature) | **Complexity:** S (Small) | **Agent:** dev

**Description:**
`importProjectArchive()` exists in `projectStorage.ts` but has no UI entry point. Add an "Import" button to the Project List dialog to complete the round-trip.

**Acceptance Criteria:**
- [ ] "Import Archive" button visible in Project List dialog
- [ ] Clicking opens a native file picker filtered to `.acedaw` files
- [ ] Valid archive imports successfully: project metadata + all audio blobs restored to IndexedDB
- [ ] After import, project appears in project list and can be opened
- [ ] If project ID already exists, user is prompted to overwrite or create a copy
- [ ] Invalid/corrupt archive shows clear error toast (not a crash)
- [ ] Loading spinner shown during import (archives can be large)

**Files to touch:**
- `src/components/dialogs/ProjectListDialog.tsx` — add import button + file input
- `src/services/projectStorage.ts` — verify `importProjectArchive()` handles all edge cases
- `src/services/audioFileManager.ts` — ensure audio blobs are re-inserted

**Dependencies:** None

---

### S1-10: DAWState.summary — Natural Language Project Summary
**Priority:** P0 (foundation for AI agent integration) | **Complexity:** M (Medium) | **Agent:** dev

**Description:**
Auto-generate a natural language summary of the current project state. This is the primary context window for LLM agents interacting with the DAW via the Dual-Surface API.

**Acceptance Criteria:**
- [ ] `DAWState.summary` is a reactive string in the Zustand store, updated on every relevant state change
- [ ] Summary includes: project name, BPM, time signature, key, total duration, number of tracks
- [ ] Per-track info: track name, type (audio/MIDI/bus), number of clips, muted/soloed status, effects list
- [ ] Musical analysis: rough section labels (if detectable), chord progression (if MIDI), energy level
- [ ] Summary is < 2000 characters (LLM context-friendly)
- [ ] Summary updates are debounced (200ms) to avoid excessive computation
- [ ] Summary is accessible via `useProjectStore().summary` and via the typed action API

**Example output:**
```
Project: "Chill Beat" | 85 BPM | 4/4 | C minor | 32 bars
Tracks (5):
  1. Drums (MIDI, sequencer) — 4 clips, EQ3 + Compressor
  2. Bass (MIDI) — 2 clips, muted, Distortion
  3. Keys (audio) — 3 clips, Reverb + Delay
  4. Vocals (audio) — 1 clip, soloed, Compressor + EQ3
  5. FX (bus) — Reverb send
Structure: Intro (bars 1-4) → Verse (bars 5-16) → Chorus (bars 17-24) → Outro (bars 25-32)
```

**Files to touch:**
- `src/store/projectStore.ts` — add `summary` derived state with debounced computation
- `src/utils/projectSummary.ts` *(new)* — summary generation logic
- `src/types/project.ts` — add `summary` to DAWState type

**Dependencies:** None (can start immediately)

---

## Dependency Graph

```
S1-01 (Audio Context) ──────────────────┐
                                         ├──→ S1-08 (Recording)
S1-02 (Undo System) ────┬───────────────┤
                         │               │
                         ├──→ S1-05 (Piano Roll Batch Ops)
                         │
                         ├──→ S1-07 (Keyboard Shortcuts)
                         │
S1-03 (Effects Live) ───→ S1-04 (Effects in Export)
                         
S1-06 (Auto-save)       ── independent
S1-09 (Archive Import)  ── independent
S1-10 (DAW Summary)     ── independent
```

**Parallelization strategy:**
- **Week 1:** S1-01, S1-02, S1-03, S1-06, S1-09, S1-10 can all start in parallel
- **Week 2:** S1-04 (after S1-03), S1-05 (after S1-02), S1-07 (after S1-02), S1-08 (after S1-01)

---

## Sprint 1 Summary Table

| ID | Task | Priority | Size | Agent | Depends On |
|----|------|----------|------|-------|------------|
| S1-01 | Audio Context Resume Overlay | P0 | S | dev | — |
| S1-02 | Undo/Redo System | P0 | L | dev | — |
| S1-03 | Connect Effects to Live Audio | P0* | L | dev | — |
| S1-04 | Apply Effects in WAV Export | P0* | M | dev | S1-03 |
| S1-05 | Piano Roll Batch Ops | P1 | S | dev | S1-02 (soft) |
| S1-06 | Auto-Save + beforeunload | P0 | S | dev | — |
| S1-07 | Global Keyboard Shortcuts | P0/P1 | S | dev | S1-02 (soft) |
| S1-08 | Wire Up Recording Engine | P1 | M | dev | S1-01 |
| S1-09 | Project Archive Import | P1 | S | dev | — |
| S1-10 | DAWState.summary | P0 | M | dev | — |

**Total effort estimate:** 2L + 3M + 5S ≈ 2 weeks with parallel dev agents

---

*Sprint 1 is about earning trust: what you hear matches what you export, your work is never lost, and the keyboard works like a real DAW.*
