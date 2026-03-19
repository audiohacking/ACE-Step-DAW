import type { Project, Track, TrackEffectType, TrackName, TrackType } from '../types/project';

export interface CommandPaletteCommand {
  id: string;
  title: string;
  section: string;
  subtitle?: string;
  shortcut?: string[];
  keywords: string[];
  aliases: string[];
  execute: () => void | Promise<void>;
}

export interface CommandPaletteSearchResult extends CommandPaletteCommand {
  score: number;
  isRecent: boolean;
}

export interface CommandPaletteContext {
  project: Project | null;
  selectedClipIds: string[];
  currentTime: number;
  isPlaying: boolean;
  showMixer: boolean;
  showLibrary: boolean;
  showSmartControls: boolean;
  showAIAssistant: boolean;
  loopBrowserOpen: boolean;
  showTempoLane: boolean;
  loopEnabled: boolean;
  metronomeEnabled: boolean;
  expandedTrackId: string | null;
  openPianoRollTrackId: string | null;
  openSequencerTrackId: string | null;
  openDrumMachineTrackId: string | null;
  actions: {
    play: () => void | Promise<void>;
    pause: () => void | Promise<void>;
    stop: () => void | Promise<void>;
    toggleLoop: () => void;
    toggleMetronome: () => void;
    setShowNewProjectDialog: (v: boolean) => void;
    setShowProjectListDialog: (v: boolean) => void;
    setShowSettingsDialog: (v: boolean) => void;
    setShowExportDialog: (v: boolean) => void;
    setShowKeyboardShortcutsDialog: (v: boolean) => void;
    setShowLibrary: (v: boolean) => void;
    setShowMixer: (v: boolean) => void;
    setShowSmartControls: (v: boolean) => void;
    toggleLoopBrowser: () => void;
    toggleTempoLane: () => void;
    toggleAIAssistant: () => void;
    setBatchGenerateMode: (mode: 'silence' | 'context' | null) => void;
    addTrack: (trackName: TrackName, trackType?: TrackType) => Track;
    addTrackEffect: (trackId: string, type: TrackEffectType) => string | undefined;
    updateProject: (updates: Partial<Pick<Project, 'bpm'>>) => void;
    duplicateClip: (clipId: string) => void;
    splitClip: (clipId: string, splitTime: number) => void;
    removeClip: (clipId: string) => void;
    setEditingClip: (clipId: string | null) => void;
    deselectAll: () => void;
  };
}

const DEFAULT_RESULT_LIMIT = 12;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value).split(' ').filter(Boolean);
}

function buildSearchCorpus(command: CommandPaletteCommand): string {
  return normalize([
    command.title,
    command.section,
    command.subtitle ?? '',
    ...command.keywords,
    ...command.aliases,
  ].join(' '));
}

function getTrackForSelection(context: CommandPaletteContext): Track | null {
  const project = context.project;
  if (!project) return null;

  const candidateTrackId =
    context.openPianoRollTrackId ??
    context.openSequencerTrackId ??
    context.openDrumMachineTrackId ??
    context.expandedTrackId;

  if (candidateTrackId) {
    return project.tracks.find((track) => track.id === candidateTrackId) ?? null;
  }

  const selectedClipId = context.selectedClipIds[0];
  if (!selectedClipId) return null;

  return project.tracks.find((track) => track.clips.some((clip) => clip.id === selectedClipId)) ?? null;
}

function createTrackCommand(
  id: string,
  title: string,
  section: string,
  keywords: string[],
  aliases: string[],
  execute: () => void | Promise<void>,
  shortcut?: string[],
  subtitle?: string,
): CommandPaletteCommand {
  return {
    id,
    title,
    section,
    subtitle,
    shortcut,
    keywords,
    aliases,
    execute,
  };
}

function buildTempoCommand(context: CommandPaletteContext, bpm: number): CommandPaletteCommand | null {
  if (!context.project) return null;
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240) return null;

  return createTrackCommand(
    `project:set-tempo:${bpm}`,
    `Set Tempo to ${bpm} BPM`,
    'Project',
    ['tempo', 'bpm', 'project setting', String(bpm)],
    [`tempo ${bpm}`, `bpm ${bpm}`, `set tempo to ${bpm}`, `set bpm to ${bpm}`],
    () => context.actions.updateProject({ bpm }),
    undefined,
    'Project setting',
  );
}

function parseTempoCommand(query: string, context: CommandPaletteContext): CommandPaletteCommand[] {
  const normalized = normalize(query);
  const match = normalized.match(/\b(?:tempo|bpm)(?:\s+to)?\s+(\d{2,3})\b/);
  if (!match) return [];

  const bpm = Number(match[1]);
  const command = buildTempoCommand(context, bpm);
  return command ? [command] : [];
}

