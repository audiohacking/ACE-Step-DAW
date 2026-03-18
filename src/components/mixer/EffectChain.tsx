import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Knob } from '../ui/Knob';
import type { TrackEffect, TrackEffectType, Track } from '../../types/project';
import { effectsEngine } from '../../engine/EffectsEngine';

const EFFECT_TYPES: TrackEffectType[] = ['eq3', 'compressor', 'reverb', 'delay', 'distortion', 'filter'];

function EffectCard({ track, effect, index }: { track: Track; effect: TrackEffect; index: number }) {
  const updateTrackEffect = useProjectStore((s) => s.updateTrackEffect);
  const removeTrackEffect = useProjectStore((s) => s.removeTrackEffect);
  const reorderTrackEffect = useProjectStore((s) => s.reorderTrackEffect);

  const updateParams = useCallback((params: TrackEffect['params']) => {
    updateTrackEffect(track.id, effect.id, { params } as Partial<TrackEffect>);
  }, [track.id, effect.id, updateTrackEffect]);

  return (
    <div className="rounded-lg border border-[#343434] bg-[#232323] p-3 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-sm font-medium text-zinc-200 uppercase">{effect.type}</div>
        <button
          onClick={() => updateTrackEffect(track.id, effect.id, { enabled: !effect.enabled })}
          className={`ml-auto px-2 py-1 rounded text-[10px] ${effect.enabled ? 'bg-emerald-700/50 text-emerald-200' : 'bg-[#333] text-zinc-400'}`}
        >
          {effect.enabled ? 'On' : 'Off'}
        </button>
        <button onClick={() => reorderTrackEffect(track.id, index, Math.max(0, index - 1))} className="text-zinc-500 hover:text-zinc-200">←</button>
        <button onClick={() => reorderTrackEffect(track.id, index, Math.min((track.effects?.length ?? 1) - 1, index + 1))} className="text-zinc-500 hover:text-zinc-200">→</button>
        <button onClick={() => removeTrackEffect(track.id, effect.id)} className="text-red-300 hover:text-red-100">×</button>
      </div>

      {effect.type === 'eq3' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.low} min={-12} max={12} defaultValue={0} onChange={(value) => updateParams({ ...effect.params, low: value })} label="Low" unit="dB" size={38} step={0.5} />
          <Knob value={effect.params.mid} min={-12} max={12} defaultValue={0} onChange={(value) => updateParams({ ...effect.params, mid: value })} label="Mid" unit="dB" size={38} step={0.5} />
          <Knob value={effect.params.high} min={-12} max={12} defaultValue={0} onChange={(value) => updateParams({ ...effect.params, high: value })} label="High" unit="dB" size={38} step={0.5} />
        </div>
      )}

      {effect.type === 'compressor' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.threshold} min={-60} max={0} defaultValue={-24} onChange={(value) => updateParams({ ...effect.params, threshold: value })} label="Thr" unit="dB" size={38} step={1} />
          <Knob value={effect.params.ratio} min={1} max={20} defaultValue={4} onChange={(value) => updateParams({ ...effect.params, ratio: value })} label="Rat" size={38} step={0.5} />
          <Knob value={effect.params.release} min={0.01} max={1} defaultValue={0.2} onChange={(value) => updateParams({ ...effect.params, release: value })} label="Rel" size={38} step={0.01} />
        </div>
      )}

      {effect.type === 'reverb' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.decay} min={0.1} max={10} defaultValue={2.4} onChange={(value) => updateParams({ ...effect.params, decay: value })} label="Decay" size={38} step={0.1} />
          <Knob value={effect.params.preDelay} min={0} max={0.2} defaultValue={0.02} onChange={(value) => updateParams({ ...effect.params, preDelay: value })} label="Pre" size={38} step={0.01} />
          <Knob value={effect.params.wet} min={0} max={1} defaultValue={0.25} onChange={(value) => updateParams({ ...effect.params, wet: value })} label="Wet" size={38} step={0.01} />
        </div>
      )}

      {effect.type === 'delay' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.time} min={0.05} max={1} defaultValue={0.25} onChange={(value) => updateParams({ ...effect.params, time: value })} label="Time" size={38} step={0.01} />
          <Knob value={effect.params.feedback} min={0} max={0.95} defaultValue={0.3} onChange={(value) => updateParams({ ...effect.params, feedback: value })} label="Fbk" size={38} step={0.01} />
          <Knob value={effect.params.wet} min={0} max={1} defaultValue={0.2} onChange={(value) => updateParams({ ...effect.params, wet: value })} label="Wet" size={38} step={0.01} />
        </div>
      )}

      {effect.type === 'distortion' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.amount} min={0} max={1} defaultValue={0.2} onChange={(value) => updateParams({ ...effect.params, amount: value })} label="Amt" size={38} step={0.01} />
          <Knob value={effect.params.wet} min={0} max={1} defaultValue={0.35} onChange={(value) => updateParams({ ...effect.params, wet: value })} label="Wet" size={38} step={0.01} />
          <select
            value={effect.params.distortionType}
            onChange={(e) => updateParams({ ...effect.params, distortionType: e.target.value as 'soft' | 'overdrive' | 'fuzz' })}
            className="h-8 mt-2 bg-[#111] border border-[#333] rounded px-2 text-[11px] text-zinc-300"
          >
            <option value="soft">Soft</option>
            <option value="overdrive">Overdrive</option>
            <option value="fuzz">Fuzz</option>
          </select>
        </div>
      )}

      {effect.type === 'filter' && (
        <div className="flex gap-3 justify-center">
          <Knob value={effect.params.frequency} min={50} max={10000} defaultValue={1800} onChange={(value) => updateParams({ ...effect.params, frequency: value })} label="Freq" size={38} step={10} />
          <Knob value={effect.params.resonance} min={0.1} max={12} defaultValue={1} onChange={(value) => updateParams({ ...effect.params, resonance: value })} label="Q" size={38} step={0.1} />
          <Knob value={effect.params.lfoDepth} min={0} max={1} defaultValue={0.25} onChange={(value) => updateParams({ ...effect.params, lfoDepth: value })} label="LFO" size={38} step={0.01} />
        </div>
      )}
    </div>
  );
}

