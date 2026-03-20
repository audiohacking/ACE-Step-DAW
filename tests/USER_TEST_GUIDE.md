# ACE-Step DAW - Human QA Story Guide

> Human execution guide derived from [docs/qa/story-matrix.md](../docs/qa/story-matrix.md).
> Use this file for stories marked `H-required`.

## How To Use This Guide

1. Open the matching capability doc under `docs/qa/capabilities/`.
2. Run the stories by story id, not by section letter.
3. Record PASS / FAIL per story and attach evidence.
4. For audio stories, listen and write what you heard.

## Evidence Rules

- Screenshot for every UI-only story
- GIF for multi-step flows that could regress visually
- Notes for any focus, layering, or pacing issues
- Human listening notes for all audio-sensitive stories

## Onboarding

### ONB-001 First launch shows onboarding before project setup

1. Start from a clean profile.
2. Open the app.
3. Confirm onboarding appears before the project dialog.

Expected:
- onboarding is the first visible surface
- the project setup dialog stays hidden until onboarding is completed or skipped

Evidence:
- first-load screenshot
- note any overlay conflicts or confusing copy

### ONB-002 Skip onboarding to project creation

1. Start from the onboarding surface.
2. Click or keyboard-activate the skip action.
3. Confirm the project dialog appears.

Expected:
- skip is reachable and clearly labeled
- the app moves directly into project setup without a blank intermediate state

Evidence:
- screenshot of the resulting project dialog
- note whether skip felt obvious or risky

## Project Lifecycle

### PRJ-001 Create a project with default settings

1. Open the project dialog.
2. Create a project without changing defaults.

Expected:
- a usable workspace opens
- transport and timeline are visible

Evidence:
- workspace screenshot

### PRJ-002 Create a project with custom name and BPM

1. Open the project dialog.
2. Enter a custom name and BPM.
3. Create the project.

Expected:
- the project name persists
- the BPM is visible in the resulting workspace

Evidence:
- screenshot showing the resulting name and BPM

### PRJ-003 Cancel project creation without mutating state

1. Open the project dialog.
2. Click `Cancel` or close the dialog.

Expected:
- no project is created
- the app is stable for another creation attempt

Evidence:
- screenshot of the post-cancel state

## Track Management

### TRK-001 Add a stems track from the instrument picker

1. Open the instrument picker.
2. Choose a stems instrument such as Drums.

Expected:
- exactly one new track appears
- track identity matches the chosen instrument

Evidence:
- screenshot of the track list

### TRK-002 Add a piano roll track

1. Open the instrument picker.
2. Create a piano roll track.

Expected:
- the track is visible and clearly identifiable as melodic / MIDI-focused

Evidence:
- screenshot of the new track and its open-editor affordance

### TRK-004 Mute and solo track controls

1. Create at least two tracks.
2. Toggle mute and solo on different tracks.

Expected:
- mute and solo states are visually clear
- audible behavior matches the visible buttons

Evidence:
- screenshot of button states
- listening note describing what changed

## Transport and Keyboard

### TRN-001 Space toggles play/pause

1. Create a simple playable project.
2. Press `Space`.
3. Press `Space` again.

Expected:
- playback starts and then stops
- no focus trap or silent failure occurs

Evidence:
- short note on audible playback behavior

### TRN-002 Keyboard shortcuts open major surfaces

1. Use documented shortcuts for export, mixer, and keyboard help.
2. Confirm the intended surface opens.

Expected:
- shortcuts feel reliable from a keyboard-only flow

Evidence:
- screenshot or GIF of at least one shortcut path
- note any focus-routing surprises

## Piano Roll

### PNR-001 Open the piano roll for a track

1. Create a piano roll track.
2. Open the editor from the visible track context.

Expected:
- the editor opens for the correct track

Evidence:
- screenshot of the opened editor

### PNR-002 Create and edit basic MIDI notes

1. Add a note.
2. Move it, resize it, and delete it.

Expected:
- note editing feels stable and visually correct
- preview behavior is understandable

Evidence:
- GIF of the editing flow
- listening note if preview is audible

## AI Generation

### GEN-001 Generate a stems clip from a prompt

1. Ensure the backend/API is reachable.
2. Add a stems track.
3. Enter a prompt and generate content.

Expected:
- generation completes into visible track content

Evidence:
- screenshot or GIF of the generation flow
- listening note about usefulness and musical quality

### GEN-002 See progress, success, and failure states

1. Submit a generation request.
2. Observe loading and terminal states.
3. If possible, repeat with the backend offline.

Expected:
- success and failure states are visible and understandable

Evidence:
- screenshot of progress state
- screenshot of success or failure state

## Output and Mixing

### OUT-001 Open the export surface from the keyboard

1. Press the documented export shortcut.

Expected:
- export dialog opens cleanly
- readiness information is visible

Evidence:
- export dialog screenshot

### OUT-002 Export readiness reflects project content

1. Check export on an empty project.
2. Add musical content and reopen export.

Expected:
- export is disabled when empty
- export becomes enabled when content exists

Evidence:
- pair of screenshots: empty vs ready

### OUT-003 Open the mixer and verify basic channel visibility

1. Open the mixer.
2. Confirm tracks appear as channel strips.

Expected:
- channel layout is readable
- controls look aligned and intentional

Evidence:
- mixer screenshot
- note any clipping, overlap, or crowding

## Human-Only Listening Checklist

- TRK-004: mute / solo audibility feels correct
- TRN-001: transport starts and stops without audible glitches
- PNR-002: note preview feels responsive
- SEQ-001: sequencer groove loops cleanly
- GEN-001: generated result is musically usable
- OUT-003: mixer changes have clear audible meaning
