import { expect, test } from '@playwright/test';

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof (window as any).__store !== 'undefined');
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Assistant Test', bpm: 128 });
      const track = store.getState().addTrack('drums');
      (window as any).__uiStore.getState().setExpandedTrackId(track.id);
    });
    await page.mouse.click(24, 24);
  });

  test('opens with Cmd+/ and streams a context-aware production reply', async ({ page }) => {
    test.slow();

    await page.keyboard.press('Meta+/');
    await expect(page.getByRole('complementary', { name: 'AI Assistant' })).toBeVisible();

    await page.getByLabel('Chat input').fill('How do I make my drums punch harder?');
    await page.getByLabel('Send message').click();

    await page.waitForFunction(() => (window as any).__uiStore.getState().aiAssistantStreaming === true);

    await expect.poll(async () => (
      page.evaluate(() => {
        const messages = (window as any).__uiStore.getState().aiChatMessages;
        return messages[messages.length - 1]?.content.length ?? 0;
      })
    )).toBeGreaterThan(20);

    await page.waitForFunction(() => (window as any).__uiStore.getState().aiAssistantStreaming === false);

    const assistantReply = await page.evaluate(() => {
      const messages = (window as any).__uiStore.getState().aiChatMessages;
      return messages[messages.length - 1]?.content ?? '';
    });

    expect(assistantReply).toContain('128 BPM');
    expect(assistantReply.toLowerCase()).toContain('drum');
  });

  test('supports agent-driven questions through the exposed assistant store', async ({ page }) => {
    await page.evaluate(async () => {
      await (window as any).__assistantStore.getState().askAIAssistant(
        'What shortcuts are useful in the current workspace?',
        { delayMs: 0 },
      );
    });

    const reply = await page.evaluate(() => {
      const messages = (window as any).__assistantStore.getState().aiChatMessages;
      return messages[messages.length - 1]?.content ?? '';
    });

    expect(reply).toContain('Cmd+/');
    expect(reply).toContain('Mixer');
  });
});
