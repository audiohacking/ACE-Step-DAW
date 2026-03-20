import { useCallback } from 'react';
import type { Clip, Track } from '../../types/project';
import { useProjectStore } from '../../store/projectStore';

interface TakeLaneStripProps {
  clip: Clip;
  track: Track;
}

export function TakeLaneStrip({ clip, track }: TakeLaneStripProps) {
  const selectTake = useProjectStore((s) => s.selectTake);
  const promoteTake = useProjectStore((s) => s.promoteTake);
  const deleteTake = useProjectStore((s) => s.deleteTake);
  const flattenComp = useProjectStore((s) => s.flattenComp);
  const takes = clip.takes ?? [];

  const hasSelectedTake = takes.some((t) => t.selected);

  const handlePromote = useCallback((takeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    promoteTake(clip.id, takeId);
  }, [clip.id, promoteTake]);

  const handleDelete = useCallback((takeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTake(clip.id, takeId);
  }, [clip.id, deleteTake]);

  const handleFlatten = useCallback(() => {
    flattenComp(clip.id);
  }, [clip.id, flattenComp]);

  if (takes.length === 0) return null;

  return (
    <div
      className="bg-[#171717] px-3 py-2 border-l-[3px]"
      style={{ borderLeftColor: track.color }}
      data-take-lane-for={clip.id}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Take Lanes
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFlatten}
            disabled={!hasSelectedTake}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={`Flatten comp for ${track.displayName}`}
            title="Flatten comp — commit selected take"
          >
            Flatten
          </button>
          <span className="text-[10px] text-zinc-600">
            {track.displayName}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {takes.map((take, index) => (
          <div
            key={take.id}
            className={`group flex w-full items-center justify-between rounded-md border px-2 py-1 text-[11px] transition-colors ${
              take.selected
                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100'
                : 'border-[#303030] bg-[#202020] text-zinc-300 hover:border-[#5a5a5a] hover:bg-[#262626]'
            }`}
          >
            <button
              type="button"
              onClick={() => selectTake(clip.id, take.id)}
              className="flex-1 text-left"
              aria-label={`Select take ${index + 1} for ${track.displayName}${take.selected ? ', selected' : ''}`}
            >
              {`Take ${index + 1}`}
            </button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => handlePromote(take.id, e)}
                className="rounded px-1 text-[10px] text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                aria-label={`Promote take ${index + 1}`}
                title="Promote — use this take as clip audio"
              >
                Promote
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(take.id, e)}
                className="rounded px-1 text-[10px] text-zinc-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                aria-label={`Delete take ${index + 1}`}
                title="Delete take"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
