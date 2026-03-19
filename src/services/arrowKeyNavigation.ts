import type { Clip, MidiNote, Track } from '../types/project';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { resolveFocusedTrackId } from './focusResolution';

type ArrowDirection = 'left' | 'right' | 'up' | 'down';

function getOrderedTracks(): Track[] {
  const project = useProjectStore.getState().project;
  if (!project) return [];
  return [...project.tracks].sort((a, b) => a.order - b.order);
}

function setFocusedTrack(trackId: string, scope: 'timeline' | 'mixer' | 'pianoRoll') {
  const ui = useUIStore.getState();
  ui.setExpandedTrackId(trackId);
  ui.setKeyboardContext(scope, trackId);
}

function getSortedClips(track: Track): Clip[] {
  return [...track.clips].sort((left, right) => {
    if (left.startTime !== right.startTime) return left.startTime - right.startTime;
    if (left.duration !== right.duration) return left.duration - right.duration;
    return left.id.localeCompare(right.id);
  });
}

function getSelectedTimelineClip(): Clip | null {
  const project = useProjectStore.getState().project;
  if (!project) return null;

  const selectedIds = useUIStore.getState().selectedClipIds;
  if (selectedIds.size === 0) return null;

  const sortedClips = project.tracks.flatMap(getSortedClips).sort((left, right) => {
    if (left.startTime !== right.startTime) return left.startTime - right.startTime;
    return left.trackId.localeCompare(right.trackId);
  });

  return sortedClips.find((clip) => selectedIds.has(clip.id)) ?? null;
}

function getTimelineReferenceTrack(): Track | null {
  const trackId = resolveFocusedTrackId();
  return getOrderedTracks().find((track) => track.id === trackId) ?? getOrderedTracks()[0] ?? null;
}

function selectTimelineClip(clip: Clip): boolean {
  const ui = useUIStore.getState();
  ui.selectClip(clip.id, false);
  setFocusedTrack(clip.trackId, 'timeline');
  return true;
}

function findHorizontalTimelineClip(track: Track, direction: 'left' | 'right', currentClip: Clip | null): Clip | null {
  const clips = getSortedClips(track);
  const lastClip = clips[clips.length - 1] ?? null;
  if (clips.length === 0) return null;
  if (!currentClip) return direction === 'right' ? clips[0] ?? null : lastClip;

  const currentIndex = clips.findIndex((clip) => clip.id === currentClip.id);
  if (currentIndex === -1) return direction === 'right' ? clips[0] ?? null : lastClip;

  const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
  return clips[nextIndex] ?? currentClip;
}

function findVerticalTimelineClip(tracks: Track[], direction: 'up' | 'down', currentClip: Clip | null): Clip | null {
  const currentTrackId = currentClip?.trackId ?? resolveFocusedTrackId();
  const currentTrackIndex = Math.max(0, tracks.findIndex((track) => track.id === currentTrackId));
  const nextTrack = tracks[currentTrackIndex + (direction === 'down' ? 1 : -1)];
  if (!nextTrack) return null;

  const clips = getSortedClips(nextTrack);
  if (!currentClip) return clips[0] ?? null;
  if (clips.length === 0) return null;

  return clips.reduce<Clip>((best, candidate) => {
    const bestDistance = Math.abs(best.startTime - currentClip.startTime);
    const candidateDistance = Math.abs(candidate.startTime - currentClip.startTime);
    if (candidateDistance !== bestDistance) return candidateDistance < bestDistance ? candidate : best;
    return candidate.startTime < best.startTime ? candidate : best;
  }, clips[0]!);
}

export function navigateTimelineByArrow(direction: ArrowDirection): boolean {
  const tracks = getOrderedTracks();
  if (tracks.length === 0) return false;

  const currentClip = getSelectedTimelineClip();
  const referenceTrack = (
    currentClip
      ? tracks.find((track) => track.id === currentClip.trackId)
      : getTimelineReferenceTrack()
  ) ?? tracks[0];
  if (!referenceTrack) return false;

  if (direction === 'left' || direction === 'right') {
    const nextClip = findHorizontalTimelineClip(referenceTrack, direction, currentClip);
    return nextClip ? selectTimelineClip(nextClip) : false;
  }

  const nextClip = findVerticalTimelineClip(tracks, direction, currentClip);
  if (nextClip) return selectTimelineClip(nextClip);

  const trackIndex = tracks.findIndex((track) => track.id === referenceTrack.id);
  const nextTrack = tracks[trackIndex + (direction === 'down' ? 1 : -1)];
  if (!nextTrack) return false;

  useUIStore.getState().deselectAll();
  setFocusedTrack(nextTrack.id, 'timeline');
  return true;
}

