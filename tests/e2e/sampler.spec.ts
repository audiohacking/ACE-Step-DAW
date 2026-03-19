import { promises as fs } from 'node:fs';
import { test, expect } from '@playwright/test';

function createTestWav(durationSeconds = 0.2, sampleRate = 44100): Buffer {
  const frameCount = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const channelCount = 1;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i++) {
    const sample = Math.sin((i / sampleRate) * Math.PI * 2 * 220) * 0.35;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * bytesPerSample);
  }

  return buffer;
}

test.describe('Sampler Workflow', () => {
  test('creates and edits a quick sampler from an audio file', async ({ page }, testInfo) => {
    const samplePath = testInfo.outputPath('sampler-test.wav');
    await fs.writeFile(samplePath, createTestWav());

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof (window as any).__store !== 'undefined', null, { timeout: 10000 });
    await page.evaluate(() => {
      (window as any).__store.getState().createProject({ name: 'Sampler Test' });
      (window as any).__uiStore.setState({ showNewProjectDialog: false });
    });
    await page.getByText('Click anywhere to enable audio').click();

    await page.evaluate(() => {
      const store = (window as any).__store;
      const uiStore = (window as any).__uiStore;
      const track = store.getState().addTrack('keyboard', 'pianoRoll');
      store.getState().updateTrack(track.id, {
        displayName: 'Quick Sampler',
        synthPreset: 'sampler',
      });
      store.getState().setTrackSampler(track.id, { rootNote: 60 });
      uiStore.getState().setOpenPianoRoll(track.id);
    });

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /Load sampler source for Quick Sampler/i }).click(),
    ]);
    await chooser.setFiles(samplePath);

    await page.waitForFunction(() => {
      const track = (window as any).__store.getState().project?.tracks[0];
      return track?.synthPreset === 'sampler' && track?.sampler?.sampleName === 'sampler-test';
    });

    await expect(page.getByRole('button', { name: /Load sampler source for sampler-test/i })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Sampler root note' })).toHaveValue('60');
    await expect(page.getByLabel('Quick Sampler playback mode')).toHaveValue('classic');

    await page.evaluate(() => {
      const store = (window as any).__store;
      const track = store.getState().project?.tracks[0];
      if (!track?.samplerConfig) return;
      store.getState().updateSamplerConfig(track.id, {
        ...track.samplerConfig,
        playbackMode: 'loop',
        trimEnd: 0.12,
        loopEnd: 0.12,
      });
    });

    await page.waitForFunction(() => {
      const track = (window as any).__store.getState().project?.tracks[0];
      return track?.samplerConfig?.playbackMode === 'loop'
        && Math.abs((track?.samplerConfig?.trimEnd ?? 0) - 0.12) < 0.011;
    });

    const samplerState = await page.evaluate(() => {
      const track = (window as any).__store.getState().project?.tracks[0];
      const clip = (window as any).__store.getState().ensureMidiClip(track.id);
      (window as any).__store.getState().addMidiNote(clip.id, {
        pitch: 60,
        startBeat: 0,
        durationBeats: 1,
        velocity: 100,
      });
      const refreshedTrack = (window as any).__store.getState().project?.tracks[0];
      const refreshedClip = refreshedTrack?.clips.find((candidate: any) => candidate.id === clip.id);
      return {
        trackType: refreshedTrack.trackType,
        synthPreset: refreshedTrack.synthPreset,
        sampleName: refreshedTrack.sampler?.sampleName,
        rootNote: refreshedTrack.sampler?.rootNote,
        playbackMode: refreshedTrack.samplerConfig?.playbackMode,
        trimEnd: refreshedTrack.samplerConfig?.trimEnd,
        notes: refreshedClip?.midiData?.notes.length ?? 0,
      };
    });

    expect(samplerState).toMatchObject({
      trackType: 'pianoRoll',
      synthPreset: 'sampler',
      sampleName: 'sampler-test',
      rootNote: 60,
      playbackMode: 'loop',
      notes: 1,
    });
    expect(samplerState.trimEnd).toBeCloseTo(0.12, 2);
  });
});
