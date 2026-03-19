/**
 * Time-stretch utilities for audio warping / tempo-matching.
 */

/**
 * Compute the playback rate needed to match a source BPM to a target (project) BPM.
 */
export function computeTimeStretchRate(sourceBpm: number, targetBpm: number): number {
  if (sourceBpm <= 0) {
    throw new Error(`Invalid source BPM: ${sourceBpm}. Must be positive.`);
  }
  return targetBpm / sourceBpm;
}

/**
 * Compute the audio buffer offset and duration for a stretched clip,
 * accounting for playback rate and optional seek position.
 *
 * When playbackRate != 1, the Web Audio API consumes audio buffer samples
 * at a different rate: rate 2 = consume 2x samples per second.
 * So to fill `clipDuration` seconds of timeline at `rate`, we need
 * `clipDuration * rate` seconds of audio buffer.
 */
export function computeStretchedAudioParams(params: {
  audioOffset: number;
  clipDuration: number;
  timeStretchRate: number | undefined;
  seekOffset: number;
}): { audioOffset: number; audioDuration: number } {
  const rate = params.timeStretchRate ?? 1;
  const { audioOffset, clipDuration, seekOffset } = params;

  const seekAudio = seekOffset * rate;
  const remainingTimeline = clipDuration - seekOffset;
  const remainingAudio = remainingTimeline * rate;

  return {
    audioOffset: audioOffset + seekAudio,
    audioDuration: remainingAudio,
  };
}
