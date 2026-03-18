# ACE-Step DAW — Product Roadmap

## Phase 1: Product Alignment (Current)
**Goal**: Match mainstream DAW feature parity with Ableton/Logic/FL Studio

Priority areas (from UX_IMPROVEMENT_CHECKLIST.md):
- P0: Core interaction polish (transport, timeline, drag-and-drop)
- P1: Piano roll UX improvements (FL Studio level)
- P1: Mixer workflow enhancements (sends, groups, metering)
- P2: Recording workflow (punch-in/out, comping)
- P2: Automation curves UX polish

## Phase 2: AI Generation Integration
**Goal**: Seamless AI generation within the DAW workflow

- ACE-Step 1.5 backend integration (base model + fine-tuned)
- Inline regeneration UX (generate, compare, accept/reject)
- Prompt engineering UI for music
- A/B comparison workflow
- AI-assisted arrangement suggestions

## Phase 3: Platform Expansion (Long-term)

### 3a. Electron Desktop App
- Native file system access (no browser File API limitations)
- Lower audio latency (direct ASIO/CoreAudio)
- Plugin hosting (VST/AU support potential)
- Offline-first architecture

### 3b. Rust Performance Backend
- Audio DSP in Rust (via WASM or native)
- File I/O and audio decoding
- Real-time audio processing pipeline
- Potential: shared core between web and desktop

### 3c. CLI Interface
- `ace-daw create --bpm 120 --key "C major"`
- `ace-daw add-track drums --type sequencer`
- `ace-daw generate --prompt "lo-fi hip hop beat" --duration 30`
- `ace-daw export --format wav --output mix.wav`
- Full scriptability for AI agents and automation pipelines

## Architecture Vision

```
┌──────────────────────────────────┐
│         Frontend (React)          │ ← Browser / Electron renderer
├──────────────────────────────────┤
│      Core Engine (TypeScript)     │ ← Zustand + Tone.js + Web Audio
├──────────────────────────────────┤
│     Performance Layer (Rust/WASM) │ ← DSP, file I/O, audio decode
├──────────────────────────────────┤
│      AI Backend (ACE-Step 1.5)    │ ← Generation API (remote server)
├──────────────────────────────────┤
│          CLI Interface            │ ← Agent-friendly scriptable API
└──────────────────────────────────┘
```

---

*Updated: 2026-03-18*
*Current phase: Phase 1 (Product Alignment)*
