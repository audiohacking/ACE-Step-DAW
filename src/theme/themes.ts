export const THEME_IDS = ['midnight', 'daylight'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  colorScheme: 'dark' | 'light';
  preview: {
    background: string;
    surface: string;
    accent: string;
  };
}

export const DEFAULT_THEME_ID: ThemeId = 'midnight';

export const THEME_OPTIONS: ThemeDefinition[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'The original low-light studio palette for late-session editing.',
    colorScheme: 'dark',
    preview: {
      background: '#151520',
      surface: '#1e1e2e',
      accent: '#4a90d9',
    },
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description: 'A brighter, higher-contrast workspace for long daytime sessions.',
    colorScheme: 'light',
    preview: {
      background: '#edf2f7',
      surface: '#ffffff',
      accent: '#2f6fb0',
    },
  },
];

const THEME_ID_SET = new Set<string>(THEME_IDS);

export function normalizeThemeId(themeId: string | null | undefined): ThemeId {
  return themeId && THEME_ID_SET.has(themeId) ? (themeId as ThemeId) : DEFAULT_THEME_ID;
}

export function getThemeDefinition(themeId: string | null | undefined): ThemeDefinition {
  const normalized = normalizeThemeId(themeId);
  return THEME_OPTIONS.find((theme) => theme.id === normalized) ?? THEME_OPTIONS[0];
}
