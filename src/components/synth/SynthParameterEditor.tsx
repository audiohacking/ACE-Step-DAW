import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { SynthEnvelope, SynthFilter, SynthLfo, FilterEnvelope, UnisonSettings } from '../../types/project';
import { ADSREnvelopeEditor } from './ADSREnvelopeEditor';
import { SynthFilterControls } from './SynthFilterControls';
import { FilterEnvelopeEditor, DEFAULT_FILTER_ENVELOPE } from './FilterEnvelopeEditor';
import { LFODisplay } from './LFODisplay';
import { UnisonControls } from './UnisonControls';
import { SoundDesignAssistant } from './SoundDesignAssistant';
import type { ParameterAdjustment } from '../../services/soundDesignAssistant';

const DEFAULT_ENVELOPE: SynthEnvelope = { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 };
const DEFAULT_FILTER: SynthFilter = { type: 'lowpass', frequency: 1000, Q: 1 };
const DEFAULT_LFO: SynthLfo = { rate: 1, depth: 0.5, shape: 'sine' };
const DEFAULT_UNISON: UnisonSettings = { voices: 1, detune: 0, spread: 0 };

interface SynthParameterEditorProps {
  trackId: string;
}

export function SynthParameterEditor({ trackId }: SynthParameterEditorProps) {
  const track = useProjectStore((s) => s.project?.tracks.find((t) => t.id === trackId));
  const updateSynthEnvelope = useProjectStore((s) => s.updateSynthEnvelope);
  const updateSynthFilter = useProjectStore((s) => s.updateSynthFilter);
  const updateSynthLfo = useProjectStore((s) => s.updateSynthLfo);
  const updateFilterEnvelope = useProjectStore((s) => s.updateFilterEnvelope);
  const updateUnisonSettings = useProjectStore((s) => s.updateUnisonSettings);

  const onEnvelopeChange = useCallback(
    (updates: Partial<SynthEnvelope>) => updateSynthEnvelope(trackId, updates),
    [trackId, updateSynthEnvelope],
  );
  const onFilterChange = useCallback(
    (updates: Partial<SynthFilter>) => updateSynthFilter(trackId, updates),
    [trackId, updateSynthFilter],
  );
  const onLfoChange = useCallback(
    (updates: Partial<SynthLfo>) => updateSynthLfo(trackId, updates),
    [trackId, updateSynthLfo],
  );
  const onFilterEnvelopeChange = useCallback(
    (updates: Partial<FilterEnvelope>) => updateFilterEnvelope(trackId, updates),
    [trackId, updateFilterEnvelope],
  );
  const onUnisonChange = useCallback(
    (updates: Partial<UnisonSettings>) => updateUnisonSettings(trackId, updates),
    [trackId, updateUnisonSettings],
  );

  const handleSoundDesignAdjustments = useCallback(
    (adjustments: ParameterAdjustment[]) => {
      const envelopeUpdates: Partial<SynthEnvelope> = {};
      const filterUpdates: Partial<SynthFilter> = {};
      const unisonUpdates: Partial<UnisonSettings> = {};

      for (const adj of adjustments) {
        if (adj.parameter === 'ampEnvelope.attack') {
          envelopeUpdates.attack = Math.max(0.001, (track?.synthEnvelope?.attack ?? DEFAULT_ENVELOPE.attack) + adj.delta);
        } else if (adj.parameter === 'ampEnvelope.decay') {
          envelopeUpdates.decay = Math.max(0.001, (track?.synthEnvelope?.decay ?? DEFAULT_ENVELOPE.decay) + adj.delta);
        } else if (adj.parameter === 'ampEnvelope.sustain') {
          envelopeUpdates.sustain = Math.max(0, Math.min(1, (track?.synthEnvelope?.sustain ?? DEFAULT_ENVELOPE.sustain) + adj.delta));
        } else if (adj.parameter === 'ampEnvelope.release') {
          envelopeUpdates.release = Math.max(0.001, (track?.synthEnvelope?.release ?? DEFAULT_ENVELOPE.release) + adj.delta);
        } else if (adj.parameter === 'filter.cutoffHz' || adj.parameter === 'filter.frequency') {
          filterUpdates.frequency = Math.max(20, Math.min(20000, (track?.synthFilter?.frequency ?? DEFAULT_FILTER.frequency) + adj.delta));
        } else if (adj.parameter === 'filter.resonance') {
          filterUpdates.Q = Math.max(0, Math.min(20, (track?.synthFilter?.Q ?? DEFAULT_FILTER.Q) + adj.delta));
        } else if (adj.parameter === 'unison.voices') {
          unisonUpdates.voices = Math.max(1, Math.min(8, (track?.unisonSettings?.voices ?? DEFAULT_UNISON.voices) + adj.delta));
        } else if (adj.parameter === 'unison.detuneCents' || adj.parameter === 'oscillator.detuneCents') {
          unisonUpdates.detune = Math.max(0, (track?.unisonSettings?.detune ?? DEFAULT_UNISON.detune) + adj.delta);
        } else if (adj.parameter === 'unison.spread') {
          unisonUpdates.spread = Math.max(0, Math.min(1, (track?.unisonSettings?.spread ?? DEFAULT_UNISON.spread) + adj.delta));
        }
      }

      if (Object.keys(envelopeUpdates).length > 0) updateSynthEnvelope(trackId, envelopeUpdates);
      if (Object.keys(filterUpdates).length > 0) updateSynthFilter(trackId, filterUpdates);
      if (Object.keys(unisonUpdates).length > 0) updateUnisonSettings(trackId, unisonUpdates);
    },
    [trackId, track, updateSynthEnvelope, updateSynthFilter, updateUnisonSettings],
  );

  if (!track) return null;

  const envelope = track.synthEnvelope ?? DEFAULT_ENVELOPE;
  const filter = track.synthFilter ?? DEFAULT_FILTER;
  const lfo = track.synthLfo ?? DEFAULT_LFO;
  const filterEnvelope = track.filterEnvelope ?? DEFAULT_FILTER_ENVELOPE;
  const unison = track.unisonSettings ?? DEFAULT_UNISON;

  return (
    <div className="flex flex-col gap-4 p-3 bg-[#222] rounded-lg border border-[#333]" data-track-id={trackId}>
      <div className="text-xs text-zinc-300 font-medium uppercase tracking-wider">
        Synth Parameters
      </div>
      <SoundDesignAssistant
        trackId={trackId}
        onApplyAdjustments={handleSoundDesignAdjustments}
      />
      <ADSREnvelopeEditor envelope={envelope} onChange={onEnvelopeChange} />
      <div className="h-px bg-[#333]" />
      <SynthFilterControls filter={filter} onChange={onFilterChange} />
      <div className="h-px bg-[#333]" />
      <FilterEnvelopeEditor envelope={filterEnvelope} onChange={onFilterEnvelopeChange} />
      <div className="h-px bg-[#333]" />
      <LFODisplay lfo={lfo} onChange={onLfoChange} />
      <div className="h-px bg-[#333]" />
      <UnisonControls settings={unison} onChange={onUnisonChange} />
    </div>
  );
}