export function buildCommandPaletteCommands(context: CommandPaletteContext): CommandPaletteCommand[] {
  const commands: CommandPaletteCommand[] = [];

  commands.push(
    createTrackCommand(
      'transport:play-pause',
      context.isPlaying ? 'Pause Playback' : 'Play Playback',
      'Transport',
      ['transport', 'play', 'pause', 'spacebar'],
      ['start playback', 'pause transport', 'toggle transport'],
      () => {
        if (context.isPlaying) {
          void context.actions.pause();
        } else {
          void context.actions.play();
        }
      },
      ['Space'],
      'Transport control',
    ),
    createTrackCommand(
      'transport:stop',
      'Stop Playback',
      'Transport',
      ['transport', 'stop', 'rewind'],
      ['stop transport', 'go to start', 'rewind to start'],
      () => {
        void context.actions.stop();
      },
      ['Enter'],
      'Transport control',
    ),
    createTrackCommand(
      'transport:toggle-loop',
      context.loopEnabled ? 'Disable Loop' : 'Enable Loop',
      'Transport',
      ['transport', 'loop', 'cycle'],
      ['toggle loop', 'toggle cycle', 'cycle playback'],
      context.actions.toggleLoop,
      ['L'],
      'Transport control',
    ),
    createTrackCommand(
      'transport:toggle-metronome',
      context.metronomeEnabled ? 'Disable Metronome' : 'Enable Metronome',
      'Transport',
      ['transport', 'metronome', 'click'],
      ['toggle metronome', 'click track', 'count in click'],
      context.actions.toggleMetronome,
      ['K'],
      'Transport control',
    ),
  );

  commands.push(
    createTrackCommand(
      'project:new',
      'New Project',
      'Project',
      ['project', 'new', 'create'],
      ['create project', 'start new song'],
      () => context.actions.setShowNewProjectDialog(true),
      ['Cmd', 'N'],
      'Project dialog',
    ),
    createTrackCommand(
      'project:open',
      'Open Project List',
      'Project',
      ['project', 'open', 'recent'],
      ['show projects', 'project browser', 'open recent project'],
      () => context.actions.setShowProjectListDialog(true),
      ['Cmd', 'O'],
      'Project dialog',
    ),
    createTrackCommand(
      'project:settings',
      'Open Settings',
      'Project',
      ['settings', 'preferences', 'project'],
      ['preferences', 'project settings'],
      () => context.actions.setShowSettingsDialog(true),
      ['Cmd', ','],
      'Project dialog',
    ),
    createTrackCommand(
      'project:export',
      'Open Export Dialog',
      'Project',
      ['export', 'bounce', 'render'],
      ['export project', 'render mix', 'bounce song'],
      () => context.actions.setShowExportDialog(true),
      ['Cmd', 'Shift', 'E'],
      'Project dialog',
    ),
    createTrackCommand(
      'project:shortcuts',
      'Show Keyboard Shortcuts',
      'Project',
      ['shortcuts', 'help', 'keyboard'],
      ['shortcut help', 'show hotkeys', 'help overlay'],
      () => context.actions.setShowKeyboardShortcutsDialog(true),
      ['?'],
      'Help dialog',
    ),
  );

  commands.push(
    createTrackCommand(
      'panel:library',
      context.showLibrary ? 'Hide Library' : 'Show Library',
      'Panels',
      ['panel', 'library', 'browser'],
      ['toggle library', 'open library'],
      () => context.actions.setShowLibrary(!context.showLibrary),
      ['Y'],
      'Panel toggle',
    ),
    createTrackCommand(
      'panel:mixer',
      context.showMixer ? 'Hide Mixer' : 'Show Mixer',
      'Panels',
      ['panel', 'mixer', 'volume'],
      ['toggle mixer', 'open mixer', 'show levels'],
      () => context.actions.setShowMixer(!context.showMixer),
      ['X'],
      'Panel toggle',
    ),
    createTrackCommand(
      'panel:smart-controls',
      context.showSmartControls ? 'Hide Smart Controls' : 'Show Smart Controls',
      'Panels',
      ['panel', 'smart controls', 'controls'],
      ['toggle smart controls', 'open smart controls'],
      () => context.actions.setShowSmartControls(!context.showSmartControls),
      ['B'],
      'Panel toggle',
    ),
    createTrackCommand(
      'panel:loop-browser',
      context.loopBrowserOpen ? 'Hide Loop Browser' : 'Show Loop Browser',
      'Panels',
      ['panel', 'loop browser', 'loops', 'samples'],
      ['toggle loop browser', 'open loops', 'show sample browser'],
      context.actions.toggleLoopBrowser,
      ['O'],
      'Panel toggle',
    ),
    createTrackCommand(
      'panel:tempo-lane',
      context.showTempoLane ? 'Hide Tempo Lane' : 'Show Tempo Lane',
      'Panels',
      ['panel', 'tempo lane', 'tempo', 'automation'],
      ['toggle tempo lane', 'open tempo lane'],
      context.actions.toggleTempoLane,
      ['T'],
      'Panel toggle',
    ),
    createTrackCommand(
      'panel:ai-assistant',
      context.showAIAssistant ? 'Hide AI Assistant' : 'Show AI Assistant',
      'Panels',
      ['panel', 'assistant', 'ai', 'help'],
      ['toggle ai assistant', 'open ai assistant', 'assistant help'],
      context.actions.toggleAIAssistant,
      ['Cmd', '/'],
      'Panel toggle',
    ),
  );

  commands.push(
    createTrackCommand(
      'generation:silence',
      'Generate from Silence',
      'Generation',
      ['generate', 'ai', 'silence', 'clip'],
      ['generate clip', 'ai generate', 'create clip from silence'],
      () => context.actions.setBatchGenerateMode('silence'),
      ['Cmd', 'G'],
      'AI generation',
    ),
    createTrackCommand(
      'generation:context',
      'Generate from Context',
      'Generation',
      ['generate', 'ai', 'context', 'clip'],
      ['generate from context', 'continue idea', 'ai continue region'],
      () => context.actions.setBatchGenerateMode('context'),
      ['Cmd', 'Shift', 'G'],
      'AI generation',
    ),
  );

  commands.push(
    createTrackCommand(
      'track:add-drums',
      'Add Drums Track',
      'Tracks',
      ['track', 'add', 'drums', 'beat'],
      ['new drums track', 'add drum track', 'create drum track'],
      () => {
        context.actions.addTrack('drums');
      },
      undefined,
      'Track action',
    ),
    createTrackCommand(
      'track:add-bass',
      'Add Bass Track',
      'Tracks',
      ['track', 'add', 'bass'],
      ['new bass track', 'create bass track'],
      () => {
        context.actions.addTrack('bass');
      },
      undefined,
      'Track action',
    ),
    createTrackCommand(
      'track:add-piano',
      'Add Piano Track',
      'Tracks',
      ['track', 'add', 'piano', 'keys', 'midi'],
      ['new piano track', 'create piano track', 'add keyboard track'],
      () => {
        context.actions.addTrack('keyboard', 'pianoRoll');
      },
      undefined,
      'Track action',
    ),
    createTrackCommand(
      'track:add-sampler',
      'Add Sampler Track',
      'Tracks',
      ['track', 'add', 'sampler', 'instrument'],
      ['new sampler track', 'create sampler track'],
      () => {
        context.actions.addTrack('keyboard', 'pianoRoll');
      },
      undefined,
      'Track action',
    ),
    createTrackCommand(
      'track:add-drum-machine',
      'Add Drum Machine Track',
      'Tracks',
      ['track', 'add', 'drum machine', 'sequencer'],
      ['new drum machine', 'create drum machine track'],
      () => {
        context.actions.addTrack('drums', 'drumMachine');
      },
      undefined,
      'Track action',
    ),
  );

  const selectedClipId = context.selectedClipIds[0];
  if (selectedClipId) {
    commands.push(
      createTrackCommand(
        'clip:duplicate-selected',
        'Duplicate Selected Clip',
        'Clips',
        ['clip', 'duplicate', 'selected'],
        ['copy selected clip', 'duplicate current clip'],
        () => context.actions.duplicateClip(selectedClipId),
        ['Cmd', 'D'],
        'Selected clip action',
      ),
      createTrackCommand(
        'clip:split-selected',
        'Split Selected Clip at Playhead',
        'Clips',
        ['clip', 'split', 'selected', 'playhead'],
        ['cut selected clip', 'split current clip'],
        () => context.actions.splitClip(selectedClipId, context.currentTime),
        ['S'],
        'Selected clip action',
      ),
      createTrackCommand(
        'clip:edit-selected',
        'Edit Selected Clip',
        'Clips',
        ['clip', 'edit', 'selected', 'piano roll'],
        ['open clip editor', 'edit current clip'],
        () => context.actions.setEditingClip(selectedClipId),
        ['E'],
        'Selected clip action',
      ),
    );
  }

  if (context.selectedClipIds.length > 0) {
    commands.push(
      createTrackCommand(
        'clip:delete-selected',
        'Delete Selected Clips',
        'Clips',
        ['clip', 'delete', 'remove', 'selected'],
        ['remove selected clips', 'delete current clips'],
        () => {
          const ids = [...context.selectedClipIds];
          context.actions.deselectAll();
          ids.forEach((clipId) => context.actions.removeClip(clipId));
        },
        ['Delete'],
        'Selected clip action',
      ),
    );
  }

  const selectedTrack = getTrackForSelection(context);
  const tracks = context.project?.tracks ?? [];
  for (const track of tracks) {
    const trackName = track.displayName.toLowerCase();
    const selectedKeywords = selectedTrack?.id === track.id ? ['selected track', 'focused track'] : [];
    const effectDefs: { type: TrackEffectType; label: string; aliases: string[] }[] = [
      {
        type: 'reverb',
        label: 'Reverb',
        aliases: [`add reverb to ${trackName}`, `${trackName} reverb`, `put reverb on ${trackName}`],
      },
      {
        type: 'delay',
        label: 'Delay',
        aliases: [`add delay to ${trackName}`, `${trackName} delay`, `echo ${trackName}`],
      },
      {
        type: 'compressor',
        label: 'Compressor',
        aliases: [`add compressor to ${trackName}`, `compress ${trackName}`, `${trackName} compression`],
      },
      {
        type: 'parametricEq',
        label: 'Parametric EQ',
        aliases: [`add eq to ${trackName}`, `${trackName} eq`, `equalize ${trackName}`],
      },
    ];

    for (const effect of effectDefs) {
      commands.push(
        createTrackCommand(
          `track:${track.id}:effect:${effect.type}`,
          `Add ${effect.label} to ${track.displayName}`,
          'Effects',
          ['effect', effect.label.toLowerCase(), track.displayName, trackName, 'track', ...selectedKeywords],
          effect.aliases,
          () => {
            context.actions.addTrackEffect(track.id, effect.type);
          },
          undefined,
          `Track effect on ${track.displayName}`,
        ),
      );
    }
  }

  return commands;
}