export function EffectChain() {
  const project = useProjectStore((s) => s.project);
  const addTrackEffect = useProjectStore((s) => s.addTrackEffect);
  const openTrackId = useUIStore((s) => s.openEffectChainTrackId);
  const effectChainHeight = useUIStore((s) => s.effectChainHeight);
  const setEffectChainHeight = useUIStore((s) => s.setEffectChainHeight);
  const setOpenEffectChainTrackId = useUIStore((s) => s.setOpenEffectChainTrackId);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const track = project?.tracks.find((candidate) => candidate.id === openTrackId) ?? null;

  useEffect(() => {
    if (!track) return;
    effectsEngine.updateParams(track.id, track.effects ?? []);
    return () => {
      effectsEngine.disposeChain(track.id);
    };
  }, [track]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: effectChainHeight };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setEffectChainHeight(dragRef.current.startH + (dragRef.current.startY - ev.clientY));
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [effectChainHeight, setEffectChainHeight]);

  if (!track) return null;

  return (
    <div className="border-t border-[#1a1a1a] bg-[#1a1a1a] flex flex-col select-none shrink-0" style={{ height: effectChainHeight }}>
      <div className="h-1.5 w-full cursor-ns-resize bg-[#444] hover:bg-daw-accent transition-colors flex-shrink-0" onMouseDown={handleResizeMouseDown} />
      <div className="h-10 px-3 border-b border-[#2a2a2a] bg-[#202020] flex items-center gap-2">
        <div className="text-sm font-medium text-zinc-200">Effects: {track.displayName}</div>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) addTrackEffect(track.id, e.target.value as TrackEffectType);
            e.currentTarget.value = '';
          }}
          className="ml-auto bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-zinc-300"
        >
          <option value="">Add Device...</option>
          {EFFECT_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button onClick={() => setOpenEffectChainTrackId(null)} className="text-xs text-zinc-400 hover:text-zinc-200">Close</button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="flex gap-3 items-start">
          {(track.effects ?? []).map((effect, index) => (
            <EffectCard key={effect.id} track={track} effect={effect} index={index} />
          ))}
          {(track.effects ?? []).length === 0 && (
            <div className="text-sm text-zinc-500 px-2 py-8">No effects on this track yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
