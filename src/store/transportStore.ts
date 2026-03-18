import { create } from 'zustand';

interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  armedTrackIds: string[];
  currentTime: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  metronomeEnabled: boolean;

  play: () => void;
  pause: () => void;
  stop: () => void;
  setIsRecording: (v: boolean) => void;
  armTrack: (id: string) => void;
  disarmTrack: (id: string) => void;
  toggleArmTrack: (id: string) => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  toggleLoop: () => void;
  setLoopRegion: (start: number, end: number) => void;
  toggleMetronome: () => void;
}

export const useTransportStore = create<TransportState>((set) => ({
  isPlaying: false,
  isRecording: false,
  armedTrackIds: [],
  currentTime: 0,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 0,
  metronomeEnabled: false,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setIsRecording: (v) => set({ isRecording: v }),
  armTrack: (id) => set((s) => (
    s.armedTrackIds.includes(id) ? s : { armedTrackIds: [...s.armedTrackIds, id] }
  )),
  disarmTrack: (id) => set((s) => ({
    armedTrackIds: s.armedTrackIds.filter((trackId) => trackId !== id),
  })),
  toggleArmTrack: (id) => set((s) => ({
    armedTrackIds: s.armedTrackIds.includes(id)
      ? s.armedTrackIds.filter((trackId) => trackId !== id)
      : [...s.armedTrackIds, id],
  })),
  seek: (time) => set({ currentTime: Math.max(0, time) }),
  setCurrentTime: (time) => set({ currentTime: time }),
  toggleLoop: () => set((s) => ({ loopEnabled: !s.loopEnabled })),
  setLoopRegion: (start, end) => set({ loopStart: start, loopEnd: end }),
  toggleMetronome: () => set((s) => ({ metronomeEnabled: !s.metronomeEnabled })),
}));
