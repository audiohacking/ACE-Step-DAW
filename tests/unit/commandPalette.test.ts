import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCommandPaletteCommands,
  searchCommandsForQuery,
  type CommandPaletteContext,
} from '../../src/services/commandPalette';
import { useProjectStore } from '../../src/store/projectStore';
import { useTransportStore } from '../../src/store/transportStore';

function createContext(): CommandPaletteContext {
  const projectStore = useProjectStore.getState();
  const transportStore = useTransportStore.getState();

  return {
    project: projectStore.project,
    selectedClipIds: [],
    currentTime: transportStore.currentTime,
    isPlaying: transportStore.isPlaying,
    showMixer: false,
    showLibrary: false,
    showSmartControls: false,
    showAIAssistant: false,
    loopBrowserOpen: false,
    showTempoLane: false,
    loopEnabled: transportStore.loopEnabled,
    metronomeEnabled: transportStore.metronomeEnabled,
    expandedTrackId: null,
    openPianoRollTrackId: null,
    openSequencerTrackId: null,
    openDrumMachineTrackId: null,
    actions: {
      play: transportStore.play,
      pause: transportStore.pause,
      stop: transportStore.stop,
      toggleLoop: transportStore.toggleLoop,
      toggleMetronome: transportStore.toggleMetronome,
      setShowNewProjectDialog: () => {},
      setShowProjectListDialog: () => {},
      setShowSettingsDialog: () => {},
      setShowExportDialog: () => {},
      setShowKeyboardShortcutsDialog: () => {},
      setShowLibrary: () => {},
      setShowMixer: () => {},
      setShowSmartControls: () => {},
      toggleLoopBrowser: () => {},
      toggleTempoLane: () => {},
      toggleAIAssistant: () => {},
      setBatchGenerateMode: () => {},
      addTrack: projectStore.addTrack,
      addTrackEffect: projectStore.addTrackEffect,
      updateProject: projectStore.updateProject,
      duplicateClip: () => {},
      splitClip: () => {},
      removeClip: () => {},
      setEditingClip: () => {},
      deselectAll: () => {},
    },
  };
}

describe('commandPalette', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useTransportStore.setState(useTransportStore.getInitialState(), true);
    useProjectStore.getState().createProject({ name: 'Palette Test', bpm: 120 });
  });

  it('matches natural-language effect intents against track names', () => {
    useProjectStore.getState().addTrack('drums');
    const vocalsTrack = useProjectStore.getState().addTrack('vocals');
    const results = searchCommandsForQuery('add reverb to vocals', createContext(), []);

    expect(results[0]?.id).toBe(`track:${vocalsTrack.id}:effect:reverb`);
    expect(results[0]?.title).toBe(`Add Reverb to ${vocalsTrack.displayName}`);
  });

  it('adds parsed BPM commands for parameter search', async () => {
    const context = createContext();
    const results = searchCommandsForQuery('tempo 140', context, []);
    const tempoCommand = results.find((result) => result.id === 'project:set-tempo:140');

    expect(tempoCommand).toBeTruthy();
    if (!tempoCommand) {
      throw new Error('Expected tempo command to be available');
    }

    await tempoCommand.execute();

    expect(useProjectStore.getState().project?.bpm).toBe(140);
  });

  it('builds dynamic effect commands for all project tracks', () => {
    const drumsTrack = useProjectStore.getState().addTrack('drums');
    const bassTrack = useProjectStore.getState().addTrack('bass');
    const commandIds = buildCommandPaletteCommands(createContext()).map((command) => command.id);

    expect(commandIds).toContain(`track:${drumsTrack.id}:effect:reverb`);
    expect(commandIds).toContain(`track:${bassTrack.id}:effect:compressor`);
  });
});