export function navigateMixerByArrow(direction: 'left' | 'right'): boolean {
  const tracks = getOrderedTracks();
  if (tracks.length === 0) return false;

  const currentTrackId = resolveFocusedTrackId() ?? tracks[0]?.id ?? null;
  const currentIndex = Math.max(0, tracks.findIndex((track) => track.id === currentTrackId));
  const nextTrack = tracks[currentIndex + (direction === 'right' ? 1 : -1)];
  if (!nextTrack) return false;

  setFocusedTrack(nextTrack.id, 'mixer');
  return true;
}

function getSortedNotes(notes: MidiNote[]): MidiNote[] {
  return [...notes].sort((left, right) => {
    if (left.startBeat !== right.startBeat) return left.startBeat - right.startBeat;
    if (left.pitch !== right.pitch) return left.pitch - right.pitch;
    return left.id.localeCompare(right.id);
  });
}

function getCurrentPianoRollNote(notes: MidiNote[]): MidiNote | null {
  const selectedIds = useUIStore.getState().selectedPianoRollNoteIds;
  if (selectedIds.length === 0) return null;
  return notes.find((note) => note.id === selectedIds[0]) ?? null;
}

function chooseInitialPianoRollNote(notes: MidiNote[], direction: ArrowDirection): MidiNote | null {
  const sortedNotes = getSortedNotes(notes);
  if (sortedNotes.length === 0) return null;
  if (direction === 'right' || direction === 'down') return sortedNotes[0] ?? null;
  return sortedNotes[sortedNotes.length - 1] ?? null;
}

function chooseVerticalPianoRollNote(notes: MidiNote[], currentNote: MidiNote, direction: 'up' | 'down'): MidiNote | null {
  const targetNotes = notes.filter((note) => (
    direction === 'up' ? note.pitch > currentNote.pitch : note.pitch < currentNote.pitch
  ));
  if (targetNotes.length === 0) return currentNote;

  return targetNotes.reduce<MidiNote>((best, candidate) => {
    const bestPitchDelta = Math.abs(best.pitch - currentNote.pitch);
    const candidatePitchDelta = Math.abs(candidate.pitch - currentNote.pitch);
    if (candidatePitchDelta !== bestPitchDelta) return candidatePitchDelta < bestPitchDelta ? candidate : best;

    const bestStartDelta = Math.abs(best.startBeat - currentNote.startBeat);
    const candidateStartDelta = Math.abs(candidate.startBeat - currentNote.startBeat);
    if (candidateStartDelta !== bestStartDelta) return candidateStartDelta < bestStartDelta ? candidate : best;

    return candidate.startBeat < best.startBeat ? candidate : best;
  }, targetNotes[0]!);
}

export function navigatePianoRollByArrow(direction: ArrowDirection): boolean {
  const { openPianoRollClipId, openPianoRollTrackId } = useUIStore.getState();
  const project = useProjectStore.getState().project;
  if (!project || !openPianoRollClipId || !openPianoRollTrackId) return false;

  const clip = project.tracks
    .flatMap((track) => track.clips)
    .find((candidate) => candidate.id === openPianoRollClipId && candidate.midiData);
  const notes = clip?.midiData?.notes ?? [];
  if (notes.length === 0) return false;

  const sortedNotes = getSortedNotes(notes);
  const currentNote = getCurrentPianoRollNote(sortedNotes);
  const nextNote = !currentNote
    ? chooseInitialPianoRollNote(sortedNotes, direction)
    : direction === 'left'
      ? sortedNotes[Math.max(0, sortedNotes.findIndex((note) => note.id === currentNote.id) - 1)] ?? currentNote
      : direction === 'right'
        ? sortedNotes[Math.min(sortedNotes.length - 1, sortedNotes.findIndex((note) => note.id === currentNote.id) + 1)] ?? currentNote
        : chooseVerticalPianoRollNote(sortedNotes, currentNote, direction);

  if (!nextNote) return false;

  const ui = useUIStore.getState();
  ui.setSelectedPianoRollNoteIds([nextNote.id]);
  ui.setKeyboardContext('pianoRoll', openPianoRollTrackId);
  return true;
}
