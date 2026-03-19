import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from '../../src/store/projectStore';
import { buildAssistantContext } from '../../src/utils/aiAssistantContext';
import {
  generateAssistantResponse,
  getAssistantSuggestions,
  streamAssistantResponse,
} from '../../src/services/aiAssistantService';

describe('aiAssistantService', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
  });

  it('generates drum-specific suggestions for a focused drum track', () => {
    useProjectStore.getState().createProject({ name: 'Drum Context', bpm: 126 });
    const track = useProjectStore.getState().addTrack('drums');

    const context = buildAssistantContext(useProjectStore.getState().project, {
      expandedTrackId: track.id,
      showMixer: true,
    });

    expect(getAssistantSuggestions(context)[0]?.toLowerCase()).toContain('drum');
  });

  it('uses project context in the generated response', () => {
    useProjectStore.getState().createProject({ name: 'Context Song', bpm: 122 });
    const track = useProjectStore.getState().addTrack('drums');

    const context = buildAssistantContext(useProjectStore.getState().project, {
      expandedTrackId: track.id,
      showMixer: true,
      showAIAssistant: true,
    });

    const response = generateAssistantResponse('How should I balance this mix?', context);

    expect(response).toContain('Context Song');
    expect(response).toContain('122 BPM');
    expect(response).toContain('Mixer');
  });

  it('streams replies in multiple chunks', async () => {
    useProjectStore.getState().createProject({ name: 'Stream Song', bpm: 128 });
    const track = useProjectStore.getState().addTrack('drums');

    const context = buildAssistantContext(useProjectStore.getState().project, {
      expandedTrackId: track.id,
    });

    const chunks: string[] = [];
    for await (const chunk of streamAssistantResponse('How do I make my drums punch harder?', context, 0)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.join('')).toContain('128 BPM');
    expect(chunks.join('').toLowerCase()).toContain('drum');
  });
});
