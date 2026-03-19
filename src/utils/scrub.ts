export interface ScrubSourceOffsetOptions {
  clipStartTime: number;
  clipDuration: number;
  timelineTime: number;
  previewRate: number;
  audioOffset: number;
  timeStretchRate: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getScrubPlaybackRate(previewRate: number) {
  return clamp(0.45 + Math.abs(previewRate) * 2.55, 0.45, 3);
}

export function getScrubSliceWindow(previewRate: number) {
  const playbackRate = getScrubPlaybackRate(previewRate);
  return clamp(0.16 - playbackRate * 0.03, 0.05, 0.15);
}

export function getScrubSourceOffset({
  clipStartTime,
  clipDuration,
  timelineTime,
  previewRate,
  audioOffset,
  timeStretchRate,
}: ScrubSourceOffsetOptions) {
  const clampedTimelineTime = clamp(timelineTime, clipStartTime, clipStartTime + clipDuration);
  const relativeTimelineTime = clampedTimelineTime - clipStartTime;
  const stretchRate = Math.max(0.1, timeStretchRate);
  const scrubPlaybackRate = getScrubPlaybackRate(previewRate);
  const sourceWindow = getScrubSliceWindow(previewRate) * scrubPlaybackRate * stretchRate;
  const stretchedDuration = clipDuration * stretchRate;
  const sourceTime = audioOffset + relativeTimelineTime * stretchRate;
  const reverseBias = previewRate < 0 ? sourceWindow : 0;
  return clamp(
    sourceTime - reverseBias,
    audioOffset,
    audioOffset + Math.max(0, stretchedDuration - sourceWindow),
  );
}
