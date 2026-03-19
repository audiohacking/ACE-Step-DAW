import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useAudioImport } from '../../hooks/useAudioImport';

export function AddTrackButton() {
  const setShowInstrumentPicker = useUIStore((s) => s.setShowInstrumentPicker);
  const createGroupTrack = useProjectStore((s) => s.createGroupTrack);
  const { openFilePicker } = useAudioImport();

  return (
    <div className="flex gap-1 mx-2 my-2">
      <button
        onClick={() => setShowInstrumentPicker(true)}
        className="flex-1 flex items-center justify-center gap-1 h-7 text-[11px] font-medium text-zinc-400 hover:text-white bg-[#3a3a3a] hover:bg-[#484848] rounded transition-colors"
      >
        <span className="text-sm">+</span> Track
      </button>
      <button
        onClick={() => {
          const name = window.prompt('Group name', 'New Group');
          if (name?.trim()) createGroupTrack(name.trim());
        }}
        className="flex items-center justify-center gap-1 h-7 px-2 text-[11px] font-medium text-zinc-400 hover:text-white bg-[#3a3a3a] hover:bg-[#484848] rounded transition-colors"
        title="Add group/folder track (Cmd+Shift+G)"
        aria-label="Add group track"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4h4l2 2h6v7H2V4z" />
        </svg>
      </button>
      <button
        onClick={openFilePicker}
        className="flex items-center justify-center gap-1 h-7 px-2 text-[11px] font-medium text-zinc-400 hover:text-white bg-[#3a3a3a] hover:bg-[#484848] rounded transition-colors"
        title="Import audio or MIDI file"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M6 1v7M3 5l3 3 3-3" />
          <path d="M1 9v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V9" />
        </svg>
      </button>
    </div>
  );
}
