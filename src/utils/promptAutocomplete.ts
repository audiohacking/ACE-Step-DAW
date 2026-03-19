export type PromptAutocompleteCategory = 'genre' | 'instrument' | 'mood' | 'technique';

export interface PromptAutocompleteSuggestion {
  value: string;
  category: PromptAutocompleteCategory;
  score: number;
  aliases?: string[];
}

export interface PromptAutocompleteToken {
  token: string;
  start: number;
  end: number;
}

export interface AppliedPromptAutocompleteSuggestion {
  prompt: string;
  caretIndex: number;
}

interface PromptAutocompleteEntry {
  value: string;
  category: PromptAutocompleteCategory;
  aliases?: string[];
}

const PROMPT_AUTOCOMPLETE_ENTRIES: PromptAutocompleteEntry[] = [
  { value: 'lo-fi', category: 'genre', aliases: ['lofi', 'lo fi'] },
  { value: 'synthwave', category: 'genre' },
  { value: 'ambient', category: 'genre' },
  { value: 'house', category: 'genre' },
  { value: 'techno', category: 'genre' },
  { value: 'trap', category: 'genre' },
  { value: 'jazz', category: 'genre' },
  { value: 'cinematic', category: 'genre' },
  { value: 'piano', category: 'instrument', aliases: ['keys'] },
  { value: 'rhodes', category: 'instrument', aliases: ['electric piano'] },
  { value: 'analog synth', category: 'instrument', aliases: ['synth'] },
  { value: 'bass guitar', category: 'instrument', aliases: ['bass'] },
  { value: 'strings', category: 'instrument', aliases: ['string section'] },
  { value: 'drum machine', category: 'instrument', aliases: ['drums'] },
  { value: 'guitar', category: 'instrument' },
  { value: 'vocal chop', category: 'instrument', aliases: ['voice chop'] },
  { value: 'warm', category: 'mood' },
  { value: 'dark', category: 'mood' },
  { value: 'melancholic', category: 'mood', aliases: ['melancholy'] },
  { value: 'uplifting', category: 'mood' },
  { value: 'dreamy', category: 'mood' },
  { value: 'aggressive', category: 'mood' },
  { value: 'intimate', category: 'mood' },
  { value: 'punchy', category: 'mood' },
  { value: 'analog', category: 'technique', aliases: ['analog warmth'] },
  { value: 'sidechained', category: 'technique', aliases: ['sidechain'] },
  { value: 'gated reverb', category: 'technique' },
  { value: 'tape saturation', category: 'technique', aliases: ['saturation'] },
  { value: 'chorused', category: 'technique', aliases: ['chorus'] },
  { value: 'low-pass', category: 'technique', aliases: ['filtered'] },
  { value: 'swing groove', category: 'technique', aliases: ['swing'] },
  { value: 'humanized', category: 'technique', aliases: ['human feel'] },
];

const TOKEN_DELIMITER = /[\s,.;:!?()[\]{}"'\n\r\t]/;

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getNormalizedCandidates(entry: PromptAutocompleteEntry): string[] {
  return [entry.value, ...(entry.aliases ?? [])].map(normalizeValue);
}

function getPrefixScore(query: string, candidate: string): number {
  if (!candidate.startsWith(query)) return 0;
  return 120 - (candidate.length - query.length);
}

function getContainsScore(query: string, candidate: string): number {
  const index = candidate.indexOf(query);
  if (index === -1) return 0;
  return 80 - index;
}

function getFuzzyScore(query: string, candidate: string): number {
  let searchIndex = 0;
  let span = 0;

  for (const char of query) {
    const nextIndex = candidate.indexOf(char, searchIndex);
    if (nextIndex === -1) return 0;
    span += nextIndex - searchIndex;
    searchIndex = nextIndex + 1;
  }

  return 40 - span;
}

function getSuggestionScore(query: string, entry: PromptAutocompleteEntry): number {
  const normalizedCandidates = getNormalizedCandidates(entry);
  let bestScore = 0;

  for (const candidate of normalizedCandidates) {
    bestScore = Math.max(
      bestScore,
      getPrefixScore(query, candidate),
      getContainsScore(query, candidate),
      getFuzzyScore(query, candidate),
    );
  }

  return bestScore;
}

export function getPromptAutocompleteToken(prompt: string, caretIndex = prompt.length): PromptAutocompleteToken | null {
  const safeCaretIndex = Math.max(0, Math.min(prompt.length, caretIndex));

  let start = safeCaretIndex;
  while (start > 0 && !TOKEN_DELIMITER.test(prompt[start - 1] ?? '')) {
    start -= 1;
  }

  let end = safeCaretIndex;
  while (end < prompt.length && !TOKEN_DELIMITER.test(prompt[end] ?? '')) {
    end += 1;
  }

  const token = prompt.slice(start, end).trim();
  if (!token) return null;

  return { token, start, end };
}

export function getPromptAutocompleteSuggestions(
  prompt: string,
  caretIndex = prompt.length,
  limit = 8,
): PromptAutocompleteSuggestion[] {
  const token = getPromptAutocompleteToken(prompt, caretIndex);
  if (!token) return [];

  const normalizedQuery = normalizeValue(token.token);
  if (!normalizedQuery) return [];

  return PROMPT_AUTOCOMPLETE_ENTRIES
    .map((entry) => ({
      value: entry.value,
      category: entry.category,
      aliases: entry.aliases,
      score: getSuggestionScore(normalizedQuery, entry),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.value.length !== b.value.length) return a.value.length - b.value.length;
      return a.value.localeCompare(b.value);
    })
    .slice(0, limit);
}

export function applyPromptAutocompleteSuggestion(
  prompt: string,
  suggestion: string,
  caretIndex = prompt.length,
): AppliedPromptAutocompleteSuggestion | null {
  const token = getPromptAutocompleteToken(prompt, caretIndex);
  if (!token) return null;

  const before = prompt.slice(0, token.start);
  const after = prompt.slice(token.end);
  const needsTrailingSpace = after.length === 0 || !/^[\s,.;:!?()[\]{}]/.test(after);
  const inserted = `${suggestion}${needsTrailingSpace ? ' ' : ''}`;
  const nextPrompt = `${before}${inserted}${after}`;

  return {
    prompt: nextPrompt,
    caretIndex: before.length + inserted.length,
  };
}
