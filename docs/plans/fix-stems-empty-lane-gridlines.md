# fix: empty stems lanes hide arrangement grid lines

## User Story
As a user, I want newly created empty stems tracks to keep their bar and beat grid visible, so that I can place clips against the timeline rhythm without guessing.

## Problem
Issue [#525](https://github.com/ace-step/ACE-Step-DAW/issues/525) reports that creating a new empty stems track produces a dark lane with no visible bar or beat lines even though the time ruler still shows them.

## Root Cause
- `src/components/timeline/GridOverlay.tsx` renders the arrangement grid behind the track lanes.
- `src/components/timeline/TrackLane.tsx` applies `ARRANGEMENT_EMPTY_LANE_BG` directly to empty non-editor lanes via `backgroundColor`.
- Because the fill is opaque, the empty stems lane visually masks the grid lines that are already present behind it.

## Solution
- Update `src/components/timeline/TrackLane.tsx` so empty non-editor lanes use a translucent overlay surface instead of an opaque lane background.
- Keep the existing arrangement separator and empty-lane affordance so the row still reads as aligned with its header.
- Add a focused regression test in `tests/unit/trackLaneAlignment.test.tsx` that checks the empty-lane surface is rendered as an overlay instead of an opaque lane fill.
- Add a browser screenshot case in `tests/e2e/visual-regression.spec.ts` covering a newly created empty stems lane.

## Verification
- `npx vitest run tests/unit/trackLaneAlignment.test.tsx`
- `npm run build`
- `npx playwright test tests/e2e/visual-regression.spec.ts --grep "empty stems lane gridlines screenshot"`

## Files To Touch
- `src/components/timeline/TrackLane.tsx`
- `tests/unit/trackLaneAlignment.test.tsx`
- `tests/e2e/visual-regression.spec.ts`
