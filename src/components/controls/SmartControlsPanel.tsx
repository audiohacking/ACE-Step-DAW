import { useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Knob } from '../ui/Knob';
import type { Track } from '../../types/project';
import { TRACK_CATALOG } from '../../constants/tracks';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium mb-1">{children}</div>
  );
}

function SmartKnobGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-2">{children}</div>
      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function TrackSmartControls({ track }: { track: Track }) {
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const updateTrackMixer = useProjectStore((s) => s.updateTrackMixer);
  const info = TRACK_CATALOG[track.trackName];

  const vol = track.volume;
  const pan = track.pan ?? 0;
  const eqLow = track.eqLowGain ?? 0;
  const eqMid = track.eqMidGain ?? 0;
  const eqHigh = track.eqHighGain ?? 0;
  const compEnabled = track.compressorEnabled ?? false;
  const compThresh = track.compressorThreshold ?? -24;
  const compRatio = track.compressorRatio ?? 4;

  return (
    <div className="flex items-start gap-6 px-4">
      {/* Track info */}
      <div className="flex flex-col items-center gap-1 min-w-[80px]">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: track.color + '30', border: `2px solid ${track.color}40` }}
        >
          {info.emoji}
        </div>
        <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[80px]">{track.displayName}</span>
        <span className="text-[10px] text-zinc-400">{track.trackType ?? 'stems'}</span>
      </div>

      <div className="w-px h-16 bg-[#444] self-center" />

      {/* Volume & Pan */}
      <div className="flex flex-col items-center gap-1">
        <SectionLabel>Level</SectionLabel>
        <div className="flex gap-3">
          <Knob value={vol} min={0} max={1.5} defaultValue={1} onChange={(v) => updateTrack(track.id, { volume: v })} label="Volume" size={38} step={0.01} />
          <Knob value={pan} min={-1} max={1} defaultValue={0} onChange={(v) => updateTrackMixer(track.id, { pan: v })} label="Pan" size={38} step={0.01} />
        </div>
      </div>

      <div className="w-px h-16 bg-[#444] self-center" />

      {/* EQ */}
      <div className="flex flex-col items-center gap-1">
        <SectionLabel>Tone</SectionLabel>
        <div className="flex gap-2">
          <Knob value={eqLow} min={-15} max={15} defaultValue={0} onChange={(v) => updateTrackMixer(track.id, { eqLowGain: v })} label="Bass" unit="dB" size={36} step={0.5} />
          <Knob value={eqMid} min={-15} max={15} defaultValue={0} onChange={(v) => updateTrackMixer(track.id, { eqMidGain: v })} label="Mid" unit="dB" size={36} step={0.5} />
          <Knob value={eqHigh} min={-15} max={15} defaultValue={0} onChange={(v) => updateTrackMixer(track.id, { eqHighGain: v })} label="Treble" unit="dB" size={36} step={0.5} />
        </div>
      </div>

      <div className="w-px h-16 bg-[#444] self-center" />

      {/* Compressor */}
      <div className="flex flex-col items-center gap-1">
        <SectionLabel>Compressor</SectionLabel>
        <button
          onClick={() => updateTrackMixer(track.id, { compressorEnabled: !compEnabled })}
          className={`text-[10px] font-semibold px-3 py-1 rounded mb-1 transition-colors ${
            compEnabled ? 'bg-daw-accent text-white' : 'bg-[#444] text-zinc-400 hover:bg-[#555]'
          }`}
        >
          {compEnabled ? 'ON' : 'OFF'}
        </button>
        <div className="flex gap-2">
          <Knob value={compThresh} min={-60} max={0} defaultValue={-24} onChange={(v) => updateTrackMixer(track.id, { compressorThreshold: v })} label="Thresh" unit="dB" size={34} step={1} disabled={!compEnabled} />
          <Knob value={compRatio} min={1} max={20} defaultValue={4} onChange={(v) => updateTrackMixer(track.id, { compressorRatio: v })} label="Ratio" size={34} step={0.5} disabled={!compEnabled} />
        </div>
      </div>

      {/* Local caption for stems */}
      {(track.trackType === 'stems' || !track.trackType) && (
        <>
          <div className="w-px h-16 bg-[#444] self-center" />
          <div className="flex flex-col gap-1 min-w-[160px] max-w-[240px]">
            <SectionLabel>Local Caption</SectionLabel>
            <textarea
              value={track.localCaption ?? ''}
              onChange={(e) => {
                const store = useProjectStore.getState();
                store.setTrackLocalCaption(track.id, e.target.value);
              }}
              placeholder={track.trackName}
              rows={3}
              className="text-[11px] text-zinc-300 bg-[#222] border border-[#444] rounded px-2 py-1 resize-none outline-none focus:border-daw-accent/60 placeholder:text-zinc-600"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function SmartControlsPanel() {
  const showSmartControls = useUIStore((s) => s.showSmartControls);
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useUIStore((s) => s.selectedClipIds);

  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);
  const smartControlsHeight = 140;

  if (!showSmartControls || !project) return null;

  const selectedClipId = selectedClipIds.size === 1 ? [...selectedClipIds][0] : null;
  let selectedTrack: Track | null = null;

  if (selectedClipId) {
    for (const t of project.tracks) {
      if (t.clips.some(c => c.id === selectedClipId)) {
        selectedTrack = t;
        break;
      }
    }
  }

  if (!selectedTrack && project.tracks.length > 0) {
    selectedTrack = project.tracks[0];
  }

  return (
    <div
      className="border-t border-[#1a1a1a] bg-gradient-to-b from-[#2d2d2d] to-[#262626] shrink-0"
      style={{ height: smartControlsHeight }}
    >
      {/* Header bar */}
      <div className="flex items-center h-6 px-3 border-b border-[#3a3a3a] bg-[#333]">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Smart Controls</span>
        <span className="flex-1" />
        {selectedTrack && (
          <span className="text-[10px] text-zinc-400">{selectedTrack.displayName}</span>
        )}
      </div>

      {/* Controls area */}
      <div className="flex items-center justify-center h-[calc(100%-24px)] overflow-x-auto">
        {selectedTrack ? (
          <TrackSmartControls track={selectedTrack} />
        ) : (
          <span className="text-[11px] text-zinc-600">Select a track to view controls</span>
        )}
      </div>
    </div>
  );
}
