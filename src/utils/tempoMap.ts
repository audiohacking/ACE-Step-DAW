import type { TempoCurveType, TempoEvent, TimeSignatureEvent } from '../types/project';

const TEMPO_CURVE_EPSILON = 0.01;
const TEMPO_CURVE_SAMPLES = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getTimeSignatureBeatLength(denominator: number): number {
  return 4 / Math.max(1, denominator);
}

export function getTimeSignatureBarLength(numerator: number, denominator: number): number {
  return Math.max(1, numerator) * getTimeSignatureBeatLength(denominator);
}

export function clampTempoCurve(curve: number | undefined): number {
  return clamp(curve ?? 0, -1, 1);
}

function getTempoCurveKind(curve: number | undefined, curveType: TempoCurveType | undefined): TempoCurveType {
  if (curveType) return curveType;

  const clampedCurve = clampTempoCurve(curve);
  if (Math.abs(clampedCurve) < TEMPO_CURVE_EPSILON) {
    return 'linear';
  }

  return clampedCurve > 0 ? 'exponential' : 'logarithmic';
}

export function getTempoCurveProgress(
  progress: number,
  curve: number | undefined,
  curveType?: TempoCurveType,
): number {
  const t = clamp(progress, 0, 1);
  const clampedCurve = clampTempoCurve(curve);
  const kind = getTempoCurveKind(clampedCurve, curveType);
  const amount = Math.abs(clampedCurve);

  if (kind === 'linear' || amount < TEMPO_CURVE_EPSILON) {
    return t;
  }

  const exponent = 1 + amount * 3;
  if (kind === 'logarithmic') {
    return 1 - Math.pow(1 - t, exponent);
  }

  return Math.pow(t, exponent);
}

export function interpolateTempoRamp(
  startBpm: number,
  endBpm: number,
  progress: number,
  curve: number | undefined,
  curveType?: TempoCurveType,
): number {
  const curvedProgress = getTempoCurveProgress(progress, curve, curveType);
  return startBpm + (endBpm - startBpm) * curvedProgress;
}

function getRampDurationSeconds(
  startBpm: number,
  endBpm: number,
  segmentBeats: number,
  partialBeats: number,
  curve: number | undefined,
  curveType?: TempoCurveType,
): number {
  if (segmentBeats <= 0 || partialBeats <= 0) {
    return 0;
  }

  const beats = clamp(partialBeats, 0, segmentBeats);
  const steps = Math.max(8, Math.ceil(TEMPO_CURVE_SAMPLES * (beats / segmentBeats)));
  const beatSize = beats / steps;
  let seconds = 0;

  for (let i = 0; i < steps; i++) {
    const beatMidpoint = (i + 0.5) * beatSize;
    const progress = beatMidpoint / segmentBeats;
    const bpm = Math.max(
      1e-6,
      interpolateTempoRamp(startBpm, endBpm, progress, curve, curveType),
    );
    seconds += (beatSize / bpm) * 60;
  }

  return seconds;
}

/**
 * Get the BPM at a specific beat position.
 * If a ramp is active, interpolates between the previous and current event BPMs.
 */
export function getTempoAtBeat(
  tempoMap: TempoEvent[] | undefined,
  beat: number,
  fallbackBpm: number,
): number {
  if (!tempoMap || tempoMap.length === 0) return fallbackBpm;

  let prevBpm = fallbackBpm;
  let prevBeat = 0;

  for (let i = 0; i < tempoMap.length; i++) {
    const ev = tempoMap[i];
    if (ev.beat > beat) {
      if (ev.ramp) {
        const range = ev.beat - prevBeat;
        if (range <= 0) return ev.bpm;
        const progress = (beat - prevBeat) / range;
        return interpolateTempoRamp(prevBpm, ev.bpm, progress, ev.curve, ev.curveType);
      }
      return prevBpm;
    }
    prevBpm = ev.bpm;
    prevBeat = ev.beat;
  }

  return prevBpm;
}

/**
 * Convert a beat position to absolute time (seconds), accounting for tempo changes and ramps.
 */
export function beatToTime(
  beat: number,
  tempoMap: TempoEvent[] | undefined,
  fallbackBpm: number,
): number {
  if (!tempoMap || tempoMap.length === 0) {
    return (beat / fallbackBpm) * 60;
  }

  let time = 0;
  let currentBeat = 0;
  let currentBpm = fallbackBpm;

  for (const ev of tempoMap) {
    if (ev.beat >= beat) {
      if (ev.ramp && ev.beat > currentBeat) {
        time += getRampDurationSeconds(
          currentBpm,
          ev.bpm,
          ev.beat - currentBeat,
          beat - currentBeat,
          ev.curve,
          ev.curveType,
        );
      } else {
        time += ((beat - currentBeat) / currentBpm) * 60;
      }
      return time;
    }

    const segmentBeats = ev.beat - currentBeat;
    if (segmentBeats > 0) {
      if (ev.ramp) {
        time += getRampDurationSeconds(
          currentBpm,
          ev.bpm,
          segmentBeats,
          segmentBeats,
          ev.curve,
          ev.curveType,
        );
      } else {
        time += (segmentBeats / currentBpm) * 60;
      }
    }

    currentBeat = ev.beat;
    currentBpm = ev.bpm;
  }

  time += ((beat - currentBeat) / currentBpm) * 60;
  return time;
}

