import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useGenerationStore } from '../../store/generationStore';
import { useUIStore } from '../../store/uiStore';
import { generateCoverClip } from '../../services/generationPipeline';
import { modelSupportsTaskType } from '../../services/aceStepApi';

type ConsistencyLevel = 'low' | 'medium' | 'high';
const CONSISTENCY_VALUES: Record<ConsistencyLevel, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
};

interface SessionEntry {
  id: string;
  label: string;
  clipId: string;
  timestamp: number;
}

interface ResultEntry {
  id: string;
  clipId: string;
  title: string;
  duration: string;
  timestamp: number;
}

export function CoverModal() {
  const coverClipId = useUIStore((s) => s.coverClipId);
  const setCoverModal = useUIStore((s) => s.setCoverModal);
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const getClipById = useProjectStore((s) => s.getClipById);
  const project = useProjectStore((s) => s.project);

  const clip = coverClipId ? getClipById(coverClipId) : null;
  const track = project?.tracks.find((t) => t.clips.some((c) => c.id === coverClipId)) ?? null;

  const [caption, setCaption] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [consistency, setConsistency] = useState<ConsistencyLevel>('medium');
  const [createNew, setCreateNew] = useState(true);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionCounterRef = useRef(0);

  // Reset form when clip changes
  useEffect(() => {
    if (clip) {
      setCaption(clip.prompt ?? '');
      setLyrics(clip.lyrics ?? '');
      setConsistency('medium');
      setCreateNew(true);
      // Create initial session
      const sessionId = `session-${Date.now()}`;
      sessionCounterRef.current = 1;
      setSessions([{
        id: sessionId,
        label: 'Enhancement 1',
        clipId: coverClipId!,
        timestamp: Date.now(),
      }]);
      setActiveSessionId(sessionId);
      setResults([]);
    }
  }, [coverClipId]);

  const onClose = useCallback(() => setCoverModal(null), [setCoverModal]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleNewSession = useCallback(() => {
    sessionCounterRef.current += 1;
    const sessionId = `session-${Date.now()}`;
    const entry: SessionEntry = {
      id: sessionId,
      label: `Enhancement ${sessionCounterRef.current}`,
      clipId: coverClipId!,
      timestamp: Date.now(),
    };
    setSessions((prev) => [entry, ...prev]);
    setActiveSessionId(sessionId);
    setCaption(clip?.prompt ?? '');
    setLyrics(clip?.lyrics ?? '');
    setConsistency('medium');
    setResults([]);
  }, [coverClipId, clip]);

  const handleGenerate = useCallback(async () => {
    if (!coverClipId || isGenerating) return;

    const coverStrength = CONSISTENCY_VALUES[consistency];

    // Add result entry optimistically
    const resultId = `result-${Date.now()}`;
    setResults((prev) => [...prev, {
      id: resultId,
      clipId: coverClipId,
      title: caption || 'Untitled enhancement',
      duration: '--:--',
      timestamp: Date.now(),
    }]);

    await generateCoverClip({ clipId: coverClipId, caption, lyrics, coverStrength, createNew });
  }, [coverClipId, caption, lyrics, consistency, createNew, isGenerating]);

  if (!coverClipId || !clip || !track) return null;

  const hasAudio = !!(clip.isolatedAudioKey || clip.cumulativeMixKey);
  const coverSupported = modelSupportsTaskType('cover');
  const canGenerate = hasAudio && coverSupported && !isGenerating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-testid="cover-modal"
        className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl shadow-2xl w-[820px] max-h-[85vh] flex text-xs text-zinc-200 overflow-hidden"
      >
        {/* Left Sidebar — Session History */}
        <div className="w-[160px] min-w-[160px] border-r border-[#2a2a2e] flex flex-col bg-[#161618]">
          <div className="px-3 pt-3 pb-2">
            <button
              data-testid="new-session-btn"
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a2a2e] hover:bg-[#333338] text-zinc-300 text-[11px] font-medium transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              New Enhancement
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-[11px] transition-colors truncate ${
                  s.id === activeSessionId
                    ? 'bg-[#2a2a2e] text-zinc-100'
                    : 'text-zinc-500 hover:bg-[#222226] hover:text-zinc-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Panel — Controls */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-[#2a2a2e]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Music Enhancer</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-teal-700/60 text-teal-200">
                Cover
              </span>
            </div>
            <button
              data-testid="cover-modal-close"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors text-base leading-none"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {/* Source audio preview */}
            <div className="bg-[#222226] rounded-lg px-3 py-3 border border-[#2e2e32]">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Source</p>
              <div className="flex items-center gap-2">
                <button
                  data-testid="source-play-btn"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-[#2a2a2e] text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label="Play source"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-zinc-200 truncate">
                    {track.displayName ?? track.trackName}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">{clip.prompt || '(no prompt)'}</p>
                </div>
              </div>
              {/* Waveform placeholder */}
              <div className="mt-2 h-10 bg-[#1a1a1e] rounded flex items-center justify-center">
                <div className="flex items-end gap-px h-6">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-teal-600/40 rounded-sm"
                      style={{ height: `${Math.max(2, Math.sin(i * 0.3) * 16 + Math.random() * 8)}px` }}
                    />
                  ))}
                </div>
              </div>
              {!hasAudio && (
                <p className="text-[10px] text-amber-400 mt-2">
                  No audio generated yet — generate the clip first before enhancing.
                </p>
              )}
              {!coverSupported && (
                <p className="text-[10px] text-amber-400 mt-2">
                  The currently loaded model does not support cover generation.
                </p>
              )}
            </div>

            {/* Lyrics */}
            <div>
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
                Lyrics
              </label>
              <textarea
                data-testid="lyrics-input"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Override lyrics for this enhancement..."
                rows={4}
                className="w-full bg-[#222226] border border-[#2e2e32] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-teal-500/60 font-mono"
              />
            </div>

            {/* Styles (caption) */}
            <div>
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
                Styles
              </label>
              <textarea
                data-testid="styles-input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. jazz arrangement, acoustic guitar, slow tempo..."
                rows={3}
                className="w-full bg-[#222226] border border-[#2e2e32] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-teal-500/60"
              />
            </div>

            {/* Consistency with selection */}
            <div>
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
                Consistency with selection
              </label>
              <div className="flex gap-1" data-testid="consistency-toggle">
                {(['low', 'medium', 'high'] as ConsistencyLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setConsistency(level)}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-medium capitalize transition-colors ${
                      consistency === level
                        ? 'bg-teal-600 text-white'
                        : 'bg-[#222226] text-zinc-500 hover:bg-[#2a2a2e] hover:text-zinc-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Create new vs replace */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createNew}
                  onChange={(e) => setCreateNew(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#444] bg-[#222] accent-teal-500"
                />
                <span className="text-[10px] text-zinc-400">Create new clip (leave original intact)</span>
              </label>
            </div>

            {/* Enhance button */}
            <button
              data-testid="enhance-btn"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                canGenerate
                  ? 'bg-teal-600 hover:bg-teal-500 text-white'
                  : 'bg-[#2a2a2e] text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? 'Enhancing...' : 'Enhance'}
            </button>
          </div>
        </div>

        {/* Right Panel — Results */}
        <div className="w-[240px] min-w-[240px] flex flex-col bg-[#161618]">
          <div className="px-3 py-3 border-b border-[#2a2a2e]">
            <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">Results</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1" data-testid="results-list">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <svg className="w-8 h-8 text-zinc-700 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <p className="text-[11px] text-zinc-600">
                  Enhanced results will appear here
                </p>
              </div>
            ) : (
              results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-[#222226] transition-colors group"
                >
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[#2a2a2e] text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
                    aria-label="Play result"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-300 truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-600">{r.duration}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
                    aria-label="More options"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Mini player */}
          {results.length > 0 && (
            <div className="border-t border-[#2a2a2e] px-3 py-2.5" data-testid="mini-player">
              <div className="flex items-center gap-2">
                <button className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Previous">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>
                <button className="text-zinc-300 hover:text-white transition-colors" aria-label="Play">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <button className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Next">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 18h2V6h-2zm-2-6L5.5 6v12z" /></svg>
                </button>
                <div className="flex-1 mx-1.5">
                  <div className="h-1 bg-[#2a2a2e] rounded-full">
                    <div className="h-1 bg-teal-600 rounded-full w-0" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
