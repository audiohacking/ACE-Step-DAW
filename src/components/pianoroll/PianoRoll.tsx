import { useCallback, useMemo, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { synthEngine } from '../../engine/SynthEngine';
import type { MidiNote, PianoRollGrid, Track } from '../../types/project';

const ROW_HEIGHT = 18;
const KEYBOARD_WIDTH = 64;
const TOTAL_NOTES = 48;
const START_NOTE = 36;
const GRID_OPTIONS: PianoRollGrid[] = ['1/4', '1/8', '1/16', '1/32'];

function midiNoteName(note: number) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

function gridToBeatSize(grid: PianoRollGrid) {
  switch (grid) {
    case '1/4': return 1;
    case '1/8': return 0.5;
    case '1/16': return 0.25;
    case '1/32': return 0.125;
  }
}

export function PianoRoll() {
  const project = useProjectStore((s) => s.project);
  const ensureMidiClip = useProjectStore((s) => s.ensureMidiClip);
  const addMidiNote = useProjectStore((s) => s.addMidiNote);
  const updateMidiNote = useProjectStore((s) => s.updateMidiNote);
  const removeMidiNote = useProjectStore((s) => s.removeMidiNote);
  const setMidiGrid = useProjectStore((s) => s.setMidiGrid);
  const openTrackId = useUIStore((s) => s.openPianoRollTrackId);
  const openClipId = useUIStore((s) => s.openPianoRollClipId);
  const pianoRollHeight = useUIStore((s) => s.pianoRollHeight);
  const setPianoRollHeight = useUIStore((s) => s.setPianoRollHeight);
  const setOpenPianoRoll = useUIStore((s) => s.setOpenPianoRoll);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const track = project?.tracks.find((candidate) => candidate.id === openTrackId) ?? null;
  const clip = useMemo(() => {
    if (!track) return null;
    if (openClipId) {
      const existing = track.clips.find((candidate) => candidate.id === openClipId);
      if (existing?.midiData) return existing;
    }
    return track.clips.find((candidate) => candidate.midiData) ?? null;
  }, [track, openClipId]);

  const resolvedClip = clip;
  const midiData = resolvedClip?.midiData;
  const beatSize = gridToBeatSize(midiData?.grid ?? '1/16');
  const pixelsPerBeat = 48;
  const totalBeats = Math.max(16, Math.ceil((resolvedClip?.duration ?? 8) * (project?.bpm ?? 120) / 60));

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: pianoRollHeight };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPianoRollHeight(dragRef.current.startH + (dragRef.current.startY - ev.clientY));
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [pianoRollHeight, setPianoRollHeight]);

  const handleGridClick = useCallback(async (pitch: number, beat: number) => {
    if (!track || !resolvedClip) return;
    const matchingNote = midiData?.notes.find((note) => note.pitch === pitch && Math.abs(note.startBeat - beat) < 0.001);
    if (matchingNote) {
      removeMidiNote(resolvedClip.id, matchingNote.id);
      return;
    }
    await synthEngine.previewNote(pitch, 110, 0.35, track.synthPreset ?? 'piano');
    addMidiNote(resolvedClip.id, {
      pitch,
      startBeat: beat,
      durationBeats: Math.max(beatSize, 0.25),
      velocity: 110,
    });
  }, [track, resolvedClip, midiData?.notes, beatSize, addMidiNote, removeMidiNote]);

  const handleVelocityChange = useCallback((note: MidiNote, delta: number) => {
    if (!resolvedClip) return;
    updateMidiNote(resolvedClip.id, note.id, { velocity: Math.max(1, Math.min(127, note.velocity + delta)) });
  }, [resolvedClip, updateMidiNote]);

  if (!project || !track) return null;

  if (!resolvedClip || !midiData) {
    return (
      <div className="border-t border-[#1a1a1a] bg-[#171717] flex flex-col select-none shrink-0" style={{ height: pianoRollHeight }}>
        <div className="h-1.5 w-full cursor-ns-resize bg-[#444] hover:bg-daw-accent transition-colors flex-shrink-0" onMouseDown={handleResizeMouseDown} />
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => {
              const nextClip = ensureMidiClip(track.id, 0, 8);
              setOpenPianoRoll(track.id, nextClip.id);
            }}
            className="px-4 py-2 rounded border border-violet-500/40 bg-violet-500/10 text-sm text-violet-200 hover:bg-violet-500/20"
          >
            Create MIDI Clip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#1a1a1a] bg-[#171717] flex flex-col select-none shrink-0" style={{ height: pianoRollHeight }}>
      <div className="h-1.5 w-full cursor-ns-resize bg-[#444] hover:bg-daw-accent transition-colors flex-shrink-0" onMouseDown={handleResizeMouseDown} />
      <div className="h-9 px-3 border-b border-[#2a2a2a] bg-[#202020] flex items-center gap-2">
        <div className="text-xs font-medium text-zinc-200">{track.displayName}</div>
        <div className="text-[11px] text-zinc-500">{resolvedClip.prompt}</div>
        <select
          value={midiData.grid}
          onChange={(e) => setMidiGrid(resolvedClip.id, e.target.value as PianoRollGrid)}
          className="ml-auto bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-zinc-300"
        >
          {GRID_OPTIONS.map((grid) => (
            <option key={grid} value={grid}>{grid}</option>
          ))}
        </select>
        <select
          value={track.synthPreset ?? 'piano'}
          onChange={(e) => useProjectStore.getState().updateTrack(track.id, { synthPreset: e.target.value as Track['synthPreset'] })}
          className="bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-zinc-300"
        >
          <option value="piano">Piano</option>
          <option value="strings">Strings</option>
          <option value="pad">Pad</option>
          <option value="lead">Lead</option>
          <option value="bass">Bass</option>
          <option value="organ">Organ</option>
        </select>
        <button
          onClick={() => setOpenPianoRoll(null)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="relative" style={{ width: KEYBOARD_WIDTH + totalBeats * pixelsPerBeat }}>
          <div className="sticky top-0 z-10 flex h-6 bg-[#1d1d1d] border-b border-[#2d2d2d]">
            <div style={{ width: KEYBOARD_WIDTH }} />
            {Array.from({ length: totalBeats }, (_, beat) => (
              <div
                key={beat}
                className={`h-6 border-r text-[10px] flex items-center justify-center ${beat % 4 === 0 ? 'border-zinc-600 text-zinc-300' : 'border-zinc-800 text-zinc-500'}`}
                style={{ width: pixelsPerBeat }}
              >
                {beat + 1}
              </div>
            ))}
          </div>
          {Array.from({ length: TOTAL_NOTES }, (_, index) => {
            const pitch = START_NOTE + (TOTAL_NOTES - 1 - index);
            const black = [1, 3, 6, 8, 10].includes(pitch % 12);
            return (
              <div key={pitch} className="flex border-b border-[#252525]" style={{ height: ROW_HEIGHT }}>
                <button
                  className={`shrink-0 px-2 text-[10px] text-left border-r border-[#2d2d2d] ${black ? 'bg-[#1d1d1d] text-zinc-400' : 'bg-[#262626] text-zinc-300'}`}
                  style={{ width: KEYBOARD_WIDTH }}
                  onClick={() => synthEngine.previewNote(pitch, 110, 0.4, track.synthPreset ?? 'piano')}
                >
                  {midiNoteName(pitch)}
                </button>
                <div className="relative flex-1">
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: Math.ceil(totalBeats / beatSize) }, (_, stepIndex) => {
                      const beat = stepIndex * beatSize;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => handleGridClick(pitch, beat)}
                          className={`h-full border-r ${Math.round(beat) === beat ? 'border-zinc-700' : 'border-zinc-900'} ${black ? 'bg-[#131313]' : 'bg-[#171717]'} hover:bg-[#223049]`}
                          style={{ width: pixelsPerBeat * beatSize }}
                        />
                      );
                    })}
                  </div>
                  {midiData.notes.filter((note) => note.pitch === pitch).map((note) => (
                    <div
                      key={note.id}
                      className="absolute top-[2px] bottom-[2px] rounded bg-[#3b82f6] border border-[#7fb3ff] flex items-center px-2 text-[10px] text-white"
                      style={{
                        left: note.startBeat * pixelsPerBeat,
                        width: Math.max(16, note.durationBeats * pixelsPerBeat - 2),
                        opacity: 0.55 + (note.velocity / 127) * 0.35,
                      }}
                    >
                      <span className="truncate">{midiNoteName(note.pitch)}</span>
                      <div className="ml-auto flex gap-1">
                        <button className="text-[9px] text-white/70 hover:text-white" onClick={() => handleVelocityChange(note, -8)}>-</button>
                        <button className="text-[9px] text-white/70 hover:text-white" onClick={() => handleVelocityChange(note, 8)}>+</button>
                        <button className="text-[9px] text-white/70 hover:text-red-200" onClick={() => removeMidiNote(resolvedClip.id, note.id)}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
