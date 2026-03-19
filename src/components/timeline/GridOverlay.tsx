import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBeatDuration, getBarDuration } from '../../utils/time';

/**
 * Adaptive grid: resolution auto-adjusts based on zoom level.
 * Zoomed out → bars only. Zoomed in → 16th notes.
 */
function getGridDivision(pixelsPerSecond: number, bpm: number): { division: number; label: string } {
  const beatPx = pixelsPerSecond * (60 / bpm); // pixels per beat

  if (beatPx >= 80) return { division: 0.25, label: '16th' };  // 16th notes
  if (beatPx >= 40) return { division: 0.5,  label: '8th' };   // 8th notes
  if (beatPx >= 20) return { division: 1,    label: 'beat' };  // quarter notes
  if (beatPx >= 8)  return { division: 2,    label: '2-beat' }; // half notes
  return { division: 4, label: 'bar' };                         // bars only
}

export function GridOverlay() {
  const project = useProjectStore((s) => s.project);
  const pixelsPerSecond = useUIStore((s) => s.pixelsPerSecond);

  if (!project) return null;

  const beatDuration = getBeatDuration(project.bpm);
  const barDuration = getBarDuration(project.bpm, project.timeSignature);
  const totalWidth = project.totalDuration * pixelsPerSecond;
  const { division } = getGridDivision(pixelsPerSecond, project.bpm);
  const stepDuration = beatDuration * division;

  const lines: { x: number; strength: 'bar' | 'beat' | 'sub' }[] = [];
  for (let t = 0; t <= project.totalDuration; t += stepDuration) {
    const isBar = Math.abs(t % barDuration) < 0.001 || Math.abs((t % barDuration) - barDuration) < 0.001;
    const isBeat = Math.abs(t % beatDuration) < 0.001 || Math.abs((t % beatDuration) - beatDuration) < 0.001;
    lines.push({
      x: t * pixelsPerSecond,
      strength: isBar ? 'bar' : isBeat ? 'beat' : 'sub',
    });
  }

  const colors = {
    bar: '#555555',
    beat: '#3a3a3a',
    sub: '#2e2e2e',
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: totalWidth }}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: line.x,
            backgroundColor: colors[line.strength],
          }}
        />
      ))}
    </div>
  );
}
