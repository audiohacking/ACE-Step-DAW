import type { Project, Track } from '../types/project';

interface AssistantUIContext {
  expandedTrackId?: string | null;
  openSequencerTrackId?: string | null;
  openDrumMachineTrackId?: string | null;
  openPianoRollTrackId?: string | null;
  openEffectChainTrackId?: string | null;
  openMidiEffectChainTrackId?: string | null;
  selectedClipIds?: Set<string>;
  showMixer?: boolean;
  showLibrary?: boolean;
  loopBrowserOpen?: boolean;
  showSmartControls?: boolean;
  showAIAssistant?: boolean;
}

interface AssistantTransportContext {
  isPlaying?: boolean;
  loopEnabled?: boolean;
}

export interface AIChatContext {
  hasProject: boolean;
  projectName: string | null;
  projectBpm: number | null;
  trackCount: number | null;
  focusedTrack: Track | null;
  selectedClipCount: number;
  activePanels: string[];
  summary: string;
}

export function buildAssistantContext(
  project: Project | null,
  ui: AssistantUIContext = {},
  transport: AssistantTransportContext = {},
): AIChatContext {
  if (!project) {
    return {
      hasProject: false,
      projectName: null,
      projectBpm: null,
      trackCount: null,
      focusedTrack: null,
      selectedClipCount: 0,
      activePanels: [],
      summary: 'No project loaded.',
    };
  }

  const lines: string[] = [];
  const focusedTrack = resolveFocusedTrack(project, ui);
  const activePanels = getActivePanels(ui);
  const selectedClipCount = ui.selectedClipIds?.size ?? 0;

  lines.push(`Project: "${project.name}"`);
  lines.push(`BPM: ${project.bpm} | Key: ${project.keyScale || 'none'} | Time Signature: ${project.timeSignature}/4`);
  lines.push(`Duration: ${fmtDur(project.totalDuration)} | Tracks: ${project.tracks.length}`);

  if (project.globalCaption) {
    lines.push(`Description: ${project.globalCaption}`);
  }

  if (project.tracks.length > 0) {
    lines.push('');
    lines.push('Tracks:');
    for (const track of project.tracks) {
      const flags = [
        track.muted ? 'muted' : null,
        track.soloed ? 'solo' : null,
        track.armed ? 'armed' : null,
      ].filter(Boolean).join(', ');
      const flagStr = flags ? ` (${flags})` : '';
      lines.push(`  - ${track.displayName} [${track.trackType || 'stems'}]${flagStr} — ${track.clips.length} clip(s), vol: ${Math.round(track.volume * 100)}%`);
    }
  }

  if (selectedClipCount > 0 || activePanels.length > 0 || transport.isPlaying || transport.loopEnabled) {
    lines.push('');
  }

  if (selectedClipCount > 0) {
    lines.push(`Selected clips: ${selectedClipCount}`);
  }

  if (activePanels.length > 0) {
    lines.push(`Open panels: ${activePanels.join(', ')}`);
  }

  if (transport.isPlaying || transport.loopEnabled) {
    const playback = [
      transport.isPlaying ? 'playing' : 'stopped',
      transport.loopEnabled ? 'loop enabled' : null,
    ].filter(Boolean).join(', ');
    lines.push(`Transport: ${playback}`);
  }

  if (focusedTrack) {
    lines.push('');
    lines.push(`Focused track: ${focusedTrack.displayName} (${focusedTrack.trackType || 'stems'})`);
    lines.push(`  Volume: ${Math.round(focusedTrack.volume * 100)}% | Pan: ${focusedTrack.pan ?? 0}`);

    if (focusedTrack.localCaption) {
      lines.push(`  Caption: ${focusedTrack.localCaption}`);
    }

    if (focusedTrack.effects && focusedTrack.effects.length > 0) {
      const fxList = focusedTrack.effects.map((effect) => `${effect.type}${effect.enabled ? '' : ' (bypassed)'}`).join(', ');
      lines.push(`  Effects: ${fxList}`);
    }

    if (focusedTrack.midiEffects && focusedTrack.midiEffects.length > 0) {
      const mfxList = focusedTrack.midiEffects.map((effect) => `${effect.type}${effect.enabled ? '' : ' (bypassed)'}`).join(', ');
      lines.push(`  MIDI Effects: ${mfxList}`);
    }

    if (focusedTrack.synthPreset) {
      lines.push(`  Synth: ${focusedTrack.synthPreset}`);
    }

    if (focusedTrack.drumKit) {
      lines.push(`  Drum Kit: ${focusedTrack.drumKit}`);
    }

    if (focusedTrack.clips.length > 0) {
      lines.push('  Clips:');
      for (const clip of focusedTrack.clips) {
        const status = clip.generationStatus === 'ready' ? 'ready' : clip.generationStatus;
        const type = clip.midiData ? `MIDI (${clip.midiData.notes.length} notes)` : (clip.prompt || 'audio');
        lines.push(`    [${status}] ${fmtDur(clip.startTime)}-${fmtDur(clip.startTime + clip.duration)}: ${type}`);
      }
    }
  }

  return {
    hasProject: true,
    projectName: project.name,
    projectBpm: project.bpm,
    trackCount: project.tracks.length,
    focusedTrack,
    selectedClipCount,
    activePanels,
    summary: lines.join('\n'),
  };
}

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function resolveFocusedTrack(project: Project, ui: AssistantUIContext): Track | null {
  const directTrackId = ui.expandedTrackId
    ?? ui.openEffectChainTrackId
    ?? ui.openMidiEffectChainTrackId
    ?? ui.openPianoRollTrackId
    ?? ui.openSequencerTrackId
    ?? ui.openDrumMachineTrackId
    ?? null;

  if (directTrackId) {
    return project.tracks.find((track) => track.id === directTrackId) ?? null;
  }

  const firstSelectedClipId = ui.selectedClipIds ? [...ui.selectedClipIds][0] : null;
  if (firstSelectedClipId) {
    return project.tracks.find((track) => track.clips.some((clip) => clip.id === firstSelectedClipId)) ?? null;
  }

  return project.tracks[0] ?? null;
}

function getActivePanels(ui: AssistantUIContext): string[] {
  const panels: string[] = [];
  if (ui.showMixer) panels.push('Mixer');
  if (ui.showLibrary) panels.push('Library');
  if (ui.loopBrowserOpen) panels.push('Loop Browser');
  if (ui.showSmartControls) panels.push('Smart Controls');
  if (ui.showAIAssistant) panels.push('AI Assistant');
  return panels;
}
