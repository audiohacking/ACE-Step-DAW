import { test } from '@playwright/test';

test.describe('Visual Regression Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof (window as any).__store !== 'undefined', null, { timeout: 10000 });
  });

  test('empty project screenshot', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Visual Regression Test' });
    });
    // Wait for UI to settle
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-screenshots/vr-empty-project.png', fullPage: true });
  });

  test('with tracks screenshot', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Visual Regression Test' });
      store.getState().addTrack('stems');
      store.getState().addTrack('sample');
      store.getState().addTrack('sequencer');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-screenshots/vr-with-tracks.png', fullPage: true });
  });

  test('mixer open screenshot', async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Visual Regression Test' });
      store.getState().addTrack('stems');
      store.getState().addTrack('sample');
      store.getState().addTrack('sequencer');
    });
    await page.waitForTimeout(500);
    // Press X to toggle mixer
    await page.keyboard.press('x');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-screenshots/vr-mixer-open.png', fullPage: true });
  });
});
