/**
 * aiAssistantContext.ts — Build a context string for the AI assistant
 * that describes the current DAW project state, selected track, and effects.
 */
import type { Project, Track } from '../types/project';

/**
 * Build a context string summarizing the current DAW state for the AI assistant.
 * Includes project settings, track layout, selected track details, and effects.
 */
export function buildAssistantContext(
  project: Project | null,
  selectedTrackId: string | null,
): string {
  if (!project) return 'No project loaded.';

  const lines: string[] = [];

  // Project overview
  lines.push(`Project: "${project.name}"`);
  lines.push(`BPM: ${project.bpm} | Key: ${project.keyScale || 'none'} | Time Signature: ${project.timeSignature}/4`);
  lines.push(`Duration: ${fmtDur(project.totalDuration)} | Tracks: ${project.tracks.length}`);

  if (project.globalCaption) {
    lines.push(`Description: ${project.globalCaption}`);
  }

  // Track summary
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

  // Selected track detail
  if (selectedTrackId) {
    const track = project.tracks.find((t) => t.id === selectedTrackId);
    if (track) {
      lines.push('');
      lines.push(`Selected track: ${track.displayName} (${track.trackType || 'stems'})`);
      lines.push(`  Volume: ${Math.round(track.volume * 100)}% | Pan: ${track.pan ?? 0}`);

      if (track.localCaption) {
        lines.push(`  Caption: ${track.localCaption}`);
      }

      // Effects
      if (track.effects && track.effects.length > 0) {
        const fxList = track.effects.map((e) => `${e.type}${e.enabled ? '' : ' (bypassed)'}`).join(', ');
        lines.push(`  Effects: ${fxList}`);
      }

      // MIDI effects
      if (track.midiEffects && track.midiEffects.length > 0) {
        const mfxList = track.midiEffects.map((e) => `${e.type}${e.enabled ? '' : ' (bypassed)'}`).join(', ');
        lines.push(`  MIDI Effects: ${mfxList}`);
      }

      // Synth/drum info
      if (track.synthPreset) {
        lines.push(`  Synth: ${track.synthPreset}`);
      }
      if (track.drumKit) {
        lines.push(`  Drum Kit: ${track.drumKit}`);
      }

      // Clips detail
      if (track.clips.length > 0) {
        lines.push(`  Clips:`);
        for (const clip of track.clips) {
          const status = clip.generationStatus === 'ready' ? 'ready' : clip.generationStatus;
          const type = clip.midiData ? `MIDI (${clip.midiData.notes.length} notes)` : (clip.prompt || 'audio');
          lines.push(`    [${status}] ${fmtDur(clip.startTime)}-${fmtDur(clip.startTime + clip.duration)}: ${type}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function fmtDur(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
