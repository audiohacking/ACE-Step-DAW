import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { getAudioEngine } from './useAudioEngine';
import { saveAudioBlob, loadAudioBlobByKey } from '../services/audioFileManager';
import { computeWaveformPeaks } from '../utils/waveformPeaks';
import { audioBufferToWavBlob } from '../utils/wav';
import { toastSuccess } from './useToast';
import { LOOP_DEFINITIONS, loadLoop } from '../engine/LoopLibrary';

function trimAudioBuffer(
  engine: ReturnType<typeof getAudioEngine>,
  audioBuffer: AudioBuffer,
  clipDuration: number,
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const trimmedLength = Math.min(
    Math.floor(clipDuration * sampleRate),
    audioBuffer.length,
  );
  const trimmedBuffer = engine.ctx.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    sampleRate,
  );
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = trimmedBuffer.getChannelData(ch);
    for (let i = 0; i < trimmedLength; i++) {
      dst[i] = src[i];
    }
  }
  return trimmedBuffer;
}

export function useAudioImport() {
  const addTrack = useProjectStore((s) => s.addTrack);
  const addClip = useProjectStore((s) => s.addClip);
  const updateClipStatus = useProjectStore((s) => s.updateClipStatus);

  const importAudioBufferToTrack = useCallback(async (
    audioBuffer: AudioBuffer,
    name: string,
    trackId: string,
    startTime: number,
  ) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const engine = getAudioEngine();
    await engine.resume();

    const duration = audioBuffer.duration;
    const clipDuration = Math.min(duration, project.totalDuration - startTime);
    if (clipDuration <= 0) return;

    const clip = addClip(trackId, {
      startTime,
      duration: clipDuration,
      prompt: `Imported: ${name}`,
      lyrics: '',
    });

    const trimmedBuffer = trimAudioBuffer(engine, audioBuffer, clipDuration);
    const wavBlob = audioBufferToWavBlob(trimmedBuffer);
    const isolatedKey = await saveAudioBlob(project.id, clip.id, 'isolated', wavBlob);
    const peaks = computeWaveformPeaks(trimmedBuffer, 200);

    updateClipStatus(clip.id, 'ready', {
      isolatedAudioKey: isolatedKey,
      waveformPeaks: peaks,
      audioDuration: clipDuration,
      audioOffset: 0,
      source: 'uploaded',
    });

    toastSuccess('Audio file imported');
  }, [addClip, updateClipStatus]);

  const importAudioFile = useCallback(async (file: File) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const engine = getAudioEngine();
    await engine.resume();

    // Decode the audio file
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await engine.ctx.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;

    const track = addTrack('custom', 'sample');
    // Rename to the file name
    useProjectStore.getState().updateTrack(track.id, {
      displayName: file.name.replace(/\.[^.]+$/, ''),
    });

    // Create a clip spanning the audio
    const clipDuration = Math.min(duration, project.totalDuration);
    const clip = addClip(track.id, {
      startTime: 0,
      duration: clipDuration,
      prompt: `Imported: ${file.name}`,
      lyrics: '',
    });

    const trimmedBuffer = trimAudioBuffer(engine, audioBuffer, clipDuration);

    // Convert to WAV and store
    const wavBlob = audioBufferToWavBlob(trimmedBuffer);
    const isolatedKey = await saveAudioBlob(project.id, clip.id, 'isolated', wavBlob);

    // Compute waveform peaks
    const peaks = computeWaveformPeaks(trimmedBuffer, 200);

    // Mark clip as ready with uploaded source
    updateClipStatus(clip.id, 'ready', {
      isolatedAudioKey: isolatedKey,
      waveformPeaks: peaks,
      audioDuration: clipDuration,
      audioOffset: 0,
      source: 'uploaded',
    });

    toastSuccess('Audio file imported');
  }, [addTrack, addClip, updateClipStatus]);

  const importAudioToTrack = useCallback(async (file: File, trackId: string, startTime: number) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const engine = getAudioEngine();
    await engine.resume();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await engine.ctx.decodeAudioData(arrayBuffer);
    await importAudioBufferToTrack(audioBuffer, file.name, trackId, startTime);
  }, [importAudioBufferToTrack]);

  const importMultipleFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aac|m4a|webm)$/i.test(file.name)) {
        await importAudioFile(file);
      }
    }
  }, [importAudioFile]);

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = async () => {
      if (input.files && input.files.length > 0) {
        await importMultipleFiles(input.files);
      }
    };
    input.click();
  }, [importMultipleFiles]);

  const importLoopToTrack = useCallback(async (loopId: string, trackId: string, startTime: number) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const def = LOOP_DEFINITIONS.find((d) => d.id === loopId);
    if (!def) return;

    const { audioBuffer, waveformData } = await loadLoop(def);
    const duration = audioBuffer.duration;
    const clipDuration = Math.min(duration, project.totalDuration - startTime);
    if (clipDuration <= 0) return;

    const clip = addClip(trackId, {
      startTime,
      duration: clipDuration,
      prompt: `Loop: ${def.name}`,
      lyrics: '',
    });

    const wavBlob = audioBufferToWavBlob(audioBuffer);
    const isolatedKey = await saveAudioBlob(project.id, clip.id, 'isolated', wavBlob);
    const peaks = computeWaveformPeaks(audioBuffer, 200);

    updateClipStatus(clip.id, 'ready', {
      isolatedAudioKey: isolatedKey,
      waveformPeaks: peaks,
      audioDuration: clipDuration,
      audioOffset: 0,
      source: 'uploaded',
    });
  }, [addClip, updateClipStatus]);

  const importAssetToTrack = useCallback(async (assetId: string, trackId: string, startTime: number) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const asset = (project.assets ?? []).find((a) => a.id === assetId);
    if (!asset) return;

    const audioKey = asset.isolatedAudioKey ?? asset.cumulativeMixKey;
    if (!audioKey) return;

    const blob = await loadAudioBlobByKey(audioKey);
    if (!blob) return;

    const engine = getAudioEngine();
    await engine.resume();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await engine.ctx.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;
    const clipDuration = Math.min(duration, project.totalDuration - startTime);
    if (clipDuration <= 0) return;

    const clip = addClip(trackId, {
      startTime,
      duration: clipDuration,
      prompt: asset.prompt || `From: ${asset.trackDisplayName}`,
      lyrics: '',
    });

    const wavBlob = audioBufferToWavBlob(audioBuffer);
    const isolatedKey = await saveAudioBlob(project.id, clip.id, 'isolated', wavBlob);
    const peaks = asset.waveformPeaks ?? computeWaveformPeaks(audioBuffer, 200);

    updateClipStatus(clip.id, 'ready', {
      isolatedAudioKey: isolatedKey,
      waveformPeaks: peaks,
      audioDuration: clipDuration,
      audioOffset: 0,
      source: asset.source,
    });
  }, [addClip, updateClipStatus]);

  return {
    importAudioFile,
    importAudioBufferToTrack,
    importAudioToTrack,
    importMultipleFiles,
    openFilePicker,
    importLoopToTrack,
    importAssetToTrack,
  };
}
