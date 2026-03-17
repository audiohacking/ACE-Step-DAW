import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBeatDuration, getBarDuration } from '../../utils/time';

export function GridOverlay() {
  const project = useProjectStore((s) => s.project);
  const pixelsPerSecond = useUIStore((s) => s.pixelsPerSecond);

  if (!project) return null;

  const beatDuration = getBeatDuration(project.bpm);
  const barDuration = getBarDuration(project.bpm, project.timeSignature);
  const totalWidth = project.totalDuration * pixelsPerSecond;

  const lines: { x: number; isBar: boolean }[] = [];
  for (let t = 0; t <= project.totalDuration; t += beatDuration) {
    const isBar = Math.abs(t % barDuration) < 0.001 || Math.abs((t % barDuration) - barDuration) < 0.001;
    lines.push({ x: t * pixelsPerSecond, isBar });
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: totalWidth }}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: line.x,
            backgroundColor: line.isBar ? '#4a4a4a' : '#333333',
          }}
        />
      ))}
    </div>
  );
}