/**
 * Convert absolute time (seconds) to beat position, accounting for tempo changes and ramps.
 */
export function timeToBeat(
  targetTime: number,
  tempoMap: TempoEvent[] | undefined,
  fallbackBpm: number,
): number {
  if (targetTime <= 0) return 0;
  if (!tempoMap || tempoMap.length === 0) {
    return (targetTime / 60) * fallbackBpm;
  }

  const peakBpm = tempoMap.reduce((maxBpm, event) => Math.max(maxBpm, event.bpm), fallbackBpm);
  const lastBeat = tempoMap[tempoMap.length - 1]?.beat ?? 0;

  let low = 0;
  let high = Math.max(lastBeat + (targetTime / 60) * peakBpm + 16, 1);
  while (beatToTime(high, tempoMap, fallbackBpm) < targetTime) {
    high *= 2;
  }

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const elapsed = beatToTime(mid, tempoMap, fallbackBpm);
    if (elapsed < targetTime) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const result = (low + high) / 2;
  const epsilon = 1e-6;
  const candidateBeats = new Set<number>([
    Math.round(result),
    ...tempoMap.map((event) => event.beat),
  ]);

  for (const candidateBeat of candidateBeats) {
    if (Math.abs(beatToTime(candidateBeat, tempoMap, fallbackBpm) - targetTime) < epsilon) {
      return candidateBeat;
    }
  }

  return result;
}

/**
 * Get the time signature at a specific bar (1-indexed).
 */
export function getTimeSignatureAtBar(
  tsMap: TimeSignatureEvent[] | undefined,
  bar: number,
  fallbackNumerator: number,
  fallbackDenominator: number,
): { numerator: number; denominator: number } {
  if (!tsMap || tsMap.length === 0) {
    return { numerator: fallbackNumerator, denominator: fallbackDenominator };
  }

  let numerator = fallbackNumerator;
  let denominator = fallbackDenominator;

  for (const ev of tsMap) {
    if (ev.bar > bar) break;
    numerator = ev.numerator;
    denominator = ev.denominator;
  }

  return { numerator, denominator };
}

/**
 * Get the bar number (1-indexed) at a given beat position.
 */
export function getBarAtBeat(
  beat: number,
  tsMap: TimeSignatureEvent[] | undefined,
  fallbackNumerator: number,
): number {
  if (!tsMap || tsMap.length === 0) {
    return Math.floor(beat / fallbackNumerator) + 1;
  }

  let currentBeat = 0;
  let currentBar = 1;
  let currentNum = fallbackNumerator;
  let currentDen = 4;

  for (const ev of tsMap) {
    const barsToEvent = ev.bar - currentBar;
    const beatsToEvent = barsToEvent * getTimeSignatureBarLength(currentNum, currentDen);
    const eventBeat = currentBeat + beatsToEvent;

    if (beat < eventBeat) {
      const beatsIntoSection = beat - currentBeat;
      return currentBar + Math.floor(beatsIntoSection / getTimeSignatureBarLength(currentNum, currentDen));
    }

    currentBeat = eventBeat;
    currentBar = ev.bar;
    currentNum = ev.numerator;
    currentDen = ev.denominator;
  }

  const beatsIntoSection = beat - currentBeat;
  return currentBar + Math.floor(beatsIntoSection / getTimeSignatureBarLength(currentNum, currentDen));
}

/**
 * Get the beat position at the start of a given bar (1-indexed).
 */
export function getBeatAtBar(
  bar: number,
  tsMap: TimeSignatureEvent[] | undefined,
  fallbackNumerator: number,
): number {
  if (!tsMap || tsMap.length === 0) {
    return (bar - 1) * fallbackNumerator;
  }

  let currentBeat = 0;
  let currentBar = 1;
  let currentNum = fallbackNumerator;
  let currentDen = 4;

  for (const ev of tsMap) {
    if (ev.bar > bar) break;
    const barsToEvent = ev.bar - currentBar;
    currentBeat += barsToEvent * getTimeSignatureBarLength(currentNum, currentDen);
    currentBar = ev.bar;
    currentNum = ev.numerator;
    currentDen = ev.denominator;
  }

  const remainingBars = bar - currentBar;
  return currentBeat + remainingBars * getTimeSignatureBarLength(currentNum, currentDen);
}
