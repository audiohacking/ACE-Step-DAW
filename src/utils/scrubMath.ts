export const MAX_SCRUB_PREVIEW_RATE = 4;
const MIN_SCRUB_SAMPLE_MS = 16;
const SCRUB_DEADZONE_PX = 2;
const SCRUB_DEADZONE_SECONDS = 0.01;
const SCRUB_BASE_RATE = 0.35;
const SCRUB_VELOCITY_MULTIPLIER = 1.15;
const SCRUB_DISTANCE_MULTIPLIER = 0.9;

export interface ScrubPreviewRateInput {
  previousX: number;
  nextX: number;
  previousTime: number;
  nextTime: number;
  previousStamp: number;
  nextStamp: number;
}

export function clampScrubPreviewRate(rate: number) {
  return Math.max(-MAX_SCRUB_PREVIEW_RATE, Math.min(MAX_SCRUB_PREVIEW_RATE, rate));
}

export function getScrubPreviewRate(input: ScrubPreviewRateInput) {
  const deltaX = input.nextX - input.previousX;
  const deltaTimelineTime = input.nextTime - input.previousTime;
  const deltaStamp = Math.max(MIN_SCRUB_SAMPLE_MS, input.nextStamp - input.previousStamp);

  if (
    Math.abs(deltaX) < SCRUB_DEADZONE_PX
    && Math.abs(deltaTimelineTime) < SCRUB_DEADZONE_SECONDS
  ) {
    return 0;
  }

  const direction = Math.sign(deltaX || deltaTimelineTime || 1);
  const velocity = Math.abs(deltaX) / deltaStamp;
  const distance = Math.abs(deltaTimelineTime);
  const rawRate = SCRUB_BASE_RATE
    + velocity * SCRUB_VELOCITY_MULTIPLIER
    + distance * SCRUB_DISTANCE_MULTIPLIER;

  return clampScrubPreviewRate(direction * rawRate);
}
