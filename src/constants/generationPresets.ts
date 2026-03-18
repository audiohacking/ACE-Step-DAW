export interface GenerationPreset {
  id: string;
  name: string;
  category: PresetCategory;
  caption: string;
  lyricsTemplate: string;
  suggestedBpm: number;
  suggestedKey: string;
}

export type PresetCategory =
  | 'Pop'
  | 'Rock'
  | 'Jazz'
  | 'Electronic'
  | 'Hip-Hop'
  | 'Classical'
  | 'Lo-Fi'
  | 'Ambient';

export const PRESET_CATEGORIES: PresetCategory[] = [
  'Pop', 'Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Classical', 'Lo-Fi', 'Ambient',
];

export const GENERATION_PRESETS: GenerationPreset[] = [
  // Pop
  {
    id: 'pop-upbeat',
    name: 'Upbeat Pop',
    category: 'Pop',
    caption: 'upbeat pop song, catchy melody, bright synths, clean vocals, polished production',
    lyricsTemplate: '[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[bridge]\n\n[chorus]',
    suggestedBpm: 120,
    suggestedKey: 'C major',
  },
  {
    id: 'pop-ballad',
    name: 'Pop Ballad',
    category: 'Pop',
    caption: 'emotional pop ballad, piano-driven, soft vocals, strings arrangement, heartfelt',
    lyricsTemplate: '[verse]\n\n[pre-chorus]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[outro]',
    suggestedBpm: 72,
    suggestedKey: 'G major',
  },
  // Rock
  {
    id: 'rock-classic',
    name: 'Classic Rock',
    category: 'Rock',
    caption: 'classic rock, electric guitar riffs, powerful drums, bass groove, energetic',
    lyricsTemplate: '[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[guitar solo]\n\n[chorus]',
    suggestedBpm: 130,
    suggestedKey: 'E minor',
  },
  {
    id: 'rock-indie',
    name: 'Indie Rock',
    category: 'Rock',
    caption: 'indie rock, jangly guitars, lo-fi drums, dreamy reverb, alternative',
    lyricsTemplate: '[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[bridge]\n\n[chorus]',
    suggestedBpm: 118,
    suggestedKey: 'A major',
  },
  // Jazz
  {
    id: 'jazz-smooth',
    name: 'Smooth Jazz',
    category: 'Jazz',
    caption: 'smooth jazz, saxophone melody, walking bass, brushed drums, warm piano chords',
    lyricsTemplate: '[intro]\n\n[head]\n\n[solo]\n\n[head]\n\n[outro]',
    suggestedBpm: 95,
    suggestedKey: 'Bb major',
  },
  {
    id: 'jazz-bebop',
    name: 'Bebop',
    category: 'Jazz',
    caption: 'bebop jazz, fast tempo, complex harmonies, trumpet and saxophone, swinging rhythm',
    lyricsTemplate: '[head]\n\n[solo]\n\n[solo]\n\n[head]',
    suggestedBpm: 180,
    suggestedKey: 'F major',
  },
  // Electronic
  {
    id: 'electronic-house',
    name: 'House',
    category: 'Electronic',
    caption: 'house music, four-on-the-floor beat, deep bassline, synth pads, energetic drop',
    lyricsTemplate: '[intro]\n\n[build]\n\n[drop]\n\n[break]\n\n[drop]\n\n[outro]',
    suggestedBpm: 128,
    suggestedKey: 'A minor',
  },
  {
    id: 'electronic-synthwave',
    name: 'Synthwave',
    category: 'Electronic',
    caption: 'synthwave, retro 80s synths, arpeggiated bass, drum machine, neon atmosphere',
    lyricsTemplate: '[intro]\n\n[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[outro]',
    suggestedBpm: 110,
    suggestedKey: 'D minor',
  },
  // Hip-Hop
  {
    id: 'hiphop-boom-bap',
    name: 'Boom Bap',
    category: 'Hip-Hop',
    caption: 'boom bap hip-hop, vinyl crackle, chopped samples, hard-hitting drums, classic rap beat',
    lyricsTemplate: '[verse 1]\n\n[hook]\n\n[verse 2]\n\n[hook]\n\n[verse 3]\n\n[hook]',
    suggestedBpm: 90,
    suggestedKey: 'C minor',
  },
  {
    id: 'hiphop-trap',
    name: 'Trap',
    category: 'Hip-Hop',
    caption: 'trap beat, 808 bass, hi-hat rolls, dark atmosphere, heavy sub-bass, modern production',
    lyricsTemplate: '[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[bridge]\n\n[chorus]',
    suggestedBpm: 140,
    suggestedKey: 'F# minor',
  },
  // Classical
  {
    id: 'classical-orchestral',
    name: 'Orchestral',
    category: 'Classical',
    caption: 'orchestral composition, full symphony, strings, brass, woodwinds, timpani, cinematic',
    lyricsTemplate: '[exposition]\n\n[development]\n\n[recapitulation]\n\n[coda]',
    suggestedBpm: 100,
    suggestedKey: 'D major',
  },
  {
    id: 'classical-piano',
    name: 'Piano Sonata',
    category: 'Classical',
    caption: 'classical piano solo, expressive dynamics, romantic era style, rich harmonies',
    lyricsTemplate: '[theme A]\n\n[theme B]\n\n[development]\n\n[theme A reprise]',
    suggestedBpm: 80,
    suggestedKey: 'Eb major',
  },
  // Lo-Fi
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Chill',
    category: 'Lo-Fi',
    caption: 'lo-fi chill hip-hop, vinyl crackle, mellow piano, soft drums, tape saturation, relaxing',
    lyricsTemplate: '[loop A]\n\n[loop B]\n\n[loop A]\n\n[loop B]',
    suggestedBpm: 85,
    suggestedKey: 'F major',
  },
  {
    id: 'lofi-jazz',
    name: 'Lo-Fi Jazz',
    category: 'Lo-Fi',
    caption: 'lo-fi jazz, muted trumpet, Rhodes piano, gentle brushed drums, warm analog tone',
    lyricsTemplate: '[intro]\n\n[section A]\n\n[section B]\n\n[section A]\n\n[outro]',
    suggestedBpm: 78,
    suggestedKey: 'Db major',
  },
  // Ambient
  {
    id: 'ambient-space',
    name: 'Space Ambient',
    category: 'Ambient',
    caption: 'space ambient, ethereal pads, slow evolving textures, deep reverb, atmospheric drone',
    lyricsTemplate: '[texture A]\n\n[texture B]\n\n[texture A + B]\n\n[fade]',
    suggestedBpm: 60,
    suggestedKey: 'A minor',
  },
  {
    id: 'ambient-nature',
    name: 'Nature Ambient',
    category: 'Ambient',
    caption: 'nature ambient, organic textures, gentle acoustic guitar, birdsong, flowing water sounds, peaceful',
    lyricsTemplate: '[dawn]\n\n[day]\n\n[dusk]\n\n[night]',
    suggestedBpm: 65,
    suggestedKey: 'G major',
  },
];
