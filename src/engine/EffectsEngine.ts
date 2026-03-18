import * as Tone from 'tone';
import type {
  TrackEffect,
  EQ3Params,
  CompressorParams,
  ReverbParams,
  DelayParams,
  DistortionParams,
  FilterParams,
} from '../types/project';

type EffectNode = {
  id: string;
  node: Tone.ToneAudioNode;
  lfo?: Tone.LFO;
};

function createNode(effect: TrackEffect): EffectNode {
  switch (effect.type) {
    case 'eq3': {
      const p = effect.params as EQ3Params;
      const node = new Tone.EQ3(p.low, p.mid, p.high);
      node.lowFrequency.value = p.lowFrequency;
      node.highFrequency.value = p.highFrequency;
      return { id: effect.id, node };
    }
    case 'compressor': {
      const p = effect.params as CompressorParams;
      return {
        id: effect.id,
        node: new Tone.Compressor({
          threshold: p.threshold,
          ratio: p.ratio,
          attack: p.attack,
          release: p.release,
          knee: p.knee,
        }),
      };
    }
    case 'reverb': {
      const p = effect.params as ReverbParams;
      return { id: effect.id, node: new Tone.Reverb({ decay: p.decay, preDelay: p.preDelay, wet: p.wet }) };
    }
    case 'delay': {
      const p = effect.params as DelayParams;
      return { id: effect.id, node: new Tone.FeedbackDelay({ delayTime: p.time, feedback: p.feedback, wet: p.wet }) };
    }
    case 'distortion': {
      const p = effect.params as DistortionParams;
      const amount = p.distortionType === 'overdrive' ? p.amount * 0.5 : p.distortionType === 'fuzz' ? Math.min(1, p.amount * 1.5) : p.amount;
      return { id: effect.id, node: new Tone.Distortion({ distortion: amount, wet: p.wet }) };
    }
    case 'filter': {
      const p = effect.params as FilterParams;
      const node = new Tone.Filter({ frequency: p.frequency, type: p.filterType, Q: p.resonance });
      const lfo = p.lfoEnabled
        ? new Tone.LFO({
            frequency: p.lfoRate,
            min: Math.max(20, p.frequency * (1 - p.lfoDepth)),
            max: Math.min(20000, p.frequency * (1 + p.lfoDepth)),
          }).start()
        : undefined;
      lfo?.connect(node.frequency);
      return { id: effect.id, node, lfo };
    }
  }
}

class EffectsEngine {
  private chains = new Map<string, EffectNode[]>();

  rebuildChain(trackId: string, effects: TrackEffect[]) {
    this.disposeChain(trackId);
    const activeEffects = effects.filter((effect) => effect.enabled);
    const nodes = activeEffects.map(createNode);
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].node.connect(nodes[i + 1].node);
    }
    this.chains.set(trackId, nodes);
  }

  updateParams(trackId: string, effects: TrackEffect[]) {
    this.rebuildChain(trackId, effects);
  }

  getChain(trackId: string): EffectNode[] {
    return this.chains.get(trackId) ?? [];
  }

  disposeChain(trackId: string) {
    const nodes = this.chains.get(trackId);
    if (!nodes) return;
    for (const node of nodes) {
      node.lfo?.dispose();
      node.node.dispose();
    }
    this.chains.delete(trackId);
  }

  dispose() {
    for (const trackId of this.chains.keys()) {
      this.disposeChain(trackId);
    }
  }
}

export const effectsEngine = new EffectsEngine();
