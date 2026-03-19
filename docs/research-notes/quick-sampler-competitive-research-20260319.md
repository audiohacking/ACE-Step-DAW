# Quick Sampler Competitive Research — 2026-03-19

## User Story

As a beatmaker, I want to drop audio into a sampler and immediately play it chromatically, so that found sounds become musical material without setup friction.

## Reference Product

- Logic Pro Quick Sampler
  - Apple Support: https://support.apple.com/en-us/102041
  - Apple User Guide overview: https://support.apple.com/is-is/guide/logicpro/lgcp5af33756/10.7/mac/11.0

## Interaction-Level Findings

- Dragging a file or region into Quick Sampler is the primary entry path, not a secondary utility flow.
- The loaded sample is immediately mapped across the keyboard around a root note, so pitch audition starts as soon as the sample lands.
- Classic mode is the “held key / loop-capable” mode.
- One Shot mode ignores key length and plays the sample through from start to end.
- The waveform view exposes sample start, end, and loop points in the same context as playback.
- Root key preview is visible directly in the sampler context instead of hidden behind a separate editor.

## ACE-Step Decisions

- Copy: one-step audio-to-instrument flow.
- Copy: root note, trim start/end, loop start/end, and playback mode in the same editor context.
- Copy: Classic and One Shot as first-class playback modes.
- Improve: expose creation through `window.__store` and drag/drop on piano roll tracks so agents can script the same workflow.
- Skip for this issue: Logic-style Optimized/Original analysis modes, Recorder mode, Slice mode, and deeper modulation pages.
