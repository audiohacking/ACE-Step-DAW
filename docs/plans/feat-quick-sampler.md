# Plan: Quick Sampler Workflow

## QA Stories Affected

- No canonical story ids assigned yet.
- Add sampler story ids to `docs/qa/story-matrix.md` before implementation expands further.

## Problem

ACE-Step already had sampler playback primitives, but no explicit “audio in, playable instrument out” Quick Sampler workflow. Users could load a sample onto a sampler track, but not through a first-class store action or an in-context sample editor.

## Root Cause

- `src/hooks/useAudioImport.ts` only loaded sample data into an existing sampler track.
- `src/components/pianoroll/PianoRoll.tsx` exposed only load/clear/root-note controls.
- `src/hooks/useTransport.ts` and `src/engine/offlineRender.ts` treated the sampler as a simple pitched playback path with no trim or playback mode state.

## Solution

- Extend `SamplerConfig` with trim, loop, and playback-mode fields.
- Add a store action that creates or retargets a Quick Sampler track from an existing audio key.
- Upgrade piano roll sampler UI into a lightweight Quick Sampler editor with drag target, root note, trim, loop, preview, and playback mode.
- Route piano roll audio drops and asset drops into the Quick Sampler path instead of audio clip import.
- Render and play sampler notes through the new config so Classic, One Shot, and Loop settings affect transport and offline bounce.

## Verification

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- `npx playwright test tests/e2e/sampler.spec.ts`

## Files To Touch

- `src/types/project.ts`
- `src/store/projectStore.ts`
- `src/hooks/useAudioImport.ts`
- `src/hooks/useTransport.ts`
- `src/engine/SamplerEngine.ts`
- `src/engine/offlineRender.ts`
- `src/components/pianoroll/PianoRoll.tsx`
- `src/components/timeline/TrackLane.tsx`
- `src/components/dialogs/InstrumentPicker.tsx`
- `src/components/dialogs/ExportDialog.tsx`
- `src/services/freezeTrack.ts`
- `src/store/__tests__/projectStore.test.ts`
- `tests/unit/samplerEngine.test.ts`
- `tests/e2e/sampler.spec.ts`
