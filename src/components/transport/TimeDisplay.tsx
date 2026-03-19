import { useTransportStore } from '../../store/transportStore';
import { useProjectStore } from '../../store/projectStore';
import { formatTime, formatBarsBeats } from '../../utils/time';

export function TimeDisplay() {
  const currentTime = useTransportStore((s) => s.currentTime);
  const project = useProjectStore((s) => s.project);

  const barsBeats = project
    ? formatBarsBeats(currentTime, project.bpm, project.timeSignature, project.tempoMap, project.timeSignatureMap)
    : '1.1.00';

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="text-zinc-300 tabular-nums">{formatTime(currentTime)}</span>
      <span className="text-zinc-500 tabular-nums">{barsBeats}</span>
    </div>
  );
}
