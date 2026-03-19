import { useState, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { computeTimeStretchRate } from '../../utils/timeStretch';
import type { Clip } from '../../types/project';

interface TimeStretchDialogProps {
  clip: Clip;
  projectBpm: number;
  onClose: () => void;
}

export function TimeStretchDialog({ clip, projectBpm, onClose }: TimeStretchDialogProps) {
  const setClipTimeStretch = useProjectStore((s) => s.setClipTimeStretch);
  const currentRate = clip.timeStretchRate ?? 1;
  const [rate, setRate] = useState(currentRate);
  const [sourceBpm, setSourceBpm] = useState(
    clip.inferredMetas?.bpm ?? (typeof clip.bpm === 'number' ? clip.bpm : 0),
  );

  const handleApply = useCallback(() => {
    setClipTimeStretch(clip.id, rate);
    onClose();
  }, [clip.id, rate, setClipTimeStretch, onClose]);

  const handleMatchTempo = useCallback(() => {
    if (sourceBpm > 0) {
      const matchedRate = computeTimeStretchRate(sourceBpm, projectBpm);
      setRate(Math.round(matchedRate * 1000) / 1000);
    }
  }, [sourceBpm, projectBpm]);

  const handleReset = useCallback(() => {
    setRate(1);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed z-50 bg-[#2a2a2a] border border-[#555] rounded-lg shadow-2xl p-4 min-w-[280px]"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <h3 className="text-[13px] font-medium text-zinc-100 mb-3">Time Stretch</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Playback Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.01}
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-sky-500"
              />
              <input
                type="number"
                min={0.25}
                max={4}
                step={0.01}
                value={rate}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0.25 && v <= 4) setRate(v);
                }}
                className="w-16 bg-[#1a1a1a] border border-[#555] rounded px-2 py-1 text-[11px] text-zinc-200 text-right"
              />
              <span className="text-[10px] text-zinc-500">x</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {rate > 1 ? `${Math.round((rate - 1) * 100)}% faster` :
               rate < 1 ? `${Math.round((1 - rate) * 100)}% slower` :
               'Original speed'}
            </p>
          </div>

          <div className="border-t border-[#444] pt-3">
            <label className="block text-[11px] text-zinc-400 mb-1">Source BPM (for tempo match)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={20}
                max={300}
                step={1}
                value={sourceBpm || ''}
                placeholder="e.g. 128"
                onChange={(e) => setSourceBpm(parseFloat(e.target.value) || 0)}
                className="w-20 bg-[#1a1a1a] border border-[#555] rounded px-2 py-1 text-[11px] text-zinc-200"
              />
              <span className="text-[10px] text-zinc-500">
                Project: {projectBpm} BPM
              </span>
              <button
                onClick={handleMatchTempo}
                disabled={sourceBpm <= 0}
                className="px-2 py-1 text-[10px] bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors"
              >
                Match
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-[#444]">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Reset (1x)
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 text-[11px] bg-daw-accent hover:bg-daw-accent/80 text-white rounded transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
