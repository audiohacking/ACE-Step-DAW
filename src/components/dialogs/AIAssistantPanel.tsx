import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { buildAssistantContext } from '../../utils/aiAssistantContext';
import type { AIChatMessage } from '../../types/aiAssistant';

const SYSTEM_PROMPT = `You are an AI music production assistant built into ACE-Step DAW. You help users with:
- Music production techniques and tips
- Explaining DAW features and how to use them
- Suggesting effects, mixing settings, and arrangement ideas
- Answering questions about music theory, genres, and instruments

You have context about the user's current project state. Be concise and practical.
Always relate advice to what the user is currently working on when possible.`;

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MessageBubble({ message }: { message: AIChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-[12px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-daw-accent/80 text-white'
            : 'bg-[#2a2a2a] text-zinc-200 border border-[#3a3a3a]'
        }`}
        data-message-role={message.role}
      >
        {message.content}
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const show = useUIStore((s) => s.showAIAssistant);
  const messages = useUIStore((s) => s.aiChatMessages);
  const streaming = useUIStore((s) => s.aiAssistantStreaming);
  const addMessage = useUIStore((s) => s.addAIChatMessage);
  const clearMessages = useUIStore((s) => s.clearAIChatMessages);
  const setStreaming = useUIStore((s) => s.setAIAssistantStreaming);
  const setShow = useUIStore((s) => s.setShowAIAssistant);
  const project = useProjectStore((s) => s.project);
  const expandedTrackId = useUIStore((s) => s.expandedTrackId);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg: AIChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');

    // Build context and generate response
    const context = buildAssistantContext(project, expandedTrackId);
    setStreaming(true);

    // Simulate assistant response (Phase 1: local knowledge base, no API call)
    // In Phase 2, this will be replaced with actual LLM API integration
    setTimeout(() => {
      const response = generateLocalResponse(trimmed, context);
      const assistantMsg: AIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      addMessage(assistantMsg);
      setStreaming(false);
    }, 300);
  }, [input, streaming, addMessage, setStreaming, project, expandedTrackId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!show) return null;

  return (
    <div
      className="fixed right-0 top-11 bottom-6 w-[340px] bg-[#1e1e1e] border-l border-[#333] flex flex-col z-50 shadow-xl"
      data-testid="ai-assistant-panel"
      role="complementary"
      aria-label="AI Assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-daw-accent">
            <circle cx="7" cy="7" r="5.5" />
            <path d="M5 6.5h4M5 8.5h2.5" strokeLinecap="round" />
            <circle cx="7" cy="4.5" r="0.8" fill="currentColor" />
          </svg>
          <span className="text-[12px] font-medium text-zinc-200">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded hover:bg-[#333] transition-colors"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" />
            </svg>
          </button>
          <button
            onClick={() => setShow(false)}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded hover:bg-[#333] transition-colors"
            title="Close (Escape)"
            aria-label="Close AI Assistant"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-[11px] mt-8 space-y-3">
            <div className="text-2xl">✨</div>
            <div className="font-medium text-zinc-400">AI Music Assistant</div>
            <div>Ask about production techniques, effects, mixing tips, or how to use DAW features.</div>
            <div className="space-y-1.5 mt-4">
              <SuggestionChip text="How do I make my drums punch harder?" onClick={(t) => { setInput(t); }} />
              <SuggestionChip text="Suggest effects for vocals" onClick={(t) => { setInput(t); }} />
              <SuggestionChip text="What BPM is good for lo-fi hip hop?" onClick={(t) => { setInput(t); }} />
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streaming && (
          <div className="flex justify-start mb-2">
            <div className="bg-[#2a2a2a] border border-[#3a3a3a] px-3 py-2 rounded-lg">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[#333] p-2">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about music production..."
            className="flex-1 bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-2 text-[12px] text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-daw-accent/50 transition-colors"
            rows={2}
            disabled={streaming}
            aria-label="Chat input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="self-end px-3 py-2 bg-daw-accent/80 hover:bg-daw-accent text-white text-[11px] font-medium rounded-lg disabled:opacity-30 disabled:hover:bg-daw-accent/80 transition-colors"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
        <div className="text-[10px] text-zinc-600 mt-1 px-1">
          Shift+Enter for new line · Phase 1: built-in knowledge
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="block w-full text-left px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-md transition-colors"
    >
      {text}
    </button>
  );
}

/**
 * Phase 1: Local knowledge-based response generation.
 * Matches keywords from the user's question against a built-in knowledge base.
 * Phase 2 will replace this with actual LLM API streaming.
 */
function generateLocalResponse(question: string, context: string): string {
  const q = question.toLowerCase();

  // Context-aware responses
  if (context.includes('No project loaded')) {
    return 'It looks like you don\'t have a project open yet. Create a new project first, then I can help you with production tips specific to your setup!';
  }

  // Effects & mixing
  if (q.includes('reverb')) {
    return 'Reverb adds space and depth to your sound. In ACE-Step DAW:\n\n1. Select the track you want to add reverb to\n2. Open the Effect Chain (click the FX button or use the mixer)\n3. Add a Reverb effect\n4. Adjust Decay (room size), Pre-Delay (space before reverb starts), and Wet mix\n\nTips:\n- Vocals: Use a medium room (decay 1.5-2.5s) with 20-30% wet\n- Drums: Short room reverb (0.5-1s) to add body without muddiness\n- Use pre-delay (20-50ms) to keep the original sound clear';
  }

  if (q.includes('compressor') || q.includes('compression')) {
    return 'Compression controls dynamic range — it makes loud parts quieter and quiet parts louder.\n\nKey parameters:\n- **Threshold**: Level where compression starts (lower = more compression)\n- **Ratio**: How much to compress (4:1 is a good starting point)\n- **Attack**: How fast compression kicks in (fast = tighter, slow = more punch)\n- **Release**: How fast compression lets go\n\nQuick settings:\n- Vocals: Threshold -18dB, Ratio 3:1, Attack 10ms, Release 100ms\n- Drums: Threshold -12dB, Ratio 4:1, Attack 1ms, Release 50ms\n- Bass: Threshold -15dB, Ratio 4:1, Attack 5ms, Release 80ms';
  }

  if (q.includes('eq') || q.includes('equaliz')) {
    return 'EQ shapes the tonal balance of your tracks.\n\nACE-Step DAW has a 3-band EQ and a parametric EQ on each track.\n\nCommon EQ moves:\n- **Cut muddy frequencies**: Reduce 200-400 Hz on non-bass instruments\n- **Add vocal presence**: Boost 2-5 kHz slightly\n- **Air and brightness**: Gentle boost at 10-12 kHz\n- **Kick drum punch**: Boost 60-80 Hz, cut 300 Hz, boost 3-5 kHz for click\n- **High-pass everything except kick/bass**: Set a filter at 80-100 Hz to remove rumble';
  }

  if (q.includes('effect') && q.includes('vocal')) {
    return 'Essential vocal effects chain:\n\n1. **EQ** — High-pass at 80 Hz, cut 200-300 Hz if muddy, boost 3-5 kHz for presence\n2. **Compressor** — Ratio 3:1, threshold to catch -6dB peaks, fast attack\n3. **Reverb** — Medium room, 20-30% wet, 30ms pre-delay\n4. **Delay** — Optional, 1/4 note, 15-20% wet for depth\n\nIn ACE-Step: Select the vocal track → open Effect Chain → add effects in this order.';
  }

  // BPM & genre
  if (q.includes('bpm') || q.includes('tempo')) {
    return 'Common BPM ranges by genre:\n\n- **Lo-fi Hip Hop**: 70-90 BPM\n- **Hip Hop / Trap**: 130-160 BPM (half-time feel)\n- **Pop**: 100-130 BPM\n- **House / EDM**: 120-130 BPM\n- **Drum & Bass**: 160-180 BPM\n- **Dubstep**: 140 BPM (half-time)\n- **R&B**: 60-80 BPM\n- **Rock**: 110-140 BPM\n\nYou can change BPM in the Settings dialog (Cmd+,) or click the BPM display in the toolbar.';
  }

  // Drums
  if (q.includes('drum') && (q.includes('punch') || q.includes('hard') || q.includes('hit'))) {
    return 'To make drums punch harder:\n\n1. **Compression**: Use fast attack (1-5ms) and medium release. Ratio 4:1-6:1\n2. **Transient shaping**: Boost the attack of kick and snare\n3. **EQ**: Boost kick at 60-80 Hz and 3-5 kHz (beater click). Boost snare at 200 Hz (body) and 5-7 kHz (crack)\n4. **Parallel compression**: Mix heavily compressed drums with the original\n5. **Saturation/Distortion**: Light distortion adds harmonics and perceived loudness\n6. **Sidechain**: Use the kick to duck other elements slightly\n\nIn ACE-Step: Add Compressor and Distortion effects to your drum track from the Effect Chain panel.';
  }

  // Mixing
  if (q.includes('mix') && (q.includes('tip') || q.includes('better') || q.includes('how'))) {
    return 'Mixing fundamentals:\n\n1. **Gain staging**: Keep individual tracks around -12 to -6 dBFS before summing\n2. **Start with the faders**: Set relative levels before adding effects\n3. **EQ to separate**: Give each instrument its own frequency space\n4. **Pan for width**: Spread instruments across the stereo field\n5. **Use high-pass filters**: On everything except kick and bass\n6. **Reference tracks**: Compare against professional mixes frequently\n7. **Take breaks**: Your ears fatigue — rest every 30-45 minutes\n\nACE-Step Mixer (X key) gives you faders, pan, and EQ for every track.';
  }

  // DAW-specific features
  if (q.includes('shortcut') || q.includes('keyboard')) {
    return 'Essential ACE-Step DAW shortcuts:\n\n- **Space**: Play/Pause\n- **Enter**: Stop/Return to start\n- **R**: Toggle recording\n- **X**: Toggle mixer\n- **B**: Smart controls\n- **Y**: Library panel\n- **N**: Toggle snap\n- **?**: Show all shortcuts\n- **Cmd+G**: Generate (batch)\n- **Cmd+Shift+G**: Context generation\n- **Cmd+Enter**: Generate selected clip\n- **Cmd+Z / Cmd+Shift+Z**: Undo/Redo';
  }

  if (q.includes('generate') || q.includes('ai') && q.includes('music')) {
    return 'ACE-Step AI music generation:\n\n1. **Add a track** (Cmd+Shift+I) — choose instrument type\n2. **Add a clip** — click on the timeline lane\n3. **Write a prompt** — describe the sound (e.g., "groovy bass line, funky, 120bpm")\n4. **Generate** — Cmd+Enter to generate the selected clip\n5. **Batch generate** — Cmd+G to generate multiple clips at once\n\nTips:\n- Be specific in prompts: genre, mood, tempo, instrument style\n- Use context generation (Cmd+Shift+G) to make new clips that match existing ones\n- Use "repaint" to partially regenerate sections you want to change';
  }

  // Fallback — still context-aware
  const trackInfo = context.includes('Selected track') ? '\n\nI can see you have a track selected — feel free to ask specific questions about it!' : '';
  return `I can help with music production questions! Here are some things I know about:\n\n- **Effects**: Reverb, compression, EQ, delay, distortion\n- **Mixing tips**: Gain staging, panning, frequency separation\n- **BPM/Genre guidance**: Tempo ranges for different genres\n- **ACE-Step features**: Shortcuts, AI generation, effects chain\n- **Music theory**: Chord progressions, scales, arrangement\n\nTry asking something specific like "How do I add reverb to vocals?" or "What BPM for lo-fi?"${trackInfo}`;
}
