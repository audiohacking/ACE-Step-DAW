import { test, expect } from '@playwright/test';

function createWavBuffer(durationSeconds = 0.1, sampleRate = 44100): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const sampleCount = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

test.describe('Stem Separation', () => {
  test('separates an audio clip into new tracks from the clip context menu', async ({ page }) => {
    const wavBuffer = createWavBuffer();
    let queryCount = 0;

    await page.route('**/api/release_task', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { task_id: 'stem-job-1', status: 'queued' },
          code: 0,
          error: null,
          timestamp: Date.now(),
          extra: null,
        }),
      });
    });

    await page.route('**/api/query_result', async (route) => {
      queryCount += 1;
      const payload = queryCount === 1
        ? [{
            task_id: 'stem-job-1',
            status: 0,
            result: '[]',
            progress_text: 'Separating stems... 50%',
          }]
        : [{
            task_id: 'stem-job-1',
            status: 1,
            result: JSON.stringify([
              { stem: 'vocals', file: '/stems/vocals.wav' },
              { stem: 'drums', file: '/stems/drums.wav' },
              { stem: 'bass', file: '/stems/bass.wav' },
              { stem: 'other', file: '/stems/other.wav' },
            ]),
            progress_text: 'Separating stems... 100%',
          }];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: payload,
          code: 0,
          error: null,
          timestamp: Date.now(),
          extra: null,
        }),
      });
    });

    await page.route('**/api/v1/audio?path=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: wavBuffer,
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof (window as any).__store !== 'undefined', null, { timeout: 10000 });

    const clipId = await page.evaluate(async (wavBytes) => {
      const openStore = (name: string) => new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('keyval');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const putKeyval = async (key: string, blob: Blob) => {
        const db = await openStore('keyval-store');
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(blob, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      };

      const sourceKey = 'source-audio-key';
      await putKeyval(sourceKey, new Blob([new Uint8Array(wavBytes)], { type: 'audio/wav' }));

      const store = (window as any).__store;
      const uiStore = (window as any).__uiStore;
      store.getState().createProject({ name: 'Stem Separation E2E' });
      uiStore.getState().setShowNewProjectDialog(false);
      const track = store.getState().addTrack('custom', 'sample');
      const clip = store.getState().addClip(track.id, {
        startTime: 4,
        duration: 2,
        prompt: 'Imported full mix',
        lyrics: '',
        source: 'uploaded',
      });
      store.getState().updateClipStatus(clip.id, 'ready', {
        isolatedAudioKey: sourceKey,
        waveformPeaks: [0.2, 0.4, 0.1],
        audioDuration: 2,
        audioOffset: 0,
        source: 'uploaded',
      });
      return clip.id;
    }, Array.from(wavBuffer));

    await page.mouse.click(20, 20);
    await expect(page.getByText('Click anywhere to enable audio')).toBeHidden();
    await page.locator(`[data-testid="clip-${clipId}"]`).evaluate((element) => {
      element.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: 260,
        clientY: 180,
      }));
    });
    await expect(page.getByRole('button', { name: 'Edit Clip' })).toBeVisible();
    await page.getByRole('button', { name: 'Separate Stems…' }).click();

    await expect(page.getByText('Separate Stems')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select 2 stem separation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select 4 stem separation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select 6 stem separation' })).toBeVisible();

    await page.getByRole('button', { name: 'Run stem separation' }).click();
    await expect(page.getByText('Separating stems... 50%').last()).toBeVisible();

    await page.waitForFunction(() => {
      const store = (window as any).__store;
      return store.getState().project.tracks.length === 5;
    });

    const trackNames = await page.evaluate(() => {
      const store = (window as any).__store;
      return store.getState().project.tracks.map((track: { displayName: string }) => track.displayName);
    });

    expect(trackNames).toEqual(['Audio', 'Vocals', 'Drums', 'Bass', 'Other']);
  });
});
