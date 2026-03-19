import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../src/store/uiStore';
import { useProjectStore } from '../../src/store/projectStore';
import { buildAssistantContext } from '../../src/utils/aiAssistantContext';
import type { AIChatMessage } from '../../src/types/aiAssistant';

describe('AI Assistant', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState(useUIStore.getInitialState(), true);
  });

  describe('uiStore — assistant panel state', () => {
    it('assistant panel is closed by default', () => {
      expect(useUIStore.getState().showAIAssistant).toBe(false);
    });

    it('toggles assistant panel open/closed', () => {
      useUIStore.getState().toggleAIAssistant();
      expect(useUIStore.getState().showAIAssistant).toBe(true);

      useUIStore.getState().toggleAIAssistant();
      expect(useUIStore.getState().showAIAssistant).toBe(false);
    });

    it('sets assistant panel visibility directly', () => {
      useUIStore.getState().setShowAIAssistant(true);
      expect(useUIStore.getState().showAIAssistant).toBe(true);

      useUIStore.getState().setShowAIAssistant(false);
      expect(useUIStore.getState().showAIAssistant).toBe(false);
    });

    it('manages chat messages', () => {
      expect(useUIStore.getState().aiChatMessages).toEqual([]);

      const msg: AIChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'How do I add reverb?',
        timestamp: Date.now(),
      };
      useUIStore.getState().addAIChatMessage(msg);
      expect(useUIStore.getState().aiChatMessages).toHaveLength(1);
      expect(useUIStore.getState().aiChatMessages[0].content).toBe('How do I add reverb?');

      const reply: AIChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'You can add reverb from the effects chain.',
        timestamp: Date.now(),
      };
      useUIStore.getState().addAIChatMessage(reply);
      expect(useUIStore.getState().aiChatMessages).toHaveLength(2);
    });

    it('clears chat messages', () => {
      useUIStore.getState().addAIChatMessage({
        id: 'msg-1',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
      });
      useUIStore.getState().clearAIChatMessages();
      expect(useUIStore.getState().aiChatMessages).toEqual([]);
    });

    it('tracks streaming state', () => {
      expect(useUIStore.getState().aiAssistantStreaming).toBe(false);

      useUIStore.getState().setAIAssistantStreaming(true);
      expect(useUIStore.getState().aiAssistantStreaming).toBe(true);

      useUIStore.getState().setAIAssistantStreaming(false);
      expect(useUIStore.getState().aiAssistantStreaming).toBe(false);
    });

    it('persists assistant panel open state', () => {
      useUIStore.getState().setShowAIAssistant(true);
      // Partialize should include showAIAssistant
      const persisted = JSON.parse(localStorage.getItem('ace-step-daw-ui') || '{}');
      expect(persisted.state.showAIAssistant).toBe(true);
    });
  });

  describe('buildAssistantContext', () => {
    it('returns minimal context when no project is loaded', () => {
      const ctx = buildAssistantContext(null, null);
      expect(ctx).toContain('No project loaded');
    });

    it('includes project info in context', () => {
      useProjectStore.getState().createProject({ name: 'My Song', bpm: 128 });
      const project = useProjectStore.getState().project;
      const ctx = buildAssistantContext(project, null);
      expect(ctx).toContain('My Song');
      expect(ctx).toContain('128');
    });

    it('includes selected track details when provided', () => {
      useProjectStore.getState().createProject({ name: 'Track Test' });
      const track = useProjectStore.getState().addTrack('drums');
      const project = useProjectStore.getState().project;
      const ctx = buildAssistantContext(project, track.id);
      expect(ctx).toContain('Drums');
      expect(ctx).toContain('Selected track');
    });

    it('includes effect chain info for selected track', () => {
      useProjectStore.getState().createProject({ name: 'FX Test' });
      const track = useProjectStore.getState().addTrack('vocals');
      useProjectStore.getState().addTrackEffect(track.id, 'reverb');
      const project = useProjectStore.getState().project;
      const ctx = buildAssistantContext(project, track.id);
      expect(ctx).toContain('reverb');
    });
  });
});
