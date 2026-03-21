import { useRef, useCallback, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { MIN_BPM, MAX_BPM } from '../../constants/defaults';
import { beatToTime, getTempoCurveProgress } from '../../utils/tempoMap';
import type { TempoEvent } from '../../types/project';
import { TEMPO_LANE_HEIGHT } from './timelineLayout';

const POINT_RADIUS = 5;
const COLOR = '#f59e0b';
const CURVE_HANDLE_RANGE = TEMPO_LANE_HEIGHT * 0.35;
const CURVE_EPSILON = 0.01;
const CURVE_SAMPLES = 12;

interface TempoSegment {
  startBeat: number;
  endBeat: number;
  startBpm: number;
  endBpm: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  curve: number;
  curveType: TempoEvent['curveType'];
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';

  return points.reduce((path, point, index) => (
    index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`
  ), '');
}

export function TempoLane() {
  const laneRef = useRef<HTMLDivElement>(null);
  const project = useProjectStore((s) => s.project);
  const addTempoEvent = useProjectStore((s) => s.addTempoEvent);
  const updateTempoEvent = useProjectStore((s) => s.updateTempoEvent);
  const updateTempoCurve = useProjectStore((s) => s.updateTempoCurve);
  const resetTempoCurve = useProjectStore((s) => s.resetTempoCurve);
  const removeTempoEvent = useProjectStore((s) => s.removeTempoEvent);
  const beginDrag = useProjectStore((s) => s.beginDrag);
  const endDrag = useProjectStore((s) => s.endDrag);
  const undo = useProjectStore((s) => s.undo);
  const pixelsPerSecond = useUIStore((s) => s.pixelsPerSecond);
  const [hoveredSegmentBeat, setHoveredSegmentBeat] = useState<number | null>(null);
  const [activeSegmentBeat, setActiveSegmentBeat] = useState<number | null>(null);

  const bpm = project?.bpm ?? 120;
  const tempoMap = project?.tempoMap;
  const totalDuration = project?.totalDuration ?? 30;
  const width = totalDuration * pixelsPerSecond;

  const beatToX = useCallback(
    (beat: number) => beatToTime(beat, tempoMap, bpm) * pixelsPerSecond,
    [tempoMap, bpm, pixelsPerSecond],
  );

  const xToBeat = useCallback(
    (x: number) => {
      const time = x / pixelsPerSecond;
      if (!tempoMap || tempoMap.length === 0) {
        return (time / 60) * bpm;
      }
      let lo = 0;
      let hi = bpm * (totalDuration / 60) * 2;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const t = beatToTime(mid, tempoMap, bpm);
        if (t < time) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    },
    [tempoMap, bpm, pixelsPerSecond, totalDuration],
  );

  const bpmToY = useCallback((value: number) => {
    const ratio = (value - MIN_BPM) / (MAX_BPM - MIN_BPM);
    return TEMPO_LANE_HEIGHT - ratio * TEMPO_LANE_HEIGHT;
  }, []);

  const yToBpm = useCallback((y: number) => {
    const ratio = Math.max(0, Math.min(1, (TEMPO_LANE_HEIGHT - y) / TEMPO_LANE_HEIGHT));
    return Math.round(MIN_BPM + ratio * (MAX_BPM - MIN_BPM));
  }, []);

  const events = tempoMap ?? [];

  const { renderPoints, segments } = useMemo(() => {
    const points: { x: number; y: number; bpm: number; beat: number }[] = [];
    const nextSegments: TempoSegment[] = [];

    let currentBeat = 0;
    let currentBpm = bpm;
    let currentY = bpmToY(currentBpm);
    points.push({ x: 0, y: currentY, bpm: currentBpm, beat: currentBeat });

    for (const event of events) {
      const endX = beatToX(event.beat);
      const endY = bpmToY(event.bpm);

      if (event.beat > currentBeat) {
        nextSegments.push({
          startBeat: currentBeat,
          endBeat: event.beat,
          startBpm: currentBpm,
          endBpm: event.bpm,
          startX: beatToX(currentBeat),
          endX,
          startY: currentY,
          endY,
          curve: event.curve ?? 0,
          curveType: event.curveType,
        });

        if (event.ramp) {
          for (let step = 1; step <= CURVE_SAMPLES; step++) {
            const progress = step / CURVE_SAMPLES;
            const beat = currentBeat + (event.beat - currentBeat) * progress;
            const shapedProgress = getTempoCurveProgress(progress, event.curve, event.curveType);
            const curvedBpm = currentBpm + (event.bpm - currentBpm) * shapedProgress;
            points.push({ x: beatToX(beat), y: bpmToY(curvedBpm), bpm: curvedBpm, beat });
          }
        } else {
          points.push({ x: endX, y: currentY, bpm: currentBpm, beat: event.beat });
          if (endY !== currentY) {
            points.push({ x: endX, y: endY, bpm: event.bpm, beat: event.beat });
          }
        }
      } else if (endY !== currentY) {
        points.push({ x: endX, y: endY, bpm: event.bpm, beat: event.beat });
      }

      currentBeat = event.beat;
      currentBpm = event.bpm;
      currentY = endY;
    }

    points.push({ x: width, y: currentY, bpm: currentBpm, beat: -1 });

    return {
      renderPoints: points,
      segments: nextSegments,
    };
  }, [bpm, bpmToY, beatToX, events, width]);

  const pathD = useMemo(() => buildPath(renderPoints), [renderPoints]);

  const fillD = useMemo(() => {
    if (renderPoints.length === 0) return '';

    const linePath = buildPath(renderPoints);
    return `M ${renderPoints[0].x} ${TEMPO_LANE_HEIGHT} ${linePath.slice(1)} L ${renderPoints[renderPoints.length - 1].x} ${TEMPO_LANE_HEIGHT} Z`;
  }, [renderPoints]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const lane = laneRef.current;
    if (!lane) return;

    const rect = lane.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const beat = Math.max(0, Math.round(xToBeat(x)));
    const newBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, yToBpm(y)));
    addTempoEvent({ beat, bpm: newBpm });
  }, [addTempoEvent, xToBeat, yToBpm]);

  const handlePointMouseDown = useCallback((tempoEvent: TempoEvent, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const lane = laneRef.current;
    if (!lane) return;

    const rect = lane.getBoundingClientRect();
    beginDrag();

    const onMove = (moveEvent: MouseEvent) => {
      const y = moveEvent.clientY - rect.top;
      const newBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, yToBpm(y)));
      updateTempoEvent(tempoEvent.beat, { bpm: newBpm });
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      endDrag();
      undo();
    };

    const onUp = () => {
      endDrag();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKeyDown);
  }, [beginDrag, endDrag, undo, updateTempoEvent, yToBpm]);

  const handleCurveMouseDown = useCallback((segment: TempoSegment, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    const lane = laneRef.current;
    if (!lane) return;

    const rect = lane.getBoundingClientRect();
    const midpointY = (segment.startY + segment.endY) / 2;
    beginDrag({ scope: 'arrangement', label: 'Adjust tempo curve' });
    setActiveSegmentBeat(segment.endBeat);
    setHoveredSegmentBeat(segment.endBeat);

    const onMove = (moveEvent: MouseEvent) => {
      const relativeY = moveEvent.clientY - rect.top;
      const curve = Math.max(-1, Math.min(1, (midpointY - relativeY) / CURVE_HANDLE_RANGE));
      updateTempoCurve(segment.endBeat, Math.abs(curve) < CURVE_EPSILON ? 0 : curve);
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      setActiveSegmentBeat(null);
      endDrag();
      undo();
    };

    const onUp = () => {
      setActiveSegmentBeat(null);
      endDrag();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKeyDown);
  }, [beginDrag, endDrag, undo, updateTempoCurve]);

  const handlePointContextMenu = useCallback((tempoEvent: TempoEvent, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    removeTempoEvent(tempoEvent.beat);
  }, [removeTempoEvent]);

  const getCurveHandlePosition = useCallback((segment: TempoSegment) => {
    const progress = getTempoCurveProgress(0.5, segment.curve, segment.curveType);
    const bpmAtHandle = segment.startBpm + (segment.endBpm - segment.startBpm) * progress;

    return {
      x: beatToX((segment.startBeat + segment.endBeat) / 2),
      y: bpmToY(bpmAtHandle),
    };
  }, [beatToX, bpmToY]);

  return (
    <div
      ref={laneRef}
      className="relative border-b border-white/10"
      style={{ height: TEMPO_LANE_HEIGHT, background: 'rgba(245, 158, 11, 0.03)' }}
      data-tempo-lane
    >
      <div className="absolute left-1 top-0.5 text-[10px] font-mono select-none pointer-events-none z-10 text-amber-400/60">
        Tempo
      </div>

      <div className="absolute right-1 top-0 text-[8px] font-mono text-amber-400/30 pointer-events-none select-none">
        {MAX_BPM}
      </div>
      <div className="absolute right-1 bottom-0 text-[8px] font-mono text-amber-400/30 pointer-events-none select-none">
        {MIN_BPM}
      </div>

      <svg
        width={width}
        height={TEMPO_LANE_HEIGHT}
        className="absolute left-0 top-0"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      >
        {fillD && <path d={fillD} fill={COLOR} opacity={0.06} />}
        {pathD && <path d={pathD} fill="none" stroke={COLOR} strokeWidth={1.5} opacity={0.6} />}
        {events.map((event) => (
          <circle
            key={event.beat}
            cx={beatToX(event.beat)}
            cy={bpmToY(event.bpm)}
            r={POINT_RADIUS}
            fill={COLOR}
            stroke="white"
            strokeWidth={1}
          >
            <title>{`${event.bpm} BPM @ beat ${event.beat}${event.ramp ? ' (ramp)' : ''}${event.curveType ? ` • ${event.curveType}` : ''}`}</title>
          </circle>
        ))}
      </svg>

      <div
        className="absolute inset-0"
        data-testid="tempo-lane-hit-area"
        onDoubleClick={handleDoubleClick}
        onMouseLeave={() => {
          if (activeSegmentBeat === null) {
            setHoveredSegmentBeat(null);
          }
        }}
      >
        {segments.map((segment) => (
          <div
            key={`segment-${segment.startBeat}-${segment.endBeat}`}
            className="absolute top-0 h-full"
            style={{
              left: segment.startX,
              width: Math.max(segment.endX - segment.startX, 1),
            }}
            aria-label={`Tempo ramp segment from beat ${segment.startBeat} to beat ${segment.endBeat}`}
            onMouseEnter={() => setHoveredSegmentBeat(segment.endBeat)}
          />
        ))}

        {segments.map((segment) => {
          const showHandle = hoveredSegmentBeat === segment.endBeat || activeSegmentBeat === segment.endBeat;
          if (!showHandle) return null;

          const handle = getCurveHandlePosition(segment);
          return (
            <button
              key={`handle-${segment.startBeat}-${segment.endBeat}`}
              type="button"
              role="slider"
              className="absolute -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-white/70 bg-amber-400/90 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
              style={{ left: handle.x, top: handle.y }}
              aria-label={`Tempo curve handle from beat ${segment.startBeat} to beat ${segment.endBeat}`}
              aria-valuemin={-1}
              aria-valuemax={1}
              aria-valuenow={Number(segment.curve.toFixed(2))}
              onMouseDown={(event) => handleCurveMouseDown(segment, event)}
              onMouseEnter={() => setHoveredSegmentBeat(segment.endBeat)}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                resetTempoCurve(segment.endBeat);
              }}
            />
          );
        })}

        {events.map((event) => (
          <button
            key={`tempo-point-${event.beat}`}
            type="button"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: beatToX(event.beat),
              top: bpmToY(event.bpm),
              width: POINT_RADIUS * 2 + 6,
              height: POINT_RADIUS * 2 + 6,
              cursor: 'grab',
            }}
            aria-label={`Tempo point ${event.bpm} BPM at beat ${event.beat}`}
            onMouseDown={(mouseEvent) => handlePointMouseDown(event, mouseEvent)}
            onContextMenu={(mouseEvent) => handlePointContextMenu(event, mouseEvent)}
          />
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full" style={{ top: 0, height: 1, background: 'rgba(245,158,11,0.08)' }} />
        <div className="absolute w-full" style={{ top: TEMPO_LANE_HEIGHT / 2, height: 1, background: 'rgba(245,158,11,0.05)' }} />
        <div className="absolute w-full" style={{ top: TEMPO_LANE_HEIGHT - 1, height: 1, background: 'rgba(245,158,11,0.08)' }} />
      </div>
    </div>
  );
}
