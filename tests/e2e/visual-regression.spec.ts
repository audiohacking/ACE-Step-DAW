import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(
      () => typeof (window as any).__store !== 'undefined',
      null,
      { timeout: 10000 }
    );
  });

  test('project with 3 tracks', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Visual Test' });
      store.getState().addTrack('drums');
      store.getState().addTrack('bass');
      store.getState().addTrack('keyboard', 'pianoRoll');
    });

    // Wait for tracks to render
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('project-3-tracks.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('mixer panel open', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Mixer Visual Test' });
      store.getState().addTrack('drums');
      store.getState().addTrack('bass');
      store.getState().addTrack('keyboard', 'pianoRoll');
    });

    // Wait for tracks to render
    await page.waitForTimeout(500);

    // Open mixer with X key
    await page.keyboard.press('x');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mixer-panel-open.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