export function searchCommandPaletteCommands(
  query: string,
  commands: CommandPaletteCommand[],
  recentCommandIds: string[],
  extraCommands: CommandPaletteCommand[] = [],
  limit = DEFAULT_RESULT_LIMIT,
): CommandPaletteSearchResult[] {
  const normalizedQuery = normalize(query);
  const queryTokens = tokenize(query);
  const recencyOrder = new Map(recentCommandIds.map((id, index) => [id, index]));
  const seen = new Set<string>();
  const allCommands = [...extraCommands, ...commands].filter((command) => {
    if (seen.has(command.id)) return false;
    seen.add(command.id);
    return true;
  });

  const scored = allCommands
    .map((command) => {
      const corpus = buildSearchCorpus(command);
      const aliasCorpus = normalize(command.aliases.join(' '));
      const title = normalize(command.title);
      const isRecent = recencyOrder.has(command.id);
      let score = isRecent ? 40 - (recencyOrder.get(command.id) ?? 0) : 0;

      if (!normalizedQuery) {
        score += command.section === 'Transport' ? 4 : 0;
      } else {
        if (title === normalizedQuery || command.aliases.some((alias) => normalize(alias) === normalizedQuery)) {
          score += 120;
        } else if (title.startsWith(normalizedQuery)) {
          score += 95;
        } else if (title.includes(normalizedQuery)) {
          score += 80;
        }

        if (aliasCorpus.includes(normalizedQuery)) {
          score += 70;
        }

        let matchedTokens = 0;
        for (const token of queryTokens) {
          if (corpus.includes(token)) {
            matchedTokens += 1;
            score += 12;
          }
        }

        if (queryTokens.length > 0 && matchedTokens === queryTokens.length) {
          score += 40;
        } else if (matchedTokens === 0) {
          score = 0;
        }
      }

      return { ...command, score, isRecent };
    })
    .filter((command) => command.score > 0 || !normalizedQuery)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aRecency = recencyOrder.get(a.id);
      const bRecency = recencyOrder.get(b.id);
      if (aRecency !== undefined && bRecency !== undefined && aRecency !== bRecency) {
        return aRecency - bRecency;
      }
      if (aRecency !== undefined) return -1;
      if (bRecency !== undefined) return 1;

      return a.title.localeCompare(b.title);
    });

  return scored.slice(0, limit);
}

export function searchCommandsForQuery(
  query: string,
  context: CommandPaletteContext,
  recentCommandIds: string[],
  limit = DEFAULT_RESULT_LIMIT,
): CommandPaletteSearchResult[] {
  const commands = buildCommandPaletteCommands(context);
  const extraCommands = parseTempoCommand(query, context);
  return searchCommandPaletteCommands(query, commands, recentCommandIds, extraCommands, limit);
}
