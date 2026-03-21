import { THEME_OPTIONS, type ThemeId } from '../../theme/themes';

interface ThemeSettingsSectionProps {
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export function ThemeSettingsSection({
  selectedThemeId,
  onSelectTheme,
}: ThemeSettingsSectionProps) {
  return (
    <section className="space-y-2" aria-labelledby="settings-theme-heading">
      <div className="space-y-1">
        <h3 id="settings-theme-heading" className="text-xs font-medium text-zinc-300 pt-2">
          Appearance
        </h3>
        <p className="text-[10px] text-zinc-500">
          Choose the workspace theme that matches your lighting and contrast preference.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Theme selection">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = theme.id === selectedThemeId;

          return (
            <label
              key={theme.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors ${
                isSelected
                  ? 'border-daw-accent bg-daw-accent/10'
                  : 'border-daw-border bg-daw-bg/50 hover:border-daw-accent/60'
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={theme.id}
                checked={isSelected}
                onChange={() => onSelectTheme(theme.id)}
                className="mt-0.5 h-4 w-4 accent-daw-accent"
                aria-label={`${theme.label} theme`}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-200">{theme.label}</span>
                  <div className="flex items-center gap-1" aria-hidden="true">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.preview.background }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.preview.surface }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                  </div>
                </div>
                <p className="text-[10px] leading-4 text-zinc-400">{theme.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
