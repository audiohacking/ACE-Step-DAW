/**
 * Covered story ids:
 * - TRN-002
 *
 * Persona: keyboard-first user
 * Workflow summary: open the command palette, search, and execute commands from
 * the keyboard-centric action surface.
 * Why this test exists: this suite protects the command-surface branch of the
 * keyboard workflow stories.
 * Left to other layers: future story ids for deeper command semantics.
 */
import { expect, test } from '@playwright/test';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof (window as any).__store !== 'undefined');

    await page.evaluate(() => {
      const browserWindow = window as unknown as Record<string, unknown>;
      const projectStore = browserWindow.__store as {
        getState: () => {
          createProject: (params: { name: string; bpm: number }) => void;
          addTrack: (trackName: string) => { id: string };
        };
      };
      const uiStore = browserWindow.__uiStore as {
        getState: () => {
          setShowNewProjectDialog: (value: boolean) => void;
        };
      };

      projectStore.getState().createProject({ name: 'Command Palette Test', bpm: 120 });
      const vocalsTrack = projectStore.getState().addTrack('vocals');
      uiStore.getState().setShowNewProjectDialog(false);

      browserWindow.__commandPaletteTrackId = vocalsTrack.id;
    });

    await page.mouse.click(20, 20);
  });

  test('opens with keyboard and executes a natural-language effect command', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }));
    });
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

    const searchInput = page.getByRole('textbox', { name: 'Command palette search' });
    await searchInput.fill('add reverb to vocals');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden();

    const result = await page.evaluate(() => {
      const browserWindow = window as unknown as Record<string, unknown>;
      const projectStore = browserWindow.__store as {
        getState: () => {
          project: {
            tracks: Array<{ id: string; effects?: Array<{ type: string }> }>;
          };
        };
      };
      const trackId = browserWindow.__commandPaletteTrackId as string;
      const track = projectStore.getState().project.tracks.find((item) => item.id === trackId);
      return {
        effectCount: track?.effects?.length ?? 0,
        effectType: track?.effects?.[0]?.type ?? null,
      };
    });

    expect(result.effectCount).toBe(1);
    expect(result.effectType).toBe('reverb');
  });
});
